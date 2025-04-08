import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/backend/config/firebase";
import { Alert } from "react-native";
import { InitialLevels, UserLevels } from "@/backend/types/Level";
import { UserData } from "../types/UserData";
import { CategoryLevel } from "@/backend/types/Level";
import { badgeService } from "./badgeService";
import { userService } from "./userService";
import { BadgeCheckParams } from "../types/Badge";
import type { StreakService } from "../types/SharedTypes";
import logger from "@/utils/logger";
import Toast from "react-native-toast-message";
import { queryClient } from "@/lib/queryClientInstance";
import { writeBatch } from "firebase/firestore";
import { arrayUnion } from "firebase/firestore";

const XP_PER_LEVEL = 1000;
const MAX_LEVEL = 100;
const START_LEVEL = 1;
const DAILY_XP_LIMIT = 2000;

// Add new constants for streak bonuses
const MAX_ROUTINE_STREAK_BONUS = 0.2; // Reduce from 30% to 20% max bonus
const MAX_HABIT_STREAK_BONUS = 0.1; // Reduce from 15% to 10% max bonus
const CHALLENGE_BONUS = 0.15; // Reduce from 20% to 15% flat bonus

const PRESTIGE_REWARDS = {
  xpMultiplier: 0.1, // 10% XP boost per prestige level
  unlockSpecialFeatures: true,
  prestigeBadges: true,
};

let streakService: StreakService;
export const setStreakService = (service: StreakService) => {
  streakService = service;
};

// Instead, add a type for the habit service interface
interface HabitService {
  getHabitStreak: (userData: UserData, userId: string) => number;
}

let habitServiceInstance: HabitService;

// Add a setter for the habit service
export const setHabitService = (service: HabitService) => {
  habitServiceInstance = service;
};

