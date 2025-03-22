import { db } from "@/backend/config/firebase";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";
import { incompleteUser } from "../types/User";

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
      // Create the complete user document
      const userRef = doc(db, "users", userId);
      await setDoc(userRef, {
        ...userData,
        onboardingComplete: true,
        createdAt: new Date(),
        lastUpdated: new Date(),
      });

      // Delete the incomplete user document
      const incompleteUserRef = doc(db, "incompleteUsers", userId);
      await deleteDoc(incompleteUserRef);
    } catch (error) {
      console.error("Error completing registration:", error);
      throw error;
    }
  },

  async deleteIncompleteUser(userId: string): Promise<void> {
    try {
      const incompleteUserRef = doc(db, "incompleteUsers", userId);
      await deleteDoc(incompleteUserRef);
    } catch (error) {
      console.error("Error deleting incomplete user:", error);
      throw error;
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
