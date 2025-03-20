import { Timestamp } from "firebase/firestore";
import Task, { TaskStatus } from "./Task";

export interface CompletionProgress {
  date: Date | Timestamp;
  completed: boolean;
}

export interface Habit {
  id: string;
  userId: string;
  title: string;
  reason: string;
  completedToday: boolean;
  streak: number;
  longestStreak?: number;
  completedDays: {
    date: Date | Timestamp;
    completed: boolean;
  }[];
  createdAt: Timestamp;
  task: Task;
}

export interface HabitProgress {
  habitId: string;
  streak: number;
  lastCompletedDate?: Date;
  completedTasks: string[];
}

export interface CompletionDay {
  date: Date | Timestamp;
  completed: boolean;
}
