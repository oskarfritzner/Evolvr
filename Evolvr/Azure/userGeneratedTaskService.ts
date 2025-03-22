import {
  doc,
  updateDoc,
  arrayUnion,
  Timestamp,
  getDoc,
  increment,
} from "firebase/firestore";
import { db } from "@/backend/config/firebase";
import { azureAIService } from "./azure-ai";
import type { TaskStatus } from "@/backend/types/Task";
import type { UserData } from "@/backend/types/UserData";
import { levelService } from "@/backend/services/levelService";

export interface CreateTaskInput {
  title: string;
  description: string;
  userId: string;
}

export interface CreateTaskResult {
  success: boolean;
  message?: string;
  task?: {
    id: string;
    title: string;
    description: string;
    categories: string[];
    categoryXp: Record<string, number>;
    createdAt: Timestamp;
    tags: string[];
    completed: boolean;
    status: TaskStatus;
  };
  evaluation?: {
    feedback: string;
    safetyCheck?: {
      passed: boolean;
      concerns: string[];
      suggestions: string[];
    };
  };
}

class UserGeneratedTaskService {
  async createTask({
    title,
    description,
    userId,
  }: CreateTaskInput): Promise<CreateTaskResult> {
    try {
      // Step 1: Evaluate the task using Azure AI
      const evaluation = await azureAIService.evaluateTask(title, description);

      // Check if task is valid and passes safety checks
      if (!evaluation.isValid || !evaluation.safetyCheck?.passed) {
        return {
          success: false,
          message:
            evaluation.safetyCheck?.passed === false
              ? `Task creation failed due to safety concerns: ${evaluation.safetyCheck.concerns.join(
                  ", "
                )}. Suggestions: ${evaluation.safetyCheck.suggestions.join(
                  ", "
                )}`
              : evaluation.feedback,
          evaluation: {
            feedback: evaluation.feedback,
            safetyCheck: evaluation.safetyCheck,
          },
        };
      }

      // Step 2: Create the task object
      const task = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: evaluation.title,
        description: evaluation.description,
        categories: evaluation.categories,
        categoryXp: evaluation.categoryXp,
        createdAt: Timestamp.now(),
        tags: evaluation.tags,
        completed: false,
        status: "PENDING" as TaskStatus,
      };

      // Step 3: Add task to user's userGeneratedTasks array
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        userGeneratedTasks: arrayUnion(task),
      });

      return {
        success: true,
        task,
        evaluation: {
          feedback: evaluation.feedback,
          safetyCheck: evaluation.safetyCheck,
        },
      };
    } catch (error) {
      console.error("Failed to create user-generated task:", error);
      if (error instanceof Error && error.message.includes("429")) {
        throw new Error(
          "Task creation is temporarily unavailable. Please try again in a minute."
        );
      }
      throw new Error("Failed to create task. Please try again.");
    }
  }

  async completeTask(userId: string, taskId: string) {
    try {
      const userRef = doc(db, "users", userId);

      // Get the current user data to find the task
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data() as UserData;
      const taskIndex = userData.userGeneratedTasks.findIndex(
        (t) => t.id === taskId
      );

      if (taskIndex === -1) {
        throw new Error("Task not found");
      }

      // Create a new array with the updated task
      const updatedTasks = [...userData.userGeneratedTasks];
      updatedTasks[taskIndex] = {
        ...updatedTasks[taskIndex],
        completed: true,
        status: "COMPLETED" as TaskStatus,
      };

      // Update the user document
      await updateDoc(userRef, {
        userGeneratedTasks: updatedTasks,
        "stats.totalTasksCompleted": increment(1),
        "stats.todayCompletedTasks": arrayUnion(taskId),
      });

      // Award XP for the task
      await levelService.addXP(
        userId,
        updatedTasks[taskIndex].categoryXp,
        "normal",
        updatedTasks[taskIndex].title
      );

      return {
        success: true,
        task: updatedTasks[taskIndex],
      };
    } catch (error) {
      console.error("Failed to complete user-generated task:", error);
      throw new Error("Failed to complete task. Please try again.");
    }
  }

  async deleteTask(userId: string, taskId: string) {
    try {
      const userRef = doc(db, "users", userId);

      // Get the current user data to find the task
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data() as UserData;
      const updatedTasks = userData.userGeneratedTasks.filter(
        (t) => t.id !== taskId
      );

      // Update the user document
      await updateDoc(userRef, {
        userGeneratedTasks: updatedTasks,
      });

      return {
        success: true,
      };
    } catch (error) {
      console.error("Failed to delete user-generated task:", error);
      throw new Error("Failed to delete task. Please try again.");
    }
  }
}

export const userGeneratedTaskService = new UserGeneratedTaskService();
