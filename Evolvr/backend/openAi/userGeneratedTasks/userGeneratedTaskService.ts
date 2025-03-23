import {
  doc,
  updateDoc,
  arrayUnion,
  Timestamp,
  getDoc,
  increment,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "@/backend/config/firebase";
import { AIService } from "@/backend/openAi/aiService";
import type { TaskStatus, TaskType } from "@/backend/types/Task";
import type { UserData } from "@/backend/types/UserData";
import { levelService } from "@/backend/services/levelService";

// Initialize AIService with environment variable
const aiService = new AIService();

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
    type: TaskType;
    createdBy: string;
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
      // Step 1: Evaluate the task using AI
      const evaluation = await aiService.evaluateTask(title, description);

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

      // Step 2: Check for duplicates in tasks collection
      const tasksRef = collection(db, "tasks");
      const taskQuery = query(tasksRef, where("title", "==", evaluation.title));
      const taskSnapshot = await getDocs(taskQuery);

      if (!taskSnapshot.empty) {
        const existingTask = taskSnapshot.docs[0].data();
        const messages = [
          "Guess what? 🎯 We've got a similar task waiting for you in our collection! Want to explore it?",
          "Perfect timing! ⭐ We already have a task just like this. Ready to give it a try?",
          "Great minds think alike! 🌟 This task is already in our library - let's check it out!",
          "Awesome choice! 💫 We have something similar that might be perfect for you!",
          "Look what we found! 🎉 There's a similar task ready and waiting for you!",
        ];
        return {
          success: false,
          message: messages[Math.floor(Math.random() * messages.length)],
          task: {
            id: taskSnapshot.docs[0].id,
            title: existingTask.title,
            description: existingTask.description,
            categories: existingTask.categories,
            categoryXp: existingTask.categoryXp,
            createdAt: existingTask.createdAt,
            tags: existingTask.tags,
            completed: existingTask.completed,
            status: existingTask.status as TaskStatus,
            type: existingTask.type as TaskType,
            createdBy: existingTask.createdBy,
          },
        };
      }

      // Step 3: Check for duplicates in user's generated tasks
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        const loginMessages = [
          "Oops! 🔄 We can't find your profile right now. A quick login should fix that!",
          "Hey there! 👋 Looks like we need you to log in again to continue your journey!",
          "Time for a quick refresh! 🌟 Please log in to access your profile!",
          "Small hiccup! ✨ We need you to sign in again to keep the magic going!",
          "Quick pit stop needed! 🚀 Please log in to continue your awesome progress!",
        ];
        throw new Error(
          loginMessages[Math.floor(Math.random() * loginMessages.length)]
        );
      }

      const userData = userDoc.data() as UserData;

      // Check for similar titles in user's generated tasks
      const similarTask = userData.userGeneratedTasks?.find(
        (t) =>
          t.title.toLowerCase() === evaluation.title.toLowerCase() ||
          this.calculateSimilarity(
            t.title.toLowerCase(),
            evaluation.title.toLowerCase()
          ) > 0.8
      );

      if (similarTask) {
        const similarMessages = [
          "You're on fire! 🔥 You've already created something like this. Want to try a different angle?",
          "Déjà vu! ✨ You've got a similar task in your collection. How about exploring something new?",
          "Great thinking! 💭 You've created this kind of task before. Ready for a fresh challenge?",
          "Love your consistency! 🌟 This task exists in your collection. Shall we create something different?",
          "You're really focused! 🎯 You have a similar task already. Want to diversify your goals?",
        ];
        return {
          success: false,
          message:
            similarMessages[Math.floor(Math.random() * similarMessages.length)],
          task: {
            ...similarTask,
            type: "user-generated" as TaskType,
            createdBy: userId,
          },
        };
      }

      // Step 4: Create the task object
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
        type: "user-generated" as TaskType,
        createdBy: userId,
      };

      // Step 5: Add task to user's userGeneratedTasks array
      await updateDoc(userRef, {
        userGeneratedTasks: arrayUnion(task),
      });

      const successMessages = [
        `🎉 Task created successfully!\n\n${
          evaluation.feedback
        }\n\n📋 Task Details:\nTitle: ${task.title}\nDescription: ${
          task.description
        }\n\nXP Rewards: ${Object.entries(task.categoryXp)
          .map(([category, xp]) => `+${xp} ${category} XP`)
          .join(", ")}`,
        `✨ Amazing task created!\n\n${
          evaluation.feedback
        }\n\n📝 Here's what you've created:\nTitle: ${
          task.title
        }\nDescription: ${task.description}\n\nXP Rewards: ${Object.entries(
          task.categoryXp
        )
          .map(([category, xp]) => `+${xp} ${category} XP`)
          .join(", ")}`,
        `🌟 Task added to your journey!\n\n${
          evaluation.feedback
        }\n\n📌 Task Overview:\nTitle: ${task.title}\nDescription: ${
          task.description
        }\n\nXP Rewards: ${Object.entries(task.categoryXp)
          .map(([category, xp]) => `+${xp} ${category} XP`)
          .join(", ")}`,
        `💫 Task successfully created!\n\n${
          evaluation.feedback
        }\n\n📊 Task Summary:\nTitle: ${task.title}\nDescription: ${
          task.description
        }\n\nXP Rewards: ${Object.entries(task.categoryXp)
          .map(([category, xp]) => `+${xp} ${category} XP`)
          .join(", ")}`,
        `🎯 Perfect task created!\n\n${
          evaluation.feedback
        }\n\n📑 Task Details:\nTitle: ${task.title}\nDescription: ${
          task.description
        }\n\nXP Rewards: ${Object.entries(task.categoryXp)
          .map(([category, xp]) => `+${xp} ${category} XP`)
          .join(", ")}`,
      ];

      return {
        success: true,
        message:
          successMessages[Math.floor(Math.random() * successMessages.length)],
        task,
        evaluation: {
          feedback: evaluation.feedback,
          safetyCheck: evaluation.safetyCheck,
        },
      };
    } catch (error) {
      console.error("Failed to create user-generated task:", error);
      if (error instanceof Error && error.message.includes("429")) {
        const rateMessages = [
          "Taking a quick breather! 😌 Our task creation service needs a moment. Try again soon!",
          "Whoa, we're popular! 🌟 Give us a minute to catch up, then try again!",
          "Quick timeout! ⏳ Our task service is recharging. Back in action shortly!",
          "Time for a mini break! 🎯 Please try again in a moment - we'll be ready!",
          "System refresh in progress! ✨ Give us a minute to optimize things for you!",
        ];
        throw new Error(
          rateMessages[Math.floor(Math.random() * rateMessages.length)]
        );
      }
      const errorMessages = [
        "Tiny bump in the road! 🔄 Let's try creating that task again!",
        "Oops, slight hiccup! 💫 Another attempt should do the trick!",
        "Minor detour! 🌟 Ready to give it another shot?",
        "Small technical glitch! ✨ Let's try that one more time!",
        "Quick reset needed! 🚀 Let's create that task again!",
      ];
      throw new Error(
        errorMessages[Math.floor(Math.random() * errorMessages.length)]
      );
    }
  }

  // Helper function to calculate similarity between two strings
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const longerLength = longer.length;
    const distance = this.levenshteinDistance(longer, shorter);
    return (longerLength - distance) / longerLength;
  }

  // Levenshtein distance calculation for string similarity
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    return matrix[str2.length][str1.length];
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
