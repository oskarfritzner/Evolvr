import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  deleteDoc,
  Timestamp,
  arrayUnion,
  onSnapshot,
  increment,
  writeBatch,
  runTransaction,
} from "firebase/firestore";
import { db } from "@/backend/config/firebase";
import { Habit } from "../types/Habit";
import { levelService } from "./levelService";
import { TaskStatus } from "../types/Task";
import { generateId } from "../../utils/generateId";
import { UserData } from "../types/UserData";
import Task from "../types/Task";
import logger from "@/utils/logger";
import { queryClient } from "@/lib/react-query";

export const habitService = {
  // Create a new habit with proper typing
  async createHabit(userId: string, habitData: Partial<Habit>): Promise<Habit> {
    try {
      const userRef = doc(db, "users", userId);
      const habitId = generateId();

      // First check if a similar habit already exists
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) {
        throw new Error("User document not found");
      }

      const userData = userDoc.data() as UserData;
      const existingHabits = userData.habits || {};

      // Check for duplicate habits (same title and task)
      const isDuplicate = Object.values(existingHabits).some(
        (habit) =>
          habit.title.toLowerCase() === habitData.title?.toLowerCase() &&
          habit.task.id === habitData.task?.id
      );

      if (isDuplicate) {
        throw new Error("A similar habit already exists");
      }

      const newHabit: Habit = {
        id: habitId,
        userId: userId,
        title: habitData.title || "",
        reason: habitData.reason || "",
        completedToday: false,
        streak: 0,
        longestStreak: 0,
        completedDays: [],
        createdAt: Timestamp.now(),
        task: {
          ...habitData.task!,
          id: habitData.task?.id || generateId(),
          completed: false,
          type: "habit",
        },
      };

      // Use a single atomic update
      await updateDoc(userRef, {
        [`habits.${habitId}`]: newHabit,
      });

      return newHabit;
    } catch (error) {
      logger.error("Error creating habit:", error);
      throw error;
    }
  },

  // Get habits for a user
  async getUserHabits(userId: string): Promise<Habit[]> {
    try {
      const userDoc = await getDoc(doc(db, "users", userId));
      const userData = userDoc.data() as UserData;

      if (!userData?.habits) return [];

      return Object.values(userData.habits);
    } catch (error) {
      logger.error("Error fetching habits:", error);
      throw error;
    }
  },

  // Update a habit
  async updateHabit(
    userId: string,
    habitId: string,
    updates: Partial<Habit>
  ): Promise<void> {
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        [`habits.${habitId}`]: {
          ...updates,
          updatedAt: Timestamp.now(),
        },
      });
    } catch (error) {
      logger.error("Error updating habit:", error);
      throw error;
    }
  },

  // Delete a habit
  async deleteHabit(userId: string, habitId: string): Promise<void> {
    try {
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data() as UserData;

      if (!userData?.habits?.[habitId]) {
        throw new Error("Habit not found");
      }

      // Create updated habits object without the deleted habit
      const updatedHabits = { ...userData.habits };
      delete updatedHabits[habitId];

      await updateDoc(userRef, {
        habits: updatedHabits,
      });
    } catch (error) {
      logger.error("Error deleting habit:", error);
      throw error;
    }
  },

  // Mark a task in a habit as completed
  async completeHabitTask(userId: string, taskId: string): Promise<Task> {
    try {
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data() as UserData;

      if (!userData?.habits) throw new Error("No habits found for user");

      const habit = Object.values(userData.habits).find(
        (h) => h.task.id === taskId
      );
      if (!habit) throw new Error("Habit not found");

      console.log("Found habit:", {
        id: habit.id,
        title: habit.title,
        categoryXp: habit.task.categoryXp,
        task: habit.task,
      });

      // Check if already completed today
      if (habit.completedToday) {
        console.log("Habit already completed today");
        return habit.task as Task;
      }

      const newStreak = habit.streak + 1;
      const newLongestStreak = Math.max(newStreak, habit.longestStreak || 0);
      const completedAt = Timestamp.now();

      // Batch update to ensure atomicity
      const batch = writeBatch(db);

      // Update habit status
      batch.update(userRef, {
        [`habits.${habit.id}.completedToday`]: true,
        [`habits.${habit.id}.streak`]: newStreak,
        [`habits.${habit.id}.longestStreak`]: newLongestStreak,
        [`habits.${habit.id}.completedDays`]: arrayUnion({
          date: completedAt,
          completed: true,
        }),
        [`habits.${habit.id}.task.completed`]: true,
        [`habits.${habit.id}.task.completedAt`]: completedAt,
        "stats.totalTasksCompleted": increment(1),
        completedTasks: arrayUnion({
          taskId,
          type: "habit",
          completedAt,
          habitId: habit.id,
          categoryXp: habit.task.categoryXp,
        }),
      });

      await batch.commit();

      // Return the completed task with its XP values
      return {
        ...habit.task,
        completed: true,
        completedAt,
      } as Task;
    } catch (error) {
      console.error("Error completing habit task:", error);
      throw error;
    }
  },

  // Award XP bonus for completing all tasks in a habit
  async awardHabitCompletionBonus(userId: string): Promise<void> {
    // Award 10 XP to all categories
    const xpGains = {
      physical: 10,
      mental: 10,
      intellectual: 10,
      spiritual: 10,
      financial: 10,
      career: 10,
      relationships: 10,
    };

    await levelService.addXP(userId, xpGains, "habit");
  },

  // Add new function for established habit bonus
  async awardHabitEstablishedBonus(userId: string): Promise<void> {
    // Award larger XP bonus for establishing the habit
    const xpGains = {
      physical: 100,
      mental: 100,
      intellectual: 100,
      spiritual: 100,
      financial: 100,
      career: 100,
      relationships: 100,
    };

    await levelService.addXP(userId, xpGains, "habit");
    // Here you could also trigger badge awards or other achievements
  },

  // Reset daily habit progress
  async resetDailyProgress(userId: string): Promise<void> {
    try {
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data() as UserData;

      if (!userData?.habits) return;

      const updates = Object.keys(userData.habits).reduce(
        (acc, habitId) => ({
          ...acc,
          [`habits.${habitId}.completedToday`]: false,
          [`habits.${habitId}.task.completed`]: false,
          [`habits.${habitId}.task.completedAt`]: null,
        }),
        {}
      );

      await updateDoc(userRef, updates);
    } catch (error) {
      logger.error("Error resetting daily progress:", error);
      throw error;
    }
  },

  // Update habit streak
  async updateStreak(habitId: string): Promise<void> {
    const habitRef = doc(db, "habits", habitId);
    const habitDoc = await getDoc(habitRef);
    const habit = habitDoc.data() as Habit;

    const lastCompletedDate =
      habit.task.completedAt instanceof Timestamp
        ? habit.task.completedAt.toDate()
        : habit.task?.completedAt;
    const today = new Date();
    const isConsecutiveDay =
      lastCompletedDate && today.getDate() - lastCompletedDate.getDate() === 1;

    const newStreak = isConsecutiveDay ? habit.streak + 1 : 1;

    await updateDoc(habitRef, {
      streak: newStreak,
      updatedAt: new Date(),
    });
  },

  // Get completion percentage
  getCompletionPercentage(habit: Habit): number {
    if (habit.completedDays.length === 66) {
      return 100;
    }
    const completedDays = habit.completedDays.filter(
      (day) => day.completed
    ).length;
    return Math.round((completedDays / 66) * 100);
  },

  // Check if habit is still active (within 66 days)
  isHabitActive(habit: Habit): boolean {
    const lastDay =
      habit.completedDays[65].date instanceof Timestamp
        ? habit.completedDays[65].date.toDate()
        : habit.completedDays[65].date;
    return new Date() <= lastDay;
  },

  // Get remaining days
  getRemainingDays(habit: Habit): number {
    if (habit.completedDays.length === 66) {
      return 0;
    }
    const completedDays = habit.completedDays.filter(
      (day) => day.completed
    ).length;
    return 66 - completedDays;
  },

  // Get today's habit tasks
  async getTodaysHabitTasks(userId: string): Promise<Task[]> {
    try {
      const userDoc = await getDoc(doc(db, "users", userId));
      const userData = userDoc.data() as UserData;

      if (!userData?.habits) return [];

      // Return uncompleted habit tasks
      return Object.values(userData.habits)
        .filter((habit) => !habit.completedToday)
        .map((habit) => ({
          ...habit.task,
          type: "habit",
        }));
    } catch (error) {
      logger.error("Error getting today's habit tasks:", error);
      return [];
    }
  },

  // Listen for habit updates
  onHabitUpdated(userId: string, habitId: string, callback: () => void) {
    if (!habitId || !userId) return () => {};

    return onSnapshot(doc(db, "users", userId), (doc) => {
      const userData = doc.data() as UserData;
      if (userData?.habits?.[habitId]) {
        callback();
      }
    });
  },

  // Check and handle missed days for habits
  async checkAndHandleMissedDays(userId: string): Promise<void> {
    try {
      const habits = await this.getUserHabits(userId);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const habit of habits) {
        const lastCompletedDay = habit.completedDays
          .filter((day) => day.completed)
          .sort((a, b) => {
            const dateA =
              a.date instanceof Timestamp ? a.date.toDate() : a.date;
            const dateB =
              b.date instanceof Timestamp ? b.date.toDate() : b.date;
            return dateB.getTime() - dateA.getTime();
          })[0]?.date;

        if (!lastCompletedDay) continue;

        const lastDate =
          lastCompletedDay instanceof Timestamp
            ? lastCompletedDay.toDate()
            : lastCompletedDay;
        lastDate.setHours(0, 0, 0, 0);

        const daysDifference = Math.floor(
          (today.getTime() - lastDate.getTime()) / (24 * 60 * 60 * 1000)
        );

        // If user missed a day (more than 1 day since last completion)
        if (daysDifference > 1) {
          await this.resetHabitProgress(habit.id);
        }
      }
    } catch (error) {
      logger.error("Error checking missed days:", error);
      throw error;
    }
  },

  // Reset habit progress
  async resetHabitProgress(habitId: string): Promise<void> {
    try {
      const habitRef = doc(db, "habits", habitId);
      const today = new Date();

      // Create new completion progress array
      const newCompletionProgress = Array(66)
        .fill(null)
        .map((_, index) => ({
          date: new Date(today.getTime() + index * 24 * 60 * 60 * 1000),
          completed: false,
        }));

      await updateDoc(habitRef, {
        streak: 0,
        completedToday: false,
        completionProgress: newCompletionProgress,
        isEstablished: false,
        updatedAt: new Date(),
      });
    } catch (error) {
      logger.error("Error resetting habit progress:", error);
      throw error;
    }
  },

  async getHabits(userId: string): Promise<Habit[]> {
    try {
      const userDoc = await getDoc(doc(db, "users", userId));
      const userData = userDoc.data() as UserData | undefined;

      if (!userData?.habits) return [];

      // Ensure each habit has a unique ID
      return Object.values(userData.habits).map((habit) => ({
        ...habit,
        id: habit.id || generateId(), // Ensure ID exists
      }));
    } catch (error) {
      logger.error("Error getting habits:", error);
      return [];
    }
  },

  // Reset completed today status at the start of each day
  async resetDailyStatus(userId: string): Promise<void> {
    try {
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data() as UserData;

      if (!userData?.habits) return;

      const updates = Object.keys(userData.habits).reduce(
        (acc, habitId) => ({
          ...acc,
          [`habits.${habitId}.completedToday`]: false,
          [`habits.${habitId}.task.completed`]: false,
          [`habits.${habitId}.task.completedAt`]: null,
        }),
        {}
      );

      await updateDoc(userRef, updates);
    } catch (error) {
      logger.error("Error resetting daily status:", error);
      throw error;
    }
  },

  getHabitStreak(userData: UserData, habitId: string): number {
    return userData.habits?.[habitId]?.streak || 0;
  },

  subscribeToHabits(userId: string, callback: () => void) {
    if (!userId) return;

    const userRef = doc(db, "users", userId);

    return onSnapshot(userRef, (doc) => {
      const userData = doc.data() as UserData;
      if (userData?.habits) {
        callback();
      }
    });
  },
};
