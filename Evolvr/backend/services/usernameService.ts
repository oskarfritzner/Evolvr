import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../config/firebase";

const USERNAME_COLLECTION = "usernames";

export const usernameService = {
  // Validate username format
  validateUsername(username: string): { isValid: boolean; error?: string } {
    if (!username) {
      return { isValid: false, error: "Username is required" };
    }

    if (username.length < 3) {
      return {
        isValid: false,
        error: "Username must be at least 3 characters long",
      };
    }

    if (username.length > 30) {
      return {
        isValid: false,
        error: "Username must be less than 30 characters",
      };
    }

    // Only allow letters, numbers, and underscores
    const validUsernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!validUsernameRegex.test(username)) {
      return {
        isValid: false,
        error: "Username can only contain letters, numbers, and underscores",
      };
    }

    return { isValid: true };
  },

  // Check if a username is available
  async isUsernameAvailable(username: string): Promise<boolean> {
    const normalizedUsername = username.toLowerCase();
    const usernameDoc = await getDoc(
      doc(db, USERNAME_COLLECTION, normalizedUsername)
    );
    return !usernameDoc.exists();
  },

  // Reserve a username for a user
  async reserveUsername(username: string, userId: string): Promise<void> {
    const normalizedUsername = username.toLowerCase();

    // First check if username is available
    if (!(await this.isUsernameAvailable(normalizedUsername))) {
      throw new Error("Username is already taken");
    }

    // Create username document
    await setDoc(doc(db, USERNAME_COLLECTION, normalizedUsername), {
      userId,
      username,
      createdAt: new Date(),
    });
  },

  // Release a username (when user changes username or deletes account)
  async releaseUsername(username: string): Promise<void> {
    const normalizedUsername = username.toLowerCase();
    await deleteDoc(doc(db, USERNAME_COLLECTION, normalizedUsername));
  },

  // Update a user's username
  async updateUsername(
    oldUsername: string | null,
    newUsername: string,
    userId: string
  ): Promise<void> {
    const normalizedNewUsername = newUsername.toLowerCase();

    // Validate new username
    const validation = this.validateUsername(newUsername);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    // Check availability
    if (!(await this.isUsernameAvailable(normalizedNewUsername))) {
      throw new Error("Username is already taken");
    }

    // Release old username if it exists
    if (oldUsername) {
      await this.releaseUsername(oldUsername);
    }

    // Reserve new username
    await this.reserveUsername(newUsername, userId);
  },
};
