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
import { AIService } from "@/backend/openAi/aiService";
import { userService } from "./userService";

const aiService = new AIService();

export interface CoachingMessage {
  id: string;
  content: string;
  role: "user" | "assistant" | "system";
  timestamp: Timestamp;
}

class CoachingService {
  private readonly MESSAGES_PER_SESSION = 20;

  async sendMessage(userId: string, content: string): Promise<CoachingMessage> {
    try {
      // Get user data for context
      const userData = await userService.getUserData(userId);
      if (!userData) throw new Error("User data not found");

      // Get AI response
      const response = await aiService.getMindsetCoachResponse(
        userId,
        content,
        userData
      );

      // Store both user message and AI response
      const userMessage: CoachingMessage = {
        id: `${Date.now()}-user`,
        content,
        role: "user",
        timestamp: Timestamp.now(),
      };

      const assistantMessage: CoachingMessage = {
        id: `${Date.now()}-assistant`,
        content: response.content,
        role: "assistant",
        timestamp: Timestamp.now(),
      };

      // Store messages in Firestore
      const messagesRef = collection(db, `users/${userId}/coachingMessages`);
      await Promise.all([
        addDoc(messagesRef, userMessage),
        addDoc(messagesRef, assistantMessage),
      ]);

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
      const snapshot = await getDocs(q);

      return snapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          } as CoachingMessage)
      );
    } catch (error) {
      console.error("Error getting coaching history:", error);
      throw error;
    }
  }

  async clearSession(userId: string): Promise<void> {
    try {
      const messagesRef = collection(db, `users/${userId}/coachingMessages`);
      const snapshot = await getDocs(messagesRef);

      await Promise.all(snapshot.docs.map((doc) => deleteDoc(doc.ref)));
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
