import { RoutineTask } from "./Routine";
import type Task from "./Task";

export interface Challenge {
  id: string;
  title: string;
  description: string;
  duration: number; // in days
  tasks: Array<{ taskId: string; frequency: string }>;
  imageUrl: string;
  createdAt: number;
  category: string[];
  difficulty: string;
  participants: string[]; // Array of user IDs
  status?: string;
  progress?: number;
  taskProgress?: UserChallengeProgress[];
}

export interface ChallengeMeta {
  taskId: string;
  frequency: "daily" | "weekly" | "custom";
  days?: number[]; // [0,1,2,3,4,5,6] where 0 is Sunday
  timeOfDay?: {
    start?: number; // Hours in 24h format (0-23)
    end?: number;
  };
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
  taskCompletions: Record<string, any>;
  attempts?: number;
}

export interface ChallengeTask extends Task {
  challengeId: string;
  challengeTitle: string;
  challengeMeta: ChallengeMeta;
  challengeParticipants: string[];
}
