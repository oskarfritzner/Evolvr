import {
  doc,
  collection,
  query,
  where,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "@/backend/config/firebase";
import {
  Goal,
  GoalTimeframe,
  GoalStatus,
  GoalStats,
  GoalTemplate,
} from "../types/Goal";

function generateId(prefix: string = "goal"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function isGoalExpired(goal: Goal): boolean {
  const now = new Date();
  const createdAt = goal.createdAt.toDate();

  switch (goal.timeframe) {
    case GoalTimeframe.DAILY:
      // Check if the goal was created on a different day
      return (
        createdAt.getDate() !== now.getDate() ||
        createdAt.getMonth() !== now.getMonth() ||
        createdAt.getFullYear() !== now.getFullYear()
      );

    case GoalTimeframe.MONTHLY:
      // Check if the goal was created in a different month
      return (
        createdAt.getMonth() !== now.getMonth() ||
        createdAt.getFullYear() !== now.getFullYear()
      );

    case GoalTimeframe.YEARLY:
      // Check if the goal was created in a different year
      return createdAt.getFullYear() !== now.getFullYear();

    default:
      return false;
  }
}

export const goalService = {
  // Create a new goal
  async createGoal(userId: string, goalData: Partial<Goal>): Promise<Goal> {
    try {
      const goalId = generateId("goal");
      const now = Timestamp.now();

      // Create base goal object with required fields
      const baseGoal = {
        id: goalId,
        userId,
        description: goalData.description || "",
        timeframe: goalData.timeframe || GoalTimeframe.DAILY,
        status: GoalStatus.NOT_STARTED,
        progress: 0,
        createdAt: now,
        updatedAt: now,
      };

      // Add optional fields only if they exist and are not undefined
      const optionalFields: Partial<Goal> = {};

      if (goalData.steps && goalData.steps.length > 0) {
        optionalFields.steps = goalData.steps;
      }

      if (goalData.measurable) {
        optionalFields.measurable = goalData.measurable;
      }

      if (goalData.category) {
        optionalFields.category = goalData.category;
      }

      if (goalData.parentGoalId) {
        optionalFields.parentGoalId = goalData.parentGoalId;
      }

      if (goalData.reflection) {
        optionalFields.reflection = goalData.reflection;
      }

      // Combine base goal with optional fields
      const newGoal = {
        ...baseGoal,
        ...optionalFields,
      };

      await setDoc(doc(db, "users", userId, "goals", goalId), newGoal);
      return newGoal;
    } catch (error) {
      console.error("Error creating goal:", error);
      throw error;
    }
  },

  // Get all goals for a user by timeframe
  async getGoalsByTimeframe(
    userId: string,
    timeframe: GoalTimeframe
  ): Promise<Goal[]> {
    try {
      const goalsRef = collection(db, "users", userId, "goals");
      const q = query(
        goalsRef,
        where("timeframe", "==", timeframe),
        where("status", "!=", GoalStatus.ARCHIVED),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(q);
      const goals = snapshot.docs.map((doc) => doc.data() as Goal);

      // Check for expired goals and archive them
      const expiredGoals = goals.filter((goal) => isGoalExpired(goal));
      await Promise.all(
        expiredGoals.map((goal) =>
          this.archiveGoal(
            userId,
            goal.id,
            `Goal archived: ${timeframe} period ended`
          )
        )
      );

      // Return only non-expired goals
      return goals.filter((goal) => !isGoalExpired(goal));
    } catch (error) {
      console.error("Error getting goals:", error);
      throw error;
    }
  },

  // Get all active goals for a user
  async getAllActiveGoals(userId: string): Promise<Goal[]> {
    try {
      const goalsRef = collection(db, "users", userId, "goals");
      const q = query(
        goalsRef,
        where("status", "!=", GoalStatus.ARCHIVED),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => doc.data() as Goal);
    } catch (error) {
      console.error("Error getting active goals:", error);
      throw error;
    }
  },

  // Update a goal
  async updateGoal(
    userId: string,
    goalId: string,
    updates: Partial<Goal>
  ): Promise<void> {
    try {
      const goalRef = doc(db, "users", userId, "goals", goalId);
      const updatedData = {
        ...updates,
        updatedAt: Timestamp.now(),
      };

      if (updates.status === GoalStatus.COMPLETED) {
        updatedData.completedAt = Timestamp.now();
        await this.updateGoalStats(userId);
      }

      await updateDoc(goalRef, updatedData);
    } catch (error) {
      console.error("Error updating goal:", error);
      throw error;
    }
  },

  // Delete a goal
  async deleteGoal(userId: string, goalId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, "users", userId, "goals", goalId));
    } catch (error) {
      console.error("Error deleting goal:", error);
      throw error;
    }
  },

  // Archive a goal with a reason
  async archiveGoal(
    userId: string,
    goalId: string,
    reason?: string
  ): Promise<void> {
    try {
      const goalRef = doc(db, "users", userId, "goals", goalId);
      await updateDoc(goalRef, {
        status: GoalStatus.ARCHIVED,
        archivedAt: Timestamp.now(),
        archiveReason: reason || "Goal archived",
      });
    } catch (error) {
      console.error("Error archiving goal:", error);
      throw error;
    }
  },

  // Update goal progress
  async updateGoalProgress(
    userId: string,
    goalId: string,
    progress: number
  ): Promise<void> {
    try {
      const status =
        progress >= 100
          ? GoalStatus.COMPLETED
          : progress > 0
          ? GoalStatus.IN_PROGRESS
          : GoalStatus.NOT_STARTED;

      await this.updateGoal(userId, goalId, {
        progress,
        status,
      });
    } catch (error) {
      console.error("Error updating goal progress:", error);
      throw error;
    }
  },

  // Get goal statistics
  async getGoalStats(userId: string): Promise<GoalStats> {
    try {
      const statsRef = doc(db, "users", userId, "goalStats", "current");
      const statsDoc = await getDoc(statsRef);

      if (!statsDoc.exists()) {
        const defaultStats: GoalStats = {
          totalCompleted: 0,
          currentStreak: 0,
          longestStreak: 0,
          completionRate: 0,
          lastUpdated: Timestamp.now(),
        };
        await setDoc(statsRef, defaultStats);
        return defaultStats;
      }

      return statsDoc.data() as GoalStats;
    } catch (error) {
      console.error("Error getting goal stats:", error);
      throw error;
    }
  },

  // Update goal statistics
  async updateGoalStats(userId: string): Promise<void> {
    try {
      const goals = await this.getAllActiveGoals(userId);
      const completedGoals = goals.filter(
        (g) => g.status === GoalStatus.COMPLETED
      );

      const stats: GoalStats = {
        totalCompleted: completedGoals.length,
        currentStreak: await this.calculateCurrentStreak(userId),
        longestStreak: await this.calculateLongestStreak(userId),
        completionRate: (completedGoals.length / goals.length) * 100,
        lastUpdated: Timestamp.now(),
      };

      await setDoc(doc(db, "users", userId, "goalStats", "current"), stats);
    } catch (error) {
      console.error("Error updating goal stats:", error);
      throw error;
    }
  },

  // Calculate current streak
  async calculateCurrentStreak(userId: string): Promise<number> {
    // Implementation for streak calculation
    // This would check daily goals completion for consecutive days
    return 0; // Placeholder
  },

  // Calculate longest streak
  async calculateLongestStreak(userId: string): Promise<number> {
    // Implementation for longest streak calculation
    return 0; // Placeholder
  },

  // Get goal templates
  async getGoalTemplates(userId: string): Promise<GoalTemplate[]> {
    try {
      const templatesRef = collection(db, "goalTemplates");
      const q = query(templatesRef, where("isCustom", "==", false));

      const userTemplatesRef = collection(db, "users", userId, "goalTemplates");
      const userQ = query(userTemplatesRef);

      const [systemTemplates, userTemplates] = await Promise.all([
        getDocs(q),
        getDocs(userQ),
      ]);

      return [
        ...systemTemplates.docs.map((doc) => doc.data() as GoalTemplate),
        ...userTemplates.docs.map((doc) => doc.data() as GoalTemplate),
      ];
    } catch (error) {
      console.error("Error getting goal templates:", error);
      throw error;
    }
  },

  // Create goal from template
  async createGoalFromTemplate(
    userId: string,
    templateId: string
  ): Promise<Goal> {
    try {
      const templateDoc = await getDoc(doc(db, "goalTemplates", templateId));
      if (!templateDoc.exists()) {
        throw new Error("Template not found");
      }

      const template = templateDoc.data() as GoalTemplate;
      return await this.createGoal(userId, {
        description: template.description,
        timeframe: template.timeframe,
        steps: template.defaultSteps?.map((step) => ({
          id: generateId(),
          description: step,
          isCompleted: false,
        })),
        category: template.category,
      });
    } catch (error) {
      console.error("Error creating goal from template:", error);
      throw error;
    }
  },

  // Add reflection to a completed or failed goal
  async addReflection(
    userId: string,
    goalId: string,
    reflection: { content: string; outcome: "success" | "failure" }
  ): Promise<void> {
    try {
      const goalRef = doc(db, "users", userId, "goals", goalId);
      const goalDoc = await getDoc(goalRef);

      if (!goalDoc.exists()) {
        throw new Error("Goal not found");
      }

      const goal = goalDoc.data() as Goal;

      // Only allow reflections on completed or failed goals
      if (
        goal.status !== GoalStatus.COMPLETED &&
        reflection.outcome === "success"
      ) {
        throw new Error("Can only add success reflection to completed goals");
      }

      await updateDoc(goalRef, {
        reflection: {
          content: reflection.content,
          outcome: reflection.outcome,
          lastUpdated: Timestamp.now(),
        },
        status:
          reflection.outcome === "failure"
            ? GoalStatus.ARCHIVED
            : GoalStatus.COMPLETED,
        completedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error("Error adding reflection:", error);
      throw error;
    }
  },
};
