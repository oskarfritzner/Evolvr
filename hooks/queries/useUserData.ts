import { useQuery, useQueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { userService } from "@/backend/services/userService";
import type { UserData } from "@/backend/types/UserData";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

const CACHE_TIME = 1000 * 60 * 60 * 24; // 24 hours
const STALE_TIME = 1000 * 60 * 5; // 5 minutes

export function useUserData(userId: string | undefined) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Background sync every hour instead of 5 minutes
  useEffect(() => {
    if (userId) {
      const syncInterval = setInterval(() => {
        userService
          .updateUserCache(userId)
          .then(() => {
            queryClient.invalidateQueries({ queryKey: ["userData", userId] });
          })
          .catch(console.error);
      }, 1000 * 60 * 60); // 1 hour

      return () => clearInterval(syncInterval);
    }
  }, [userId]);

  return useQuery({
    queryKey: ["userData", userId],
    queryFn: async () => {
      if (!userId) throw new Error("No user ID provided");
      const userData = await userService.getUserData(userId);
      console.log("useUserData hook - Fetched Data:", {
        userId,
        categories: userData?.categories,
        sample: userData?.categories?.physical,
      });
      return userData;
    },
    enabled: !!userId && !!user,
    staleTime: 1000 * 60 * 60, // Consider data fresh for 1 hour
  });
}
