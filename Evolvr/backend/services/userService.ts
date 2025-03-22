import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  collection,
  query,
  where,
  getDocs,
  limit,
  Timestamp,
  deleteDoc,
  arrayRemove,
} from "firebase/firestore";
import { db, auth, storage } from "../config/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import type { UserData, UserStats, ProgressSnapshot } from "../types/UserData";
import { FriendData } from "../types/Friend";
import { postService } from "./postService";
import { usernameService } from "./usernameService";
import logger from "@/utils/logger";
import Toast from "react-native-toast-message";

export const userService = {
  createUserData(data: Partial<UserData>) {
    const username = data.username || "";
    const displayName = data.displayName || username;

    return {
      ...data,
      username,
      displayName,
      usernameLower: username.toLowerCase(),
      displayNameLower: displayName.toLowerCase(),
      createdAt: Timestamp.now(),
      friends: [], // Initialize empty friends array
    };
  },

  async recordDailyProgress(
    userId: string,
    snapshot: ProgressSnapshot
  ): Promise<void> {
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        progress: arrayUnion(snapshot),
      });
    } catch (error) {
      console.error("Error recording daily progress:", error);
      throw error;
    }
  },

  async logout(): Promise<void> {
    await auth.signOut();
  },

  async deleteAccount(userId: string): Promise<void> {
    try {
      // Get user data first
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.exists() ? (userDoc.data() as UserData) : null;

      if (userData?.username) {
        await usernameService.releaseUsername(userData.username);
      }

      // Delete user's data from Firestore
      if (userData) {
        // Delete user document
        await deleteDoc(userRef);

        // Delete user's notifications
        const notificationsRef = collection(
          db,
          `users/${userId}/notifications`
        );
        const notificationsSnapshot = await getDocs(notificationsRef);
        await Promise.all(
          notificationsSnapshot.docs.map((doc) => deleteDoc(doc.ref))
        );

        // Delete user's posts
        const postsQuery = query(
          collection(db, "posts"),
          where("userId", "==", userId)
        );
        const postsSnapshot = await getDocs(postsQuery);
        await Promise.all(postsSnapshot.docs.map((doc) => deleteDoc(doc.ref)));

        // Delete user's routines
        const routinesQuery = query(
          collection(db, "routines"),
          where("createdBy", "==", userId)
        );
        const routinesSnapshot = await getDocs(routinesQuery);
        await Promise.all(
          routinesSnapshot.docs.map((doc) => deleteDoc(doc.ref))
        );

        // Remove user from friends' lists
        const friends = (userData as any).friends || [];
        if (friends.length > 0) {
          await Promise.all(
            friends.map(async (friend: FriendData) => {
              const friendRef = doc(db, "users", friend.userId);
              await updateDoc(friendRef, {
                friends: arrayRemove(userId),
              });
            })
          );
        }
      }

      // Finally delete the authentication account
      const currentUser = auth.currentUser;
      if (currentUser) {
        await currentUser.delete();
      }
    } catch (error) {
      logger.error("Error deleting account:", error);
      throw error;
    }
  },

  async getUserData(userId: string): Promise<UserData | null> {
    try {
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        return null;
      }

      const userData = userDoc.data() as UserData;

      // Check if cache needs updating (older than 1 hour)
      const cacheAge = userData.cachedData?.lastUpdated
        ? Timestamp.now().seconds - userData.cachedData.lastUpdated.seconds
        : Infinity;

      if (cacheAge > 3600) {
        // 1 hour
        // Update cache in background
        this.updateUserCache(userId).catch((error) => {
          throw error;
        });
      }

      return userData;
    } catch (error) {
      throw error;
    }
  },

  async getUserStats(userId: string): Promise<UserStats> {
    try {
      const userDoc = await getDoc(doc(db, "users", userId));
      const userData = userDoc.data() as UserData;

      return {
        totalTasksCompleted: userData.stats?.totalTasksCompleted || 0,
        currentStreak: userData.stats?.currentStreak || 0,
        longestStreak: userData.stats?.longestStreak || 0,
        routinesCompleted: userData.stats?.routinesCompleted || 0,
        habitsCompleted: userData.stats?.habitsCompleted || [],
        challengesCompleted: userData.stats?.challengesCompleted || [],
        totalChallengesJoined: userData.stats?.totalChallengesJoined || 0,
        habitsStreaks: userData.stats?.habitsStreaks || [],
        badgesEarned: userData.stats?.badgesEarned || [],
        todayXP: userData.stats?.todayXP || 0,
        todayCompletedTasks: userData.stats?.todayCompletedTasks || [],
        lastXPReset: userData.stats?.lastXPReset || Timestamp.now(),
        routineStreaks: userData.stats?.routineStreaks || {},
        habitStreaks: userData.stats?.habitStreaks || {},
      };
    } catch (error) {
      console.error("Error getting user stats:", error);
      throw error;
    }
  },

  async getProgressData(userId: string): Promise<ProgressSnapshot[]> {
    const userDoc = await getDoc(doc(db, "users", userId));
    const userData = userDoc.data() as UserData;
    return userData.progress || [];
  },

  async updateSearchTerms(userId: string, data: any) {
    const searchTerms = this.generateSearchTerms(data);
    await updateDoc(doc(db, "users", userId), { searchTerms });
  },

  generateSearchTerms(data: any): string[] {
    const terms = new Set<string>();

    // Add username variations
    if (data.username) {
      const username = data.username.toLowerCase();
      terms.add(username);
      // Add partial matches (minimum 2 characters)
      for (let i = 2; i <= username.length; i++) {
        terms.add(username.slice(0, i));
      }
    }

    // Add display name variations
    if (data.displayName) {
      const displayName = data.displayName.toLowerCase();
      terms.add(displayName);
      // Add each word in display name
      displayName.split(" ").forEach((word: string) => {
        if (word.length >= 2) {
          terms.add(word);
        }
      });
    }

    // Add email prefix
    if (data.email) {
      const emailPrefix = data.email.split("@")[0].toLowerCase();
      if (emailPrefix.length >= 2) {
        terms.add(emailPrefix);
      }
    }

    return Array.from(terms);
  },

  async searchUsers(searchQuery: string, maxResults: number = 20) {
    const searchTerm = searchQuery.toLowerCase();
    if (searchTerm.length < 2) return [];

    const usersRef = collection(db, "users");
    const q = query(
      usersRef,
      where("searchTerms", "array-contains", searchTerm),
      limit(maxResults)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as UserData),
    }));
  },

  async migrateUserSearchTerms(userId: string) {
    try {
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) return;

      const userData = userDoc.data();
      if (!userData.searchTerms) {
        const searchTerms = this.generateSearchTerms(userData);
        await updateDoc(userRef, { searchTerms });
      }
    } catch (error) {
      console.error("Error migrating user search terms:", error);
    }
  },

  async updateUsername(userId: string, newUsername: string): Promise<void> {
    try {
      // Get current user data
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        throw new Error("User not found");
      }

      const userData = userDoc.data() as UserData;
      const oldUsername = userData.username;

      // Update username in both collections
      await usernameService.updateUsername(oldUsername, newUsername, userId);

      // Update user document
      await updateDoc(userRef, {
        username: newUsername,
        usernameLower: newUsername.toLowerCase(),
        displayName: newUsername, // Update display name to match username if they're the same
        displayNameLower: newUsername.toLowerCase(),
      });

      // Update cache
      await this.updateUserCache(userId);
    } catch (error) {
      logger.error("Error updating username:", error);
      throw error;
    }
  },

  async migrateUserFields(userId: string) {
    try {
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) return;

      const userData = userDoc.data();
      const updates: Partial<UserData> = {};

      if (!userData.usernameLower && userData.username) {
        updates.usernameLower = userData.username.toLowerCase();
      }

      if (!userData.displayNameLower && userData.displayName) {
        updates.displayNameLower = userData.displayName.toLowerCase();
      }

      if (Object.keys(updates).length > 0) {
        await updateDoc(userRef, updates);
      }
    } catch (error) {
      console.error("Error migrating user fields:", error);
    }
  },

  async migrateUserFriends(userId: string) {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();
      if (!Array.isArray(userData.friends)) {
        await updateDoc(userRef, {
          friends: [],
        });
      }
    }
  },

  async updateUserCache(userId: string): Promise<void> {
    try {
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) return;

      const userData = userDoc.data();

      // Get recent posts
      const recentPosts = await postService.getUserPosts(userId, userId);
      const cachedPosts = recentPosts.slice(0, 10).map((post) => ({
        id: post.id,
        content: post.content || "",
        createdAt: post.createdAt,
        likes: post.likedBy?.length || 0,
        comments: post.comments?.length || 0,
        imageURL: post.imageURL || null,
        privacy: post.privacy || "public",
      }));

      // Create cache data object with default values
      const cacheData = {
        lastUpdated: Timestamp.now(),
        profileImage: userData.photoURL || null,
        recentPosts: cachedPosts,
        stats: {
          postsCount: recentPosts.length,
          followersCount: userData.followers?.length || 0,
          followingCount: userData.following?.length || 0,
        },
      };

      // Validate no undefined values exist
      const hasUndefinedValues = (obj: any): boolean => {
        return Object.values(obj).some((value) => {
          if (value === undefined) return true;
          if (value === null) return false;
          if (typeof value === "object") return hasUndefinedValues(value);
          return false;
        });
      };

      if (hasUndefinedValues(cacheData)) {
        console.warn("Cache data contains undefined values, aborting update");
        return;
      }

      // Update cache
      await updateDoc(userRef, {
        cachedData: cacheData,
      });
    } catch (error) {
      console.error("Error updating user cache:", error);
      // Log more details about the error
      if (error instanceof Error) {
        console.error("Error details:", {
          message: error.message,
          stack: error.stack,
        });
      }
    }
  },

  async uploadProfileImage(uri: string): Promise<string> {
    if (!auth.currentUser?.uid) {
      throw new Error("User must be authenticated to upload profile image");
    }

    try {
      const response = await fetch(uri);
      const blob = await response.blob();

      // Use the correct path structure: profileImages/{userId}/profile
      const fileRef = ref(
        storage,
        `profileImages/${auth.currentUser.uid}/profile`
      );

      await uploadBytes(fileRef, blob);
      const downloadURL = await getDownloadURL(fileRef);

      // Update the user's photoURL in Firestore
      const userRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(userRef, {
        photoURL: downloadURL,
      });

      return downloadURL;
    } catch (error) {
      console.error("Error uploading profile image:", error);
      if (error instanceof Error) {
        Toast.show({
          type: "error",
          text1: "Upload Failed",
          text2: error.message,
        });
      }
      throw error;
    }
  },

  async updateUserProfile(
    userId: string,
    data: { username?: string; bio?: string; photoURL?: string }
  ): Promise<void> {
    const userRef = doc(db, "users", userId);

    // If username is being updated, handle it separately
    if (data.username) {
      await this.updateUsername(userId, data.username);
      delete data.username; // Remove username from data to prevent double update
    }

    // Update other profile fields
    const updates: Partial<UserData> = {
      ...data,
    };

    if (Object.keys(updates).length > 0) {
      await updateDoc(userRef, updates);
    }

    await this.updateUserCache(userId);
  },
};
