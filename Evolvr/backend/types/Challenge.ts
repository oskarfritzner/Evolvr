import { RoutineTask } from "./Routine";
import type Task from "./Task";
import { Timestamp } from "firebase/firestore";

export interface Challenge {
  id: string;
  title: string;
  description: string;
  duration: number; // in days
  tasks: ChallengeMeta[];
  imageUrl: string;
  createdAt?: number;
  category: string[];
  difficulty: string;
  participants: string[]; // Array of user IDs
  status?: string;
  progress?: number;
  taskProgress?: UserChallengeProgress[];
}

export interface ChallengeMeta {
  taskId: string;
  frequency: "daily" | "weekly";
  days?: string[];
  timeOfDay?: string;
}

export interface UserChallengeProgress {
  taskId: string;
  completedDates: number[]; // Array of timestamps
  streakCount: number;
  lastCompleted?: number;
  attempts?: number;
}

export interface UserChallenge extends Challenge {
  startDate: number;
  active: boolean;
  progress: number;
  taskProgress: UserChallengeProgress[]; // Track progress for each task
  taskCompletions: Record<string, Timestamp[]>;
  attempts?: number;
}

export interface ChallengeParticipation {
  id: string; // Same as challenge ID
  active: boolean; // Whether the challenge is currently active
  startDate: Timestamp; // When the user started the challenge
  progress: number; // Overall progress (0-100)
  currentAttempt: number; // Current attempt number
  attempts: {
    // Track attempts and their completions
    [attemptNumber: number]: {
      startDate: Timestamp;
      endDate?: Timestamp;
      progress: number;
      taskCompletions: {
        [taskId: string]: {
          dates: Timestamp[]; // Dates when task was completed
          lastCompleted?: Timestamp;
        };
      };
    };
  };
  challengeData?: {
    // Full challenge data (only when active)
    title: string;
    description: string;
    duration: number;
    tasks: ChallengeMeta[];
    imageUrl: string;
    category: string[];
    difficulty: string;
  };
}

export interface ChallengeTask extends ChallengeMeta {
  id: string;
  challengeId: string;
  challengeTitle: string;
  challengeMeta: ChallengeMeta;
  lastCompleted?: Timestamp;
  isCompleted?: boolean;
  title: string;
  description: string;
  categoryXp: Record<string, number>;
}
