import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/backend/config/firebase";
import { Badge, UserBadge } from "../types/Badge";
import { UserData } from "../types/UserData";
import { BadgeCheckParams } from "../types/Badge";

const BADGES_COLLECTION = "badges";

export const badgeService = {
  // Get all available badges
  async getAllBadges(): Promise<Badge[]> {
    try {
      const badgesSnapshot = await getDocs(collection(db, BADGES_COLLECTION));
      if (badgesSnapshot.empty) {
        console.log("No badges found in collection");
        return [];
      }
      return badgesSnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Badge)
      );
    } catch (error) {
      console.error("Error fetching badges:", error);
      // Return empty array instead of throwing to prevent UI errors
      return [];
    }
  },

  // Get user's earned badges
  async getUserBadges(userId: string): Promise<UserBadge[]> {
    try {
      const userDoc = await getDoc(doc(db, "users", userId));
      if (!userDoc.exists()) {
        console.warn(`No user document found for userId: ${userId}`);
        return [];
      }
      const userData = userDoc.data() as UserData;
      return userData.badges || [];
    } catch (error) {
      console.error("Error getting user badges:", error);
      return [];
    }
  },

  // Check and award badges based on user progress
  async checkAndAwardBadges(
    userId: string,
    params: BadgeCheckParams
  ): Promise<string[]> {
    try {
      const userDoc = await getDoc(doc(db, "users", userId));
      if (!userDoc.exists()) {
        console.warn("User document not found");
        return [];
      }

      const userData = userDoc.data() as UserData;
      const badges = await this.getAllBadges();
      const earnedBadges = userData.badges || [];
      const newBadges: string[] = [];

      for (const badge of badges) {
        // Skip if badge is invalid or already earned
        if (
          !badge?.requirement?.type ||
          earnedBadges.some((eb) => eb.badgeId === badge.id)
        ) {
          continue;
        }

        let isEarned = false;
        const requirement = badge.requirement;

        switch (requirement.type) {
          case "level":
            if (
              requirement.category &&
              userData.categories?.[requirement.category]
            ) {
              isEarned =
                userData.categories[requirement.category].level >=
                requirement.threshold;
            } else {
              isEarned =
                (userData.overall?.level || 0) >= requirement.threshold;
            }
            break;

          case "streak":
            isEarned =
              (userData.stats?.currentStreak || 0) >= requirement.threshold;
            break;

          case "completion":
            const totalCompleted = userData.stats?.totalTasksCompleted || 0;
            const routinesCompleted = userData.stats?.routinesCompleted || 0;
            const challengesCompleted =
              userData.stats?.challengesCompleted || [];

            // Log for debugging
            console.log("Checking completion badge:", {
              badgeName: badge.name,
              category: badge.category,
              challengesCompleted,
              routinesCompleted,
              totalCompleted,
              threshold: requirement.threshold,
            });

            switch (badge.category) {
              case "routine":
                isEarned = routinesCompleted >= requirement.threshold;
                break;
              case "challenge":
                isEarned = challengesCompleted.length >= requirement.threshold;
                break;
              default:
                isEarned = totalCompleted >= requirement.threshold;
            }
            break;

          case "prestige":
            const userPrestige = userData.overall?.prestige || 0;
            if (badge.name === "First Prestige") {
              // First Prestige is earned when reaching prestige level 1
              isEarned = userPrestige >= 1;

              // Log for debugging
              console.log("Checking First Prestige badge:", {
                badgeName: badge.name,
                currentPrestige: userPrestige,
                threshold: requirement.threshold,
                isEarned,
              });
            } else {
              // For other prestige badges
              isEarned = userPrestige >= requirement.threshold;
            }
            break;
        }

        if (isEarned) {
          newBadges.push(badge.id);
          earnedBadges.push({
            badgeId: badge.id,
            earnedAt: new Date(),
          });
        }
      }

      if (newBadges.length > 0) {
        await updateDoc(doc(db, "users", userId), {
          badges: earnedBadges,
        });
      }

      return newBadges;
    } catch (error) {
      console.error("Error checking badges:", error);
      return [];
    }
  },

  // Calculate progress towards a badge
  calculateBadgeProgress(
    badge: Badge | undefined,
    userData: UserData | undefined
  ): number {
    // Early return if badge or userData is undefined
    if (!badge || !userData || !badge.requirement) {
      console.warn(
        `Invalid badge structure or user data for badge: ${
          badge?.name || "unknown"
        }`
      );
      return 0;
    }

    try {
      const requirement = badge.requirement;
      let currentValue = 0;
      let targetValue = requirement.threshold || 0;

      switch (requirement.type) {
        case "level":
          if (
            requirement.category &&
            userData.categories?.[requirement.category]
          ) {
            // For category-specific level badges
            currentValue = userData.categories[requirement.category].level || 0;
          } else {
            // For overall level badges
            currentValue = userData.overall?.level || 0;
          }

          // Log for debugging
          console.log("Level Badge Progress:", {
            badgeName: badge.name,
            category: requirement.category || "overall",
            currentLevel: currentValue,
            targetLevel: targetValue,
            progress: currentValue / targetValue,
          });
          break;

        case "streak":
          currentValue = userData.stats?.currentStreak || 0;
          break;

        case "completion":
          // Get the stats safely
          const stats = userData.stats || {};

          if (badge.name === "Challenge Champion") {
            // Specifically handle the Challenge Champion badge
            const completedChallenges = stats.challengesCompleted || [];
            currentValue = completedChallenges.length;

            // Log for debugging
            console.log("Challenge Champion Progress:", {
              currentValue,
              targetValue,
              completedChallenges,
              badge: badge.name,
              requirement: requirement.type,
            });
          } else if (badge.name === "Routine Ruler") {
            // Specifically handle the Routine Ruler badge
            currentValue = stats.routinesCompleted || 0;

            // Log for debugging
            console.log("Routine Ruler Progress:", {
              currentValue,
              targetValue,
              routinesCompleted: stats.routinesCompleted,
              badge: badge.name,
              requirement: requirement.type,
            });
          } else if (badge.category === "routine") {
            currentValue = stats.routinesCompleted || 0;
          } else if (badge.category === "challenge") {
            const completedChallenges = stats.challengesCompleted || [];
            currentValue = completedChallenges.length;
          } else {
            currentValue = stats.totalTasksCompleted || 0;
          }
          break;

        case "prestige":
          const currentPrestige = userData.overall?.prestige || 0;
          currentValue = currentPrestige;

          if (badge.name === "First Prestige") {
            // Specifically handle the First Prestige badge
            // Log for debugging
            console.log("First Prestige Badge Progress:", {
              badgeName: badge.name,
              currentPrestige,
              targetValue: requirement.threshold,
              hasAchieved: currentPrestige >= 1,
              progress: currentPrestige >= 1 ? 1 : 0,
            });
          }

          // Log for debugging
          console.log("Prestige Progress:", {
            badgeName: badge.name,
            currentPrestige,
            targetValue: requirement.threshold,
            progress: currentPrestige >= requirement.threshold ? 1 : 0,
          });
          break;

        default:
          return 0;
      }

      // Calculate progress based on the type
      let progress = 0;
      if (requirement.type === "prestige") {
        // Prestige badges are binary - either achieved or not
        progress = currentValue >= targetValue ? 1 : 0;
      } else if (requirement.type === "level") {
        // Level progress is linear
        progress = Math.min(currentValue / targetValue, 1);
      } else {
        // Default progress calculation for other types
        progress = Math.min(currentValue / targetValue, 1);
      }

      // Log final progress calculation
      console.log("Badge Progress Calculation:", {
        badgeName: badge.name,
        type: requirement.type,
        category: badge.category,
        currentValue,
        targetValue,
        progress,
        stats: userData.stats,
      });

      return progress;
    } catch (error) {
      console.error(
        `Error calculating progress for badge ${badge?.name}:`,
        error
      );
      return 0;
    }
  },

  // Add to badgeService object
  async getUserData(userId: string): Promise<UserData> {
    const userDoc = await getDoc(doc(db, "users", userId));
    return userDoc.data() as UserData;
  },

  // Debug function to check badge eligibility
  async checkBadgeEligibility(userId: string): Promise<void> {
    try {
      const userData = await this.getUserData(userId);
      if (!userData) {
        console.warn("No user data found for badge eligibility check");
        return;
      }

      const allBadges = await this.getAllBadges();
      if (!allBadges.length) {
        console.warn("No badges found for eligibility check");
        return;
      }

      allBadges.forEach((badge) => {
        if (
          badge?.requirement?.type === "level" &&
          badge.requirement.category
        ) {
          const categoryLevel =
            userData.categories?.[badge.requirement.category]?.level || 0;
          console.log(`Badge: ${badge.name}`);
          console.log(`Required level: ${badge.requirement.threshold}`);
          console.log(
            `Current level in ${badge.requirement.category}: ${categoryLevel}`
          );
          console.log(
            `Should earn: ${categoryLevel >= badge.requirement.threshold}`
          );
        }
      });
    } catch (error) {
      console.error("Error checking eligibility:", error);
      // Don't throw the error, just log it
    }
  },
};
