import { useQuery, useQueryClient } from "@tanstack/react-query";
import { userService } from "@/backend/services/userService";
import type { UserData } from "@/backend/types/UserData";
import { useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";

export function useUserData(userId: string | undefined) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Memoize the sync function
  const syncUserData = useCallback(async () => {
    if (!userId) return;
    try {
      await userService.updateUserCache(userId);
      await queryClient.invalidateQueries({
        queryKey: ["userData", userId],
        exact: true,
      });
    } catch (error) {
      console.error("Error syncing user data:", error);
    }
  }, [userId, queryClient]);

  // Background sync every hour
  useEffect(() => {
    if (!userId) return;

    // Initial sync
    syncUserData();

    const syncInterval = setInterval(syncUserData, 1000 * 60 * 60); // 1 hour
    return () => clearInterval(syncInterval);
  }, [userId, syncUserData]);

  return useQuery({
    queryKey: ["userData", userId],
    queryFn: async () => {
      if (!userId) throw new Error("No user ID provided");
      return userService.getUserData(userId);
    },
    enabled: !!userId && !!user,
    staleTime: 1000 * 60 * 60, // Consider data fresh for 1 hour
    gcTime: 1000 * 60 * 60 * 24, // Keep in cache for 24 hours
    refetchOnWindowFocus: false, // Prevent refetch on window focus
    refetchOnReconnect: false, // Prevent refetch on reconnect
  });
}
