import {
  doc,
  collection,
  addDoc,
  query,
  orderBy,
  getDocs,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/backend/config/firebase";
import { AIService, CoachPersonality } from "@/backend/openAi/aiService";
import { userService } from "./userService";

const aiService = new AIService();

export interface CoachingMessage {
  id: string;
  content: string;
  role: "user" | "assistant" | "system";
  timestamp: Timestamp;
  personality?: CoachPersonality;
}

class CoachingService {
  private readonly MESSAGES_PER_SESSION = 20;

  async sendMessage(
    userId: string,
    message: string,
    personality: CoachPersonality = "default"
  ): Promise<CoachingMessage> {
    try {
      // Get user data for context
      const userData = await userService.getUserData(userId);
      if (!userData) throw new Error("User data not found");

      // Save user message
      const userMessage: CoachingMessage = {
        id: `${Date.now()}-user`,
        content: message,
        role: "user",
        timestamp: Timestamp.now(),
        personality,
      };

      const messagesRef = collection(db, `users/${userId}/coachingMessages`);
      await addDoc(messagesRef, userMessage);

      // Get AI response
      const aiResponse = await aiService.getMindsetCoachResponse(
        userId,
        message,
        userData,
        personality
      );

      // Save AI response
      const assistantMessage: CoachingMessage = {
        id: `${Date.now()}-assistant`,
        content: aiResponse.content,
        role: "assistant",
        timestamp: Timestamp.now(),
        personality,
      };

      await addDoc(messagesRef, assistantMessage);

      // Cleanup old messages if needed
      await this.cleanupOldMessages(userId);

      return assistantMessage;
    } catch (error) {
      console.error("Error sending coaching message:", error);
      throw error;
    }
  }

  async getSessionHistory(userId: string): Promise<CoachingMessage[]> {
    try {
      const messagesRef = collection(db, `users/${userId}/coachingMessages`);
      const q = query(messagesRef, orderBy("timestamp", "asc"));
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map((doc) => doc.data() as CoachingMessage);
    } catch (error) {
      console.error("Error fetching coaching history:", error);
      throw error;
    }
  }

  async clearSession(userId: string): Promise<void> {
    try {
      const messagesRef = collection(db, `users/${userId}/coachingMessages`);
      const querySnapshot = await getDocs(messagesRef);

      const deletePromises = querySnapshot.docs.map((doc) =>
        deleteDoc(doc.ref)
      );
      await Promise.all(deletePromises);
    } catch (error) {
      console.error("Error clearing coaching session:", error);
      throw error;
    }
  }

  private async cleanupOldMessages(userId: string): Promise<void> {
    try {
      const messagesRef = collection(db, `users/${userId}/coachingMessages`);
      const q = query(messagesRef, orderBy("timestamp", "asc"));
      const snapshot = await getDocs(q);

      if (snapshot.size > this.MESSAGES_PER_SESSION) {
        const messagesToDelete = snapshot.docs.slice(
          0,
          snapshot.size - this.MESSAGES_PER_SESSION
        );
        await Promise.all(messagesToDelete.map((doc) => deleteDoc(doc.ref)));
      }
    } catch (error) {
      console.error("Error cleaning up old messages:", error);
    }
  }
}

export const coachingService = new CoachingService();
