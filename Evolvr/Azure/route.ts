import { azureAIService } from "./azure-ai";
import { taskService } from "@/backend/services/taskService";
import { auth } from "@/backend/config/firebase";
import { Timestamp, doc, updateDoc, arrayUnion } from "firebase/firestore";
import type Task from "@/backend/types/Task";
import { TaskStatus } from "@/backend/types/Task";
import { db } from "@/backend/config/firebase";

export async function evaluateAndCreateTask(
  title: string,
  description: string
) {
  try {
    // Evaluate task using Azure AI
    const evaluation = await azureAIService.evaluateTask(title, description);

    if (!evaluation.isValid) {
      return {
        success: false,
        evaluation,
      };
    }

    // If task is valid and user is authenticated, create it
    const userId = auth.currentUser?.uid;
    if (userId) {
      const userGeneratedTask = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: evaluation.title,
        description: evaluation.description,
        categories: evaluation.categories,
        categoryXp: evaluation.categoryXp,
        createdAt: Timestamp.now(),
        tags: evaluation.tags,
        completed: false,
        status: TaskStatus.PENDING,
      };

      // Add task to user's userGeneratedTasks array
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        userGeneratedTasks: arrayUnion(userGeneratedTask),
      });

      return {
        success: true,
        taskId: userGeneratedTask.id,
        evaluation,
      };
    }

    return {
      success: true,
      evaluation,
    };
  } catch (error) {
    console.error("Task evaluation failed:", error);
    throw new Error("Failed to evaluate task");
  }
}
