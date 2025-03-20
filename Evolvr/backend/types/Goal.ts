import { Timestamp } from "firebase/firestore";

export enum GoalTimeframe {
  DAILY = "daily",
  MONTHLY = "monthly",
  YEARLY = "yearly",
}

export enum GoalStatus {
  NOT_STARTED = "not_started",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  ARCHIVED = "archived",
}

export interface Goal {
  id: string;
  userId: string;
  description: string;
  timeframe: GoalTimeframe;
  status: GoalStatus;
  measurable?: string;
  deadline?: Timestamp;
  steps?: GoalStep[];
  progress: number; // 0-100
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt?: Timestamp;
  category?: string; // Optional category for organizing goals
  parentGoalId?: string; // For hierarchical goals (sub-goals)
  reflection?: {
    content: string;
    outcome: "success" | "failure";
    lastUpdated: Timestamp;
  }; // For reflecting on completed or failed goals
}

export interface GoalStep {
  id: string;
  description: string;
  isCompleted: boolean;
  completedAt?: Timestamp;
}

// For grouping goals by timeframe
export interface GoalCollection {
  daily: Goal[];
  monthly: Goal[];
  yearly: Goal[];
}

// For tracking goal history and streaks
export interface GoalStats {
  totalCompleted: number;
  currentStreak: number;
  longestStreak: number;
  completionRate: number;
  lastUpdated: Timestamp;
}

// For goal templates
export interface GoalTemplate {
  id: string;
  title: string;
  description: string;
  timeframe: GoalTimeframe;
  category?: string;
  defaultSteps?: string[];
  suggestedDeadline?: number; // Days from creation
  isCustom: boolean; // Whether this is a user-created template
  userId?: string; // For user-created templates
}
