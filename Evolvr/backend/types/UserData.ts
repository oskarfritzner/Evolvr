import { Routine } from "@/backend/types/Routine";
import { CategoryLevel } from "@/backend/types/Level";
import { CompletedTask, TaskStatus } from "@/backend/types/Task";
import { UserBadge } from "@/backend/types/Badge";
import { Challenge } from "./Challenge";
import { Timestamp } from "firebase/firestore";
import { Habit } from "@/backend/types/Habit";
import { CachedRoutine } from "@/backend/types/Routine";

export interface ProgressSnapshot {
  timestamp: Date | Timestamp;
  categories: Record<string, CategoryLevel>;
  overall: {
    level: number;
    xp: number;
  };
}

export enum UserType {
  FREE = "FREE",
  PREMIUM = "PREMIUM",
  AFFILIATE = "AFFILIATE",
  ADMIN = "ADMIN",
}

export interface AffiliateData {
  code: string;
  referrals: string[]; // Array of user IDs referred
  earnings: number;
  paymentHistory: {
    amount: number;
    date: Date | Timestamp;
    status: "pending" | "paid";
  }[];
}

export interface SubscriptionData {
  type: UserType;
  startDate: Date | Timestamp;
  endDate?: Date | Timestamp;
  affiliateCode?: string; // Code used during signup
  referredBy?: string; // ID of the affiliate who referred this user
  status: "active" | "cancelled" | "expired";
  autoRenew: boolean;
}

// Add admin features interface
export interface AdminFeatures {
  canManageUsers: boolean;
  canManageContent: boolean;
  canViewAnalytics: boolean;
  canManageAffiliates: boolean;
  accessLevel: 1 | 2 | 3; // Different admin levels
}

export interface PremiumFeatures {
  customThemes: boolean;
  dataExport: boolean;
  advancedAnalytics: boolean;
  prioritySupport: boolean;
  adsDisabled: boolean;
  maxChallenges: number;
  maxRoutines: number;
}

export interface UserStats {
  totalTasksCompleted: number;
  currentStreak: number;
  longestStreak: number;
  routinesCompleted: number;
  habitsCompleted: string[];
  challengesCompleted: string[];
  totalChallengesJoined: number;
  habitsStreaks?: { habitId: string; streak: number }[];
  badgesEarned: string[];
  todayXP: number;
  todayCompletedTasks: string[];
  lastXPReset: Timestamp;
  routineStreaks: Record<string, { streak: number; lastCompleted: Timestamp }>;
  habitStreaks: Record<string, { streak: number; lastCompleted: Timestamp }>;
}

interface CachedData {
  lastUpdated: Timestamp;
  profileImage: string | null;
  recentPosts: Array<{
    id: string;
    content: string;
    createdAt: Timestamp;
    likes: number;
    comments: number;
    imageUrl: string | null;
    privacy: "public" | "private" | "friends";
  }>;
  stats: {
    postsCount: number;
    followersCount: number;
    followingCount: number;
  };
}

export interface UserData {
  username: string;
  email: string;
  photoURL: string;
  userId: string;
  onboardingComplete: boolean;
  categories: Record<string, CategoryLevel>;
  activeTasks: string[];
  userGeneratedTasks: {
    id: string;
    title: string;
    description: string;
    categories: string[];
    categoryXp: Record<string, number>;
    createdAt: Timestamp;
    tags: string[];
    completed: boolean;
    status: TaskStatus;
  }[];
  cachedRoutines?: CachedRoutine[];
  lastRoutineSync?: Timestamp;
  Challenges: string[]; // Array of challenge IDs
  completedTasks: CompletedTask[];
  overall: { level: number; xp: number; prestige: number };
  bio?: string;
  location?: string;
  socialLinks?: { platform: string; link: string }[]; // Optional: Social media links
  stats: UserStats;
  badges?: UserBadge[];
  posts: {
    id: string;
    content: string;
    createdAt: Date;
    likes?: number; // Optional: Number of likes
    comments?: number; // Optional: Number of comments
    visibility?: "public" | "private"; // Optional: Visibility setting
  }[];

  progress: ProgressSnapshot[];
  challenges: Challenge[];
  blockedUsers?: string[]; // Array of user IDs that this user has blocked
  subscription: SubscriptionData;
  affiliateData?: AffiliateData; // Only for AFFILIATE users

  // Premium features flags
  premiumFeatures?: PremiumFeatures;

  adminFeatures?: AdminFeatures; // Only for ADMIN users

  habits: {
    [habitId: string]: Habit;
  };

  displayName: string;
  usernameLower: string;
  displayNameLower: string;

  cachedData?: CachedData;

  missedHabits?: {
    habitId: string;
    title: string;
    daysMissed: number;
    lastStreak: number;
    timestamp: Timestamp;
  }[];
}
