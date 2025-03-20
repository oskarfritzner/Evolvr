import { Timestamp } from "firebase/firestore";
import { NotificationType } from "./Notification";
import { Routine } from "./Routine";
import { UserData } from "./UserData";

export interface UserNotification {
  id: string; // notification/request id
  type: NotificationType;
  senderId?: string;
  read: boolean;
  createdAt: Timestamp;
}

export interface User {
  // ... existing fields ...
  notifications: {
    [key: string]: UserNotification; // key is the notification ID
  };
}

export interface incompleteUser {
  email: string;
  userId: string;
  startedOnboarding: boolean;
  onboardingComplete: boolean;
  createdAt: Date;
  lastUpdated: Date;
  authMethod: "email" | "google";
  onboardingStep: number;
  birthDate?: Date;
  photoURL?: string;
  username?: string;
  bio?: string;
  currentMood?: number;
  improvementReason?: string;
  mainGoal?: string;
}
