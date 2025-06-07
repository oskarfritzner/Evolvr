import { UserData } from "./UserData";
import { CategoryLevel } from "./Level";

export interface XPService {
  updateUserLevels(
    userId: string,
    xpGains: Record<string, number>
  ): Promise<void>;
}

export interface StreakService {
  getRoutineStreak(userData: UserData, routineId: string): number;
  updateRoutineStreak(userId: string, routineId: string): Promise<void>;
  resetRoutineStreak(userId: string, routineId: string): void;
  getHabitStreak(userData: UserData, habitId: string): number;
  updateHabitStreak(userId: string, habitId: string): void;
  resetHabitStreak(userId: string, habitId: string): void;
}

export interface LevelService {
  ensureXPReset(userId: string, userData: UserData): Promise<UserData>;
  getInitialLevels(): {
    categories: Record<string, CategoryLevel>;
    overall: { level: number; xp: number; prestige: number };
  };
}

export interface UserService {
  getUserData(userId: string): Promise<UserData | null>;
  updateUserCache(userId: string): Promise<void>;
  recordDailyProgress(userId: string, progress: any): Promise<void>;
}
