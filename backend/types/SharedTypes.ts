import { UserData } from "./UserData";

export interface XPService {
  updateUserLevels(
    userId: string,
    xpGains: Record<string, number>
  ): Promise<void>;
}

export interface StreakService {
  getRoutineStreak(userData: UserData, userId: string): number;
}
