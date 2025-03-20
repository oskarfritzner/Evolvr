import { db } from "@/backend/config/firebase";
import { doc, setDoc } from "firebase/firestore";
import type Task from "./Task";
import { TaskXP } from "./Task";
import { Timestamp } from "firebase/firestore";
import { TaskType } from "./Task";
import { ParticipantData } from "./Participant";

export interface RoutineTask extends Task {
  routineId: string;
  routineName: string;
  frequency: "daily" | "weekly";
  order: number;
  participants: string[];
  days: number[];
  completions?: {
    [date: string]: Array<{
      completedBy: string;
      completedAt: Timestamp;
    }>;
  };
  createdAt: Timestamp;
  streak?: number;
  active?: boolean;
}

export interface Routine {
  id: string;
  title: string;
  description?: string;
  xpGains?: Record<string, number>;
  participants: string[]; // Array of user IDs
  invites: string[]; // Add this field
  tasks: RoutineTask[];
  createdBy: string; // User ID of creator
  createdAt: number; // Timestamp
  active: boolean; // Add this field
  icon?: string; // Add this field
  lastUpdated?: Timestamp; // Make this optional in base interface
  metadata?: {
    currentStreak: number;
    bestStreak: number;
    lastCompleted: Timestamp | null;
    totalCompletions: number;
    isFavorite?: boolean;
    personalNotes?: string;
  };
}

export interface RoutineTaskWithMeta {
  id: string;
  taskId: string;
  taskName: string;
  routineId: string;
  routineTitle: string;
  participants: ParticipantData[];
  isCompleted: boolean;
  allCompleted: boolean;
  todayCompletions: Array<{
    completedBy: string;
    completedAt: number;
  }>;
  categoryXp: Record<string, number>;
  description: string;
  createdBy: string;
  type?: "routine";
  streak: number;
  lastCompleted: Timestamp | null;
  completions?: {
    [date: string]: Array<{
      completedBy: string;
      completedAt: number;
    }>;
  };
}

export interface TaskCompletion {
  completedBy: string;
  completedAt: number;
}

export interface CachedRoutine extends Routine {
  lastUpdated?: Timestamp;
  metadata?: {
    currentStreak: number;
    bestStreak: number;
    lastCompleted: Timestamp | null;
    totalCompletions: number;
  };
}
