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
}

export interface GoalStep {
  id: string;
  description: string;
  isCompleted: boolean;
  completedAt?: Timestamp;
}

export interface Goal {
  id: string;
  description: string;
  measurable?: string;
  timeframe: GoalTimeframe;
  status: GoalStatus;
  progress: number;
  steps?: GoalStep[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  userId: string;
}
