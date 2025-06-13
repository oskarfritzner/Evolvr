import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";

const isWeb = Platform.OS === "web";

class EncryptionService {
  private generateKey(): string {
    // Generate a 256-bit (32-byte) key
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    // Convert to base64 string
    return btoa(String.fromCharCode.apply(null, Array.from(randomBytes)));
  }

  async storeKey(userId: string, key: string): Promise<void> {
    const storageKey = `encryption_key_${userId}`;
    console.log("Storing key for user:", userId);

    if (isWeb) {
      localStorage.setItem(storageKey, key);
    } else {
      await AsyncStorage.setItem(storageKey, key);
    }
  }

  async getKey(userId: string): Promise<string | null> {
    const storageKey = `encryption_key_${userId}`;
    let key: string | null = null;
    if (isWeb) {
      key = localStorage.getItem(storageKey);
    } else {
      key = await AsyncStorage.getItem(storageKey);
    }

    if (key && key.includes('"')) {
      await this.clearKey(userId);
      return null;
    }

    if (!key) {
      key = await this.generateKey();
      await this.storeKey(userId, key);
    }

    return key;
  }

  async clearKey(userId: string): Promise<void> {
    const storageKey = `encryption_key_${userId}`;
    if (isWeb) {
      localStorage.removeItem(storageKey);
    } else {
      await AsyncStorage.removeItem(storageKey);
    }
  }

  async getOrCreateKey(userId: string): Promise<string> {
    const key = await this.getKey(userId);
    if (!key) {
      const newKey = this.generateKey();
      await this.storeKey(userId, newKey);
      return newKey;
    }
    return key;
  }

  async encrypt(data: string, userId: string): Promise<string> {
    try {
      console.log("Starting encryption for user:", userId);
      const key = await this.getOrCreateKey(userId);
      console.log("Using key for encryption:", key);

      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);

      // Convert base64 key to Uint8Array
      const keyBytes = Uint8Array.from(atob(key), (c) => c.charCodeAt(0));
      console.log("Key bytes length:", keyBytes.length);

      const cryptoKey = await crypto.subtle.importKey(
        "raw",
        keyBytes,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt"]
      );

      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encryptedBuffer = await crypto.subtle.encrypt(
        {
          name: "AES-GCM",
          iv,
        },
        cryptoKey,
        dataBuffer
      );

      const encryptedArray = new Uint8Array(encryptedBuffer);
      const combined = new Uint8Array(iv.length + encryptedArray.length);
      combined.set(iv);
      combined.set(encryptedArray, iv.length);

      const result = btoa(
        String.fromCharCode.apply(null, Array.from(combined))
      );
      console.log("Encryption successful");
      return result;
    } catch (error) {
      console.error("Encryption error:", error);
      throw new Error("Failed to encrypt data");
    }
  }

  async decrypt(data: string, userId: string): Promise<string> {
    try {
      const key = await this.getOrCreateKey(userId);

      // Convert base64 key to Uint8Array
      const keyBytes = Uint8Array.from(atob(key), (c) => c.charCodeAt(0));

      // Convert base64 data to Uint8Array
      const combined = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));

      // Extract IV and encrypted data
      const iv = combined.slice(0, 12);
      const encryptedData = combined.slice(12);

      const cryptoKey = await crypto.subtle.importKey(
        "raw",
        keyBytes,
        { name: "AES-GCM", length: 256 },
        false,
        ["decrypt"]
      );

      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv,
        },
        cryptoKey,
        encryptedData
      );

      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuffer);
    } catch (error) {
      console.error("Decryption error:", error);
      throw new Error(
        `Decryption failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}

export const encryptionService = new EncryptionService();
