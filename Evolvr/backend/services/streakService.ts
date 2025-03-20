import { doc, getDoc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "@/backend/config/firebase";
import { UserData } from "../types/UserData";

function isConsecutiveDay(
  lastDate: Date,
  currentDate: Date = new Date()
): boolean {
  const oneDayInMs = 24 * 60 * 60 * 1000;
  const diffInDays = Math.round(
    (currentDate.getTime() - lastDate.getTime()) / oneDayInMs
  );
  return diffInDays === 1;
}

export const streakService = {
  getRoutineStreak(userData: UserData, routineId: string): number {
    try {
      const routineStreak = userData.stats?.routineStreaks?.[routineId];
      if (!routineStreak) return 0;

      const lastCompletedAt = routineStreak.lastCompleted?.toDate();
      if (!lastCompletedAt) return 0;

      const today = new Date();
      if (lastCompletedAt.toDateString() === today.toDateString()) {
        return routineStreak.streak;
      }

      if (isConsecutiveDay(lastCompletedAt)) {
        return routineStreak.streak;
      }

      return 0;
    } catch (error) {
      return 0;
    }
  },

  async updateRoutineStreak(userId: string, routineId: string): Promise<void> {
    try {
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);
      const userData = (userDoc.data() as UserData) || {
        stats: { routineStreaks: {} },
      };

      const routineStreak = userData.stats?.routineStreaks?.[routineId] || {
        streak: 0,
      };
      const lastCompletedAt = routineStreak.lastCompleted?.toDate();
      const today = new Date();

      if (!lastCompletedAt || !isConsecutiveDay(lastCompletedAt)) {
        updateDoc(userRef, {
          [`stats.routineStreaks.${routineId}`]: {
            streak: 1,
            lastCompleted: Timestamp.now(),
          },
        });
        return;
      }

      if (lastCompletedAt.toDateString() === today.toDateString()) {
        return;
      }

      updateDoc(userRef, {
        [`stats.routineStreaks.${routineId}`]: {
          streak: routineStreak.streak + 1,
          lastCompleted: Timestamp.now(),
        },
      });
    } catch (error) {
      console.error("Error updating routine streak:", error);
    }
  },

  resetRoutineStreak(userId: string, routineId: string): void {
    try {
      const userRef = doc(db, "users", userId);
      updateDoc(userRef, {
        [`stats.routineStreaks.${routineId}`]: {
          streak: 0,
          lastCompleted: Timestamp.now(),
        },
      });
    } catch (error) {
      console.error("Error resetting routine streak:", error);
    }
  },

  getHabitStreak(userData: UserData, habitId: string): number {
    try {
      const habitStreak = userData.stats?.habitStreaks?.[habitId];
      if (!habitStreak) return 0;

      const lastCompletedAt = habitStreak.lastCompleted?.toDate();
      if (!lastCompletedAt) return 0;

      const today = new Date();
      if (lastCompletedAt.toDateString() === today.toDateString()) {
        return habitStreak.streak;
      }

      if (isConsecutiveDay(lastCompletedAt)) {
        return habitStreak.streak;
      }

      return 0;
    } catch (error) {
      console.error("Error getting habit streak:", error);
      return 0;
    }
  },

  updateHabitStreak(userId: string, habitId: string): void {
    // Similar implementation as updateRoutineStreak but for habits
  },

  resetHabitStreak(userId: string, habitId: string): void {
    // Similar implementation as resetRoutineStreak but for habits
  },
};
