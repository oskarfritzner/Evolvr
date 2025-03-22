import { db } from "@/backend/config/firebase";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  getDocs,
} from "firebase/firestore";
import { incompleteUser } from "../types/User";
import { categories } from "@/constants/categories";
import { CategoryLevel, UserLevels } from "@/backend/types/Level";
import { levelService } from "@/backend/services/levelService";
import { usernameService } from "@/backend/services/usernameService";

// Verify categories are imported correctly
console.log("Available categories:", categories);

const COLLECTION = "incompleteUsers";

export const registrationService = {
  async create(
    userId: string,
    data: { email: string; authMethod: "email" | "google" }
  ): Promise<void> {
    const incompleteUserData: incompleteUser = {
      email: data.email,
      userId,
      startedOnboarding: true,
      onboardingComplete: false,
      createdAt: new Date(),
      lastUpdated: new Date(),
      authMethod: data.authMethod,
      onboardingStep: 1,
    };

    // Create incomplete user document
    const userRef = doc(db, "incompleteUsers", userId);
    await setDoc(userRef, incompleteUserData);
  },

  async completeRegistration(userId: string, userData: any): Promise<void> {
    try {
      console.log("Starting registration completion for user:", userId);

      // Validate and reserve username
      if (userData.username) {
        const validation = usernameService.validateUsername(userData.username);
        if (!validation.isValid) {
          throw new Error(validation.error);
        }

        // Check username availability and reserve it
        await usernameService.reserveUsername(userData.username, userId);
      }

      // Get initial levels using levelService
      const initialLevels: UserLevels = levelService.getInitialLevels();
      console.log("Initial levels from levelService:", initialLevels);

      // Create the complete user document with all required fields
      const userRef = doc(db, "users", userId);

      // Extract fields we don't want overridden
      const { categories: userCategories, ...restUserData } = userData;

      const finalUserData = {
        ...restUserData,
        userId,
        onboardingComplete: true,
        createdAt: new Date(),
        lastUpdated: new Date(),
        displayName: userData.username || "",
        usernameLower: (userData.username || "").toLowerCase(),
        displayNameLower: (userData.username || "").toLowerCase(),
        email: userData.email,
        friends: [],
        activeTasks: [],
        completedTasks: [],
        progress: [],
        challenges: [],
        posts: [],
        subscription: {
          type: "FREE",
          startDate: new Date(),
          status: "active",
          autoRenew: false,
        },
        // Use the categories from levelService
        categories: initialLevels.categories,
        overall: initialLevels.overall,
        stats: {
          totalTasksCompleted: 0,
          currentStreak: 0,
          longestStreak: 0,
          routinesCompleted: 0,
          habitsCompleted: [],
          challengesCompleted: [],
          totalChallengesJoined: 0,
          todayXP: 0,
          todayCompletedTasks: [],
          ...userData.stats,
        },
        habits: {},
        Challenges: [],
        cachedRoutines: [],
        blockedUsers: [],
      };

      console.log("Final user data categories:", finalUserData.categories);

      // First set the document
      await setDoc(userRef, finalUserData);

      // Verify the document was created
      const verifyDoc = await getDoc(userRef);
      if (!verifyDoc.exists()) {
        throw new Error("User document was not created successfully");
      }

      // Delete the incomplete user document
      const incompleteUserRef = doc(db, "incompleteUsers", userId);
      await deleteDoc(incompleteUserRef);

      // Double check the incomplete user was deleted
      const verifyIncomplete = await getDoc(incompleteUserRef);
      if (verifyIncomplete.exists()) {
        console.warn(
          "Incomplete user document still exists after deletion attempt"
        );
        // Try one more time
        await deleteDoc(incompleteUserRef);
      }
    } catch (error) {
      // If registration fails, make sure to release the username
      if (userData.username) {
        await usernameService
          .releaseUsername(userData.username)
          .catch(console.error);
      }
      console.error("Error completing registration:", error);
      throw error;
    }
  },

  async deleteIncompleteUser(userId: string): Promise<void> {
    try {
      // First check if the document exists
      const incompleteUserRef = doc(db, "incompleteUsers", userId);
      const docSnap = await getDoc(incompleteUserRef);
      const userData = docSnap.exists()
        ? (docSnap.data() as incompleteUser)
        : null;

      // Release username if it exists
      if (userData?.username) {
        await usernameService.releaseUsername(userData.username);
      }

      if (docSnap.exists()) {
        await deleteDoc(incompleteUserRef);
      } else {
        console.log("No incomplete user document found to delete");
      }

      // Also check and delete from users collection just in case
      const userRef = doc(db, "users", userId);
      const userDocSnap = await getDoc(userRef);

      if (userDocSnap.exists()) {
        await deleteDoc(userRef);
      }

      // Clean up any related data
      try {
        // Delete from notifications subcollection if it exists
        const notificationsRef = collection(
          db,
          `users/${userId}/notifications`
        );
        const notificationsSnapshot = await getDocs(notificationsRef);
        const deletePromises = notificationsSnapshot.docs.map((doc) =>
          deleteDoc(doc.ref)
        );
        await Promise.all(deletePromises);
      } catch (error) {
        console.error("Error cleaning up notifications:", error);
      }
    } catch (error: any) {
      console.error("Error in deleteIncompleteUser:", error);
      throw new Error(`Failed to delete user data: ${error.message}`);
    }
  },

  async updateOnboardingStep(userId: string, step: number): Promise<void> {
    try {
      const incompleteUserRef = doc(db, "incompleteUsers", userId);
      await setDoc(
        incompleteUserRef,
        {
          onboardingStep: step,
          lastUpdated: new Date(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error("Error updating onboarding step:", error);
      throw error;
    }
  },

  async update(userId: string, data: Partial<incompleteUser>) {
    const ref = doc(db, COLLECTION, userId);
    const docSnap = await getDoc(ref);

    if (!docSnap.exists()) {
      throw new Error("Incomplete user not found");
    }

    // Remove undefined values and safely convert dates
    const sanitizedData = Object.entries(data).reduce((acc, [key, value]) => {
      // Skip undefined values
      if (value === undefined) return acc;

      // Handle date conversions
      if (value instanceof Date) {
        // Check if date is valid before converting
        if (!isNaN(value.getTime())) {
          acc[key] = Timestamp.fromDate(value);
        }
      } else if (value && typeof value === "object" && "toDate" in value) {
        // Already a Firestore Timestamp
        acc[key] = value;
      } else {
        acc[key] = value;
      }

      return acc;
    }, {} as Record<string, any>);

    // Always add lastUpdated
    sanitizedData.lastUpdated = Timestamp.now();

    await updateDoc(ref, sanitizedData);
  },

  async get(userId: string) {
    const docRef = doc(db, COLLECTION, userId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return null;

    const data = docSnap.data() as incompleteUser;

    // Convert Timestamps to Dates
    return {
      ...data,
      createdAt:
        data.createdAt instanceof Timestamp
          ? data.createdAt.toDate()
          : new Date(data.createdAt),
      lastUpdated:
        data.lastUpdated instanceof Timestamp
          ? data.lastUpdated.toDate()
          : new Date(data.lastUpdated),
      birthDate: data.birthDate
        ? data.birthDate instanceof Timestamp
          ? data.birthDate.toDate()
          : new Date(data.birthDate)
        : undefined,
    };
  },

  async delete(userId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, COLLECTION, userId));
    } catch (error) {
      console.error("Error deleting incomplete user:", error);
      throw error;
    }
  },

  async convertToUser(userId: string, userData: any): Promise<void> {
    try {
      // Remove onboarding-specific fields
      const {
        startedOnboarding,
        onboardingStep,
        onboardingComplete,
        authMethod,
        ...cleanUserData
      } = userData;

      // Convert dates to Timestamps for Firestore
      const finalUserData = {
        ...cleanUserData,
        onboardingComplete: true,
        createdAt: Timestamp.now(),
        lastUpdated: Timestamp.now(),
        // Convert any Date objects in the data
        ...(cleanUserData.birthDate && {
          birthDate:
            cleanUserData.birthDate instanceof Date
              ? Timestamp.fromDate(cleanUserData.birthDate)
              : Timestamp.fromDate(new Date(cleanUserData.birthDate)),
        }),
      };

      // Create user document
      await setDoc(doc(db, "users", userId), finalUserData);

      // Delete incomplete user
      await this.delete(userId);
    } catch (error) {
      console.error("Error converting to user:", error);
      throw error;
    }
  },
};