export const levelService = {
  // Initialize default levels for a new user
  getInitialLevels(): UserLevels {
    return {
      categories: {
        physical: { level: 1, xp: 0 },
        mental: { level: 1, xp: 0 },
        intellectual: { level: 1, xp: 0 },
        spiritual: { level: 1, xp: 0 },
        financial: { level: 1, xp: 0 },
        career: { level: 1, xp: 0 },
        relationships: { level: 1, xp: 0 },
      },
      overall: { level: 1, xp: 0, prestige: 0 },
    };
  },

  // Calculate the XP needed for the next level
  getXPNeededForNextLevel(currentLevel: number): number {
    return currentLevel * XP_PER_LEVEL; // No need to subtract 1 since we want the next level's requirement
  },

  // Abstracted logic to calculate progress within a level
  calculateProgress(xp: number, currentLevel: number): number {
    const xpForCurrentLevel = (currentLevel - 1) * XP_PER_LEVEL;
    const xpInCurrentLevel = xp - xpForCurrentLevel;
    return Math.min(xpInCurrentLevel / XP_PER_LEVEL, 1);
  },

  // Get progress for a category level
  getCategoryLevelProgress(currentXP: number, level: number): number {
    // Calculate XP needed for current level
    const currentLevelXP = (level - 1) * XP_PER_LEVEL;

    // Calculate XP needed for next level
    const nextLevelXP = level * XP_PER_LEVEL;

    // Calculate progress within current level
    const xpInCurrentLevel = currentXP - currentLevelXP;
    const xpNeededForLevel = XP_PER_LEVEL; // Always 1000 XP per level

    return Math.min(Math.max(xpInCurrentLevel / xpNeededForLevel, 0), 1);
  },

  // Get progress for overall level
  getOverallLevelProgress(totalXP: number, level: number): number {
    return this.calculateProgress(totalXP, level);
  },

  getXPForLevel(level: number): number {
    return level * XP_PER_LEVEL; // Assuming XP_PER_LEVEL is defined
  },

  // Calculate overall level based on average XP across categories
  calculateOverallLevel(categories: Record<string, CategoryLevel>): {
    level: number;
    xp: number;
  } {
    const categoryValues = Object.values(categories);

    // Calculate total XP for each category including level XP
    const categoryTotalXPs = categoryValues.map((cat) => {
      return cat.xp;
    });

    // Calculate average XP across all categories
    const totalXP = categoryTotalXPs.reduce((sum, xp) => sum + xp, 0);
    const averageXP = totalXP / categoryValues.length;

    // Calculate level and remaining XP
    const level = Math.floor(averageXP / XP_PER_LEVEL) + 1; // Add 1 since we start at level 1
    const remainingXP = Math.floor(averageXP % XP_PER_LEVEL);

    return { level, xp: remainingXP };
  },

  // Update overall level and XP for the user
  updateOverallLevel(userData: UserData): UserData {
    const overallStats = this.calculateOverallLevel(userData.categories);
    return {
      ...userData,
      overall: {
        ...userData.overall,
        level: overallStats.level,
        xp: overallStats.xp,
      },
    };
  },

  // Update the XP multiplier calculation
  calculateXPMultiplier: (
    userData: UserData,
    taskType: string,
    userId: string
  ): number => {
    let xpMultiplier = 1;

    switch (taskType) {
      case "routine":
        // Reduce the per-day bonus from 4.3% to 2.85% (20% max at 7 days)
        const routineStreak = streakService?.getRoutineStreak(userData, userId);
        if (typeof routineStreak === "number") {
          xpMultiplier =
            1 + Math.min(routineStreak * 0.0285, MAX_ROUTINE_STREAK_BONUS);
        }
        break;

      case "challenge":
        xpMultiplier = 1 + CHALLENGE_BONUS;
        break;

      case "habit":
        // Reduce the per-day bonus from 1.5% to 1% (10% max at 10 days)
        const habitStreak = habitServiceInstance?.getHabitStreak(
          userData,
          userId
        );
        if (typeof habitStreak === "number") {
          xpMultiplier =
            1 + Math.min(habitStreak * 0.01, MAX_HABIT_STREAK_BONUS);
        }
        break;

      case "normal":
        xpMultiplier = 1;
        break;
    }

    // Reduce prestige multiplier from 5% to 3% per level
    const prestigeLevel = userData.overall?.prestige || 0;
    const prestigeMultiplier = 1 + prestigeLevel * 0.03;

    return xpMultiplier * prestigeMultiplier;
  },

  // Check if the user can prestige
  async canPrestige(userId: string): Promise<boolean> {
    try {
      const userDoc = await getDoc(doc(db, "users", userId));
      const userData = userDoc.data() as UserData;

      return userData.overall?.level >= MAX_LEVEL;
    } catch (error) {
      return false;
    }
  },

  // Handle the prestige process
  async handlePrestige(userId: string): Promise<boolean> {
    try {
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data() as UserData;

      // Check if user meets prestige requirements
      if (!userData.overall || userData.overall.level < MAX_LEVEL) {
        return false;
      }

      const currentPrestige = userData.overall.prestige || 0;
      const newPrestige = currentPrestige + 1;

      // Calculate new XP multiplier
      const xpMultiplier = 1 + newPrestige * PRESTIGE_REWARDS.xpMultiplier;

      // Reset level but keep some progress bonuses
      const updatedUserData = {
        overall: {
          level: 1, // Reset to level 1
          xp: 0, // Reset XP
          prestige: newPrestige,
          xpMultiplier,
        },
        // Keep category levels but apply prestige bonus
        categories: Object.entries(userData.categories).reduce(
          (acc, [category, data]) => ({
            ...acc,
            [category]: {
              ...data,
              xpMultiplier,
            },
          }),
          {}
        ),
      };

      // Update user document
      await updateDoc(userRef, updatedUserData);

      // Check for prestige-related badges
      await badgeService.checkAndAwardBadges(userId, {
        taskType: "normal",
        categories: [],
        xpGained: 0,
      });

      return true;
    } catch (error) {
      throw error;
    }
  },

  // Get XP multiplier based on prestige
  getXPMultiplier(prestigeLevel: number): number {
    return 1 + prestigeLevel * 0.1; // 10% increase per prestige level
  },

  async updateUserLevels(
    userId: string,
    categoryXp: Record<string, number>
  ): Promise<void> {
    try {
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) throw new Error("User not found");

      const userData = userDoc.data();

      // Initialize categories if they don't exist
      if (!userData.categories) {
        userData.categories = {};
      }

      // Update each category's XP
      Object.entries(categoryXp).forEach(([category, xp]) => {
        if (!userData.categories[category]) {
          userData.categories[category] = { level: 1, xp: 0 };
        }
        userData.categories[category].xp += xp;
      });

      // Save the updated categories
      await updateDoc(userRef, {
        categories: userData.categories,
      });
    } catch (error) {
      throw error;
    }
  },

  // Add this helper method for frontend display calculations
  getLevelInfo(xp: number): {
    level: number;
    currentLevelXP: number;
    nextLevelXP: number;
    progress: number;
  } {
    const level = Math.floor(xp / XP_PER_LEVEL) + 1;
    const currentLevelXP = xp - (level - 1) * XP_PER_LEVEL;
    const nextLevelXP = XP_PER_LEVEL;
    const progress = currentLevelXP / XP_PER_LEVEL;

    return {
      level,
      currentLevelXP,
      nextLevelXP,
      progress,
    };
  },

  // Add this method for overall level calculations
  getOverallLevelInfo(categories: Record<string, CategoryLevel>): {
    level: number;
    currentLevelXP: number;
    nextLevelXP: number;
    progress: number;
    totalXP: number;
  } {
    const categoryValues = Object.values(categories);
    const totalXP = categoryValues.reduce((sum, cat) => sum + cat.xp, 0);
    const averageXP = totalXP / categoryValues.length;

    const level = Math.floor(averageXP / XP_PER_LEVEL) + 1;
    const currentLevelXP = Math.floor(averageXP - (level - 1) * XP_PER_LEVEL);
    const nextLevelXP = XP_PER_LEVEL;
    const progress = currentLevelXP / XP_PER_LEVEL;

    return {
      level,
      currentLevelXP,
      nextLevelXP,
      progress,
      totalXP: Math.floor(averageXP),
    };
  },

  // Update the addXP function to handle the new multiplier logic
  async addXP(
    userId: string,
    xpGains: Record<string, number>,
    taskType: "routine" | "normal" | "challenge" | "habit" = "normal",
    taskName?: string
  ): Promise<{
    levelUps: string[];
    newOverallLevel: number;
    xpLimitReached?: boolean;
  }> {
    try {
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data() as UserData;

      // Normalize category names to lowercase
      let normalizedXpGains = Object.entries(xpGains).reduce(
        (acc, [category, xp]) => ({
          ...acc,
          [category.toLowerCase()]: xp,
        }),
        {} as Record<string, number>
      );

      // Update the routine task check to use completedTasks
      if (taskType === "routine") {
        const today = new Date().toDateString();
        const taskId = Object.keys(normalizedXpGains)[0];
        const isCompletedToday = userData.completedTasks?.some(
          (task) =>
            task.taskId === taskId &&
            task.completedAt.toDate().toDateString() === today
        );

        if (isCompletedToday) {
          return {
            levelUps: [],
            newOverallLevel: userData.overall?.level || 1,
            xpLimitReached: false,
          };
        }
      }

      const todayXP = userData.stats?.todayXP || 0;
      const baseXPTotal = Object.values(normalizedXpGains).reduce(
        (sum, xp) => sum + (xp || 0),
        0
      );

      let totalXPToAdd = baseXPTotal;
      let xpMultiplier = 1;
      if (taskType !== "normal") {
        xpMultiplier = this.calculateXPMultiplier(userData, taskType, userId);
        // Apply multiplier to each category individually instead of the total
        normalizedXpGains = Object.fromEntries(
          Object.entries(normalizedXpGains).map(([category, xp]) => [
            category,
            Math.floor((xp || 0) * xpMultiplier),
          ])
        );
        totalXPToAdd = Object.values(normalizedXpGains).reduce(
          (sum, xp) => sum + (xp || 0),
          0
        );
      }

      const remainingDailyXP = Math.max(0, DAILY_XP_LIMIT - todayXP);
      const adjustedXPToAdd =
        taskType === "normal"
          ? Math.min(baseXPTotal, remainingDailyXP)
          : Math.min(totalXPToAdd, remainingDailyXP);

      const adjustmentFactor =
        taskType === "normal" ? 1 : adjustedXPToAdd / totalXPToAdd;

      const adjustedXpGains = Object.fromEntries(
        Object.entries(normalizedXpGains).map(([category, xp]) => [
          category,
          Math.min(Math.floor((xp || 0) * adjustmentFactor), remainingDailyXP),
        ])
      );

      // Format categories for toast message
      const categories = Object.keys(normalizedXpGains)
        .map((cat) => cat.charAt(0).toUpperCase() + cat.slice(1))
        .join(", ");

      // Show consolidated task completion toast
      Toast.show({
        type: "success",
        text1: `${taskName || "Task"} Completed! ✨`,
        text2: `+${adjustedXPToAdd}XP (${categories}) • ${Math.floor(
          remainingDailyXP - adjustedXPToAdd
        )}XP remaining today`,
        position: "top",
        visibilityTime: 4000,
      });

      let updatedCategories = { ...userData.categories };
      let levelUps: string[] = [];

      // Update XP and levels for each category
      for (const [category, xp] of Object.entries(adjustedXpGains)) {
        if (!updatedCategories[category]) {
          updatedCategories[category] = { level: 1, xp: 0 };
        }

        const currentXP = updatedCategories[category].xp;
        const newTotalXP = currentXP + xp;
        const newLevel = Math.min(
          Math.floor(newTotalXP / XP_PER_LEVEL) + 1,
          MAX_LEVEL
        );
        const currentLevel = updatedCategories[category].level;

        updatedCategories[category] = {
          level: newLevel,
          xp: newTotalXP,
        };

        if (newLevel > currentLevel) {
          levelUps.push(category);
        }
      }

      // Initialize overall if it doesn't exist
      if (!userData.overall) {
        userData.overall = { level: 1, xp: 0, prestige: 0 };
      }

      const updatedUserData = this.updateOverallLevel({
        ...userData,
        categories: updatedCategories,
      });

      // Update today's XP
      const newTodayXP = Math.min(
        DAILY_XP_LIMIT,
        todayXP +
          Object.values(adjustedXpGains).reduce((sum, xp) => sum + (xp || 0), 0)
      );

      // If this is a normal task, remove it from active tasks
      if (taskType === "normal") {
        const updatedActiveTasks = userData.activeTasks.filter(
          (taskId) => !Object.keys(xpGains).includes(taskId)
        );

        await updateDoc(userRef, {
          categories: updatedUserData.categories,
          overall: updatedUserData.overall,
          "stats.todayXP": newTodayXP,
          activeTasks: updatedActiveTasks,
        });
      } else {
        await updateDoc(userRef, {
          categories: updatedUserData.categories,
          overall: updatedUserData.overall,
          "stats.todayXP": newTodayXP,
        });
      }

      // If we're close to the limit, warn the user
      if (newTodayXP > DAILY_XP_LIMIT * 0.8) {
        const remainingXP = DAILY_XP_LIMIT - newTodayXP;
        Toast.show({
          type: "info",
          text1: "Almost There! 🎯",
          text2: `${remainingXP}XP left until today's goal!`,
          position: "top",
          visibilityTime: 3000,
        });
      }

      // Update progress snapshot
      await userService.recordDailyProgress(userId, {
        timestamp: new Date(),
        categories: updatedUserData.categories,
        overall: updatedUserData.overall,
      });

      // Update user stats separately
      await updateDoc(doc(db, "users", userId), {
        stats: {
          ...updatedUserData.stats,
          todayXP: newTodayXP,
        },
      });

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["userData"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });

      // Add completed task to today's completed tasks if it's a routine
      if (taskType === "routine") {
        const taskId = Object.keys(xpGains)[0];
        await updateDoc(userRef, {
          "stats.todayCompletedTasks": arrayUnion(taskId),
        });
      }

      return {
        levelUps,
        newOverallLevel: updatedUserData.overall.level,
        xpLimitReached: newTodayXP >= DAILY_XP_LIMIT,
      };
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to update XP. Please try again.",
        position: "top",
        visibilityTime: 3000,
      });
      throw error;
    }
  },
};
