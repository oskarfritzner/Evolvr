import { Timestamp } from "firebase/firestore";

export interface TaskXP {
  [category: string]: number; // Maps category names to their XP rewards
}

export interface TaskContext {
  id?: string; // ID of the associated challenge, habit, or routine
  name?: string; // Name of the associated challenge, habit, or routine
  type?: "challenge" | "habit" | "routine";
  participants: string[]; // Type of the task context
}

export type TaskType =
  | "normal"
  | "challenge"
  | "habit"
  | "routine"
  | "user-generated";

export enum TaskStatus {
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

export default interface Task {
  id: string; // Unique identifier for the task
  title: string; // Title of the task
  description: string; // Description of the task
  categories: string[]; // Categories this task contributes XP to
  categoryXp: TaskXP; // XP rewards mapped to categories
  xpGains?: Record<string, number>; // Add this line
  createdAt: Timestamp; // Creation date of the task
  createdBy: string; // User or system that created the task
  tags: string[]; // Tags for search or grouping
  completed: boolean; // Whether the task is completed
  completedAt?: Timestamp; // Timestamp of task completion
  dueDate?: Timestamp; // Due date for the task (optional)
  context?: TaskContext; // Context information (challenge, habit, or routine)
  status: TaskStatus;
  type?: TaskType;
}

export interface CompletedTask {
  taskId: string;
  completedAt: Timestamp;
  type: TaskType;
  sources?: string[];
  routineId?: string;
}

export interface TaskCompletion {
  taskId: string;
  completedAt: Timestamp;
  type: TaskType;
  duration?: number;
  feedback?: string;
  difficulty?: number;
  sources?: string[];
  routineId?: string;
  habitId?: string;
  challengeId?: string;
  categoryXp?: Record<string, number>;
}
