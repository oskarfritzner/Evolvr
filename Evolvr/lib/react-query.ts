import { QueryFunction } from "@tanstack/react-query";
import { userService } from "@/backend/services/userService";
import { levelService } from "@/backend/services/levelService";
import type { UserData } from "@/backend/types/UserData";
import { queryClient } from "./queryClientInstance";

// Default query function that handles user data queries
const defaultQueryFn: QueryFunction = async ({ queryKey }) => {
  // Handle user data queries
  if (queryKey[0] === "userData" && typeof queryKey[1] === "string") {
    const userId = queryKey[1];
    const userData = await userService.getUserData(userId);

    if (!userData) {
      return {
        ...levelService.getInitialLevels(),
        userId,
      };
    }

    // Ensure categories are present
    if (!userData.categories) {
      userData.categories = levelService.getInitialLevels().categories;
    }

    return userData;
  }

  throw new Error(`No query function found for key ${queryKey.join(", ")}`);
};

// Set the default query function
queryClient.setDefaultOptions({
  queries: {
    queryFn: defaultQueryFn,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  },
});

export { queryClient };
