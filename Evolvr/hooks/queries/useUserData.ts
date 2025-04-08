import { useQuery } from "@tanstack/react-query";
import type { UserData } from "@/backend/types/UserData";
import { useAuth } from "@/context/AuthContext";
import { userService } from "@/backend/services/userService";

export function useUserData(userId: string | undefined) {
  const { isInitialized } = useAuth();

  console.log("[useUserData] Hook initialization:", {
    userId,
    isInitialized,
    timestamp: new Date().toISOString(),
    stack: new Error().stack,
  });

  const query = useQuery<UserData>({
    queryKey: ["userData", userId],
    queryFn: async () => {
      console.log("[useUserData] queryFn executing:", {
        userId,
        timestamp: new Date().toISOString(),
      });

      if (!userId) {
        console.error("[useUserData] No userId provided to queryFn");
        throw new Error("No userId provided to queryFn");
      }

      const data = await userService.getUserData(userId);

      console.log("[useUserData] queryFn result:", {
        userId,
        hasData: !!data,
        timestamp: new Date().toISOString(),
      });

      if (!data) {
        throw new Error("No user data found");
      }

      return data;
    },
    enabled: !!userId && isInitialized,
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
    retry: 2,
    retryDelay: 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  console.log("[useUserData] Query state:", {
    userId,
    isSuccess: query.isSuccess,
    isError: query.isError,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    dataExists: !!query.data,
    enabled: !!userId && isInitialized,
    timestamp: new Date().toISOString(),
  });

  return query;
}
