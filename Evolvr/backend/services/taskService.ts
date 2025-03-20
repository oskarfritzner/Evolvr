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
      const userRef = doc(db, "users", userId);
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
      return querySnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Task)
      );
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
      for (const taskId of taskIds) {
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
}

export const taskService = new TaskService();
