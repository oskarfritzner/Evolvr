import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  arrayUnion,
  arrayRemove,
  Timestamp,
  increment,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/backend/config/firebase";
import Task, { TaskStatus, TaskType, TaskCompletion } from "../types/Task";
import { levelService } from "./levelService";
import { auth } from "@/backend/config/firebase";

class TaskService {
  async createTask(task: Partial<Task>): Promise<string> {
    try {
      const taskRef = await addDoc(collection(db, "tasks"), {
        ...task,
        createdAt: Timestamp.now(),
        status: TaskStatus.PENDING,
      });

      return taskRef.id;
    } catch (error) {
      throw error;
    }
  }

  async getTasksByIds(taskIds: string[]): Promise<Task[]> {
    try {
      const tasks: Task[] = [];
      for (const id of taskIds) {
        const taskDoc = await getDoc(doc(db, "tasks", id));
        if (taskDoc.exists()) {
          tasks.push({ id: taskDoc.id, ...taskDoc.data() } as Task);
        }
      }
      return tasks;
    } catch (error) {
      throw error;
    }
  }

  async getUserTasks(userId: string): Promise<Task[]> {
    try {
      const q = query(collection(db, "tasks"), where("userId", "==", userId));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Task)
      );
    } catch (error) {
      throw error;
    }
  }

  async completeTask(
    taskId: string,
    userId: string,
    completionData?: Partial<TaskCompletion>
  ): Promise<Task> {
    try {
      // First check if it's a user-generated task
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) throw new Error("User not found");

      const userData = userDoc.data();
      const userGeneratedTask = userData.userGeneratedTasks?.find(
        (t: any) => t.id === taskId
      );

      if (userGeneratedTask) {
        // Handle user-generated task completion
        const completedAt = Timestamp.now();
        const updatedTasks = userData.userGeneratedTasks.map((t: any) =>
          t.id === taskId
            ? {
                ...t,
                status: TaskStatus.COMPLETED,
                completed: true,
                completedAt,
                lastUpdatedBy: userId,
              }
            : t
        );

        const batch = writeBatch(db);

        // Update the task in userGeneratedTasks
        batch.update(userRef, {
          userGeneratedTasks: updatedTasks,
          "stats.totalTasksCompleted": increment(1),
          activeTasks: arrayRemove(taskId),
        });

        // Create completion document
        const completionRef = doc(
          collection(db, "users", userId, "completions")
        );
        batch.set(completionRef, {
          taskId,
          completedAt,
          type: "normal",
          categoryXp: userGeneratedTask.categoryXp,
          ...completionData,
        } as TaskCompletion);

        await batch.commit();

        // Award XP for completing the task
        await levelService.addXP(
          userId,
          userGeneratedTask.categoryXp,
          "normal",
          userGeneratedTask.title
        );

        return {
          ...userGeneratedTask,
          completed: true,
          completedAt,
          status: TaskStatus.COMPLETED,
        };
      }

      // If not user-generated, handle normal task completion
      const taskRef = doc(db, "tasks", taskId);
      const taskDoc = await getDoc(taskRef);
      if (!taskDoc.exists()) throw new Error("Task not found");

      const task = { id: taskDoc.id, ...taskDoc.data() } as Task;
      const completedAt = Timestamp.now();

      // First update the task status
      await updateDoc(taskRef, {
        status: TaskStatus.COMPLETED,
        completed: true,
        completedAt,
        lastUpdatedBy: userId,
      });

      // Then handle user updates in a separate batch
      const batch = writeBatch(db);

      // Create completion document
      const completionRef = doc(collection(db, "users", userId, "completions"));
      batch.set(completionRef, {
        taskId,
        completedAt,
        type: "normal",
        categoryXp: task.categoryXp,
        ...completionData,
      } as TaskCompletion);

      // Update user stats
      batch.update(userRef, {
        "stats.totalTasksCompleted": increment(1),
        activeTasks: arrayRemove(taskId),
      });

      await batch.commit();

      // Award XP for completing the task
      await levelService.addXP(userId, task.categoryXp, "normal", task.title);

      return task;
    } catch (error) {
      throw error;
    }
  }

  async updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
    try {
      const taskRef = doc(db, "tasks", taskId);
      await updateDoc(taskRef, {
        ...updates,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      throw error;
    }
  }

  async deleteTask(taskId: string, userId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, "tasks", taskId));

      // Remove from user's completed tasks if present
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        completedTasks: arrayRemove(taskId),
      });
    } catch (error) {
      throw error;
    }
  }

  async getTodaysTasks(userId: string): Promise<Task[]> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const q = query(
        collection(db, "tasks"),
        where("userId", "==", userId),
        where("dueDate", ">=", today),
        where("status", "==", TaskStatus.PENDING)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Task)
      );
    } catch (error) {
      throw error;
    }
  }

  async getAllTasks(): Promise<Task[]> {
    try {
      const tasksRef = collection(db, "tasks");
      const querySnapshot = await getDocs(tasksRef);
      const systemTasks = querySnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Task)
      );

      // Get current user's generated tasks if authenticated
      const currentUser = auth.currentUser;
      let userGeneratedTasks: Task[] = [];
      if (currentUser?.uid) {
        userGeneratedTasks = await this.getUserGeneratedTasks(currentUser.uid);
      }

      // Combine system tasks and user-generated tasks
      return [...systemTasks, ...userGeneratedTasks];
    } catch (error) {
      throw error;
    }
  }

  async getTasksByCategory(category: string): Promise<Task[]> {
    try {
      const q = query(
        collection(db, "tasks"),
        where("categories", "array-contains", category)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Task)
      );
    } catch (error) {
      throw error;
    }
  }

  async addTaskToActive(userId: string, taskId: string): Promise<void> {
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        activeTasks: arrayUnion(taskId),
      });
    } catch (error) {
      throw error;
    }
  }

  async getActiveTasks(taskIds: string[]): Promise<Task[]> {
    try {
      const tasks: Task[] = [];
      for (const taskId of taskIds) {
        const taskRef = doc(db, "tasks", taskId);
        const taskDoc = await getDoc(taskRef);
        if (taskDoc.exists()) {
          tasks.push({ id: taskDoc.id, ...taskDoc.data() } as Task);
        }
      }
      return tasks;
    } catch (error) {
      return [];
    }
  }

  async getTaskDetails(taskIds: string[]): Promise<Task[]> {
    try {
      if (!taskIds.length) return [];

      const tasks: Task[] = [];
      const currentUser = auth.currentUser;

      // Get user's generated tasks if authenticated
      let userGeneratedTasks: Task[] = [];
      if (currentUser?.uid) {
        userGeneratedTasks = await this.getUserGeneratedTasks(currentUser.uid);
      }

      for (const taskId of taskIds) {
        // First check in user-generated tasks
        const userTask = userGeneratedTasks.find((t) => t.id === taskId);
        if (userTask) {
          tasks.push(userTask);
          continue;
        }

        // If not found in user tasks, check system tasks
        const taskRef = doc(db, "tasks", taskId);
        const taskDoc = await getDoc(taskRef);
        if (taskDoc.exists()) {
          tasks.push({
            id: taskDoc.id,
            ...taskDoc.data(),
            type: "normal",
          } as Task);
        }
      }
      return tasks;
    } catch (error) {
      return [];
    }
  }

  async getUserGeneratedTasks(userId: string): Promise<Task[]> {
    try {
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) return [];

      const userData = userDoc.data();
      return (userData.userGeneratedTasks || []).map((task: Task) => ({
        ...task,
        type: "user-generated",
        createdBy: userId,
      }));
    } catch (error) {
      console.error("Error getting user generated tasks:", error);
      return [];
    }
  }
}

export const taskService = new TaskService();
