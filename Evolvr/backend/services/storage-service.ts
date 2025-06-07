import * as SecureStore from "expo-secure-store";
import logger from "@/utils/logger";

export const storageService = {
  storeUserData: async (userData: any) => {
    // Only store essential data and ensure it's under 2KB
    const essentialData = {
      userId: userData.userId,
      username: userData.username,
      email: userData.email,
      lastUpdated: userData.lastUpdated,
    };

    try {
      const dataString = JSON.stringify(essentialData);

      // Check data size before storing
      const encoder = new TextEncoder();
      const dataSize = encoder.encode(dataString).length;

      if (dataSize > 2048) {
        logger.warn("Data exceeds 2KB limit for SecureStore");
        // Store only critical fields if data is too large
        await SecureStore.setItemAsync(
          "userData",
          JSON.stringify({
            userId: userData.userId,
            email: userData.email,
          })
        );
      } else {
        await SecureStore.setItemAsync("userData", dataString);
      }
    } catch (error) {
      logger.error("Failed to store user data:", error);
    }
  },
};

export default storageService;
