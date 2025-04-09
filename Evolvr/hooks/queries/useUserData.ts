import { useQuery } from "@tanstack/react-query";
import type { UserData } from "@/backend/types/UserData";
import { userService } from "@/backend/services/userService";
import { useAuth } from "@/context/AuthContext";
import { useMemo } from "react";
import { FirebaseError } from "firebase/app";
import Toast from "react-native-toast-message";

export const useUserData = (userId: string | undefined) => {
  const { isInitialized, user: authUser, isLoading: authLoading } = useAuth();

  // If no userId is provided, use the authenticated user's ID
  const effectiveUserId = useMemo(
    () => userId || authUser?.uid,
    [userId, authUser?.uid]
  );

  // Enable the query if we have a userId AND auth is initialized AND auth loading is complete
  const shouldEnableQuery = useMemo(() => {
    // Don't enable if auth is still loading
    if (authLoading) {
      return false;
    }

    const isAuthenticated = !!authUser?.uid;
    const hasUserId = !!effectiveUserId;
    const isReady = isInitialized;

    if (!isAuthenticated) {
      console.warn("useUserData: Not authenticated");
      return false;
    }

    if (!hasUserId) {
      console.warn("useUserData: No user ID provided");
      return false;
    }

    if (!isReady) {
      console.warn("useUserData: Auth not initialized");
      return false;
    }

    return true;
  }, [effectiveUserId, isInitialized, authUser?.uid, authLoading]);

  // Memoize the query key
  const queryKey = useMemo(
    () => ["userData", effectiveUserId],
    [effectiveUserId]
  );

  // Memoize the queryFn
  const queryFn = useMemo(
    () => async () => {
      if (!effectiveUserId) {
        console.warn("No user ID provided to useUserData");
        return null;
      }

      try {
        const data = await userService.getUserData(effectiveUserId);
        if (!data) {
          console.warn(`No user data found for ID: ${effectiveUserId}`);
          return null;
        }
        return data;
      } catch (error) {
        if (error instanceof FirebaseError) {
          if (error.code === "permission-denied") {
            console.warn(
              `Permission denied for user data: ${effectiveUserId}. Context: ${
                effectiveUserId === authUser?.uid
                  ? "own data"
                  : "other user's data"
              }`
            );
            // Don't show toast for permission errors on other users' data
            if (effectiveUserId === authUser?.uid) {
              Toast.show({
                type: "error",
                text1: "Access Error",
                text2:
                  "Unable to access user data. Please try signing out and back in.",
              });
            }
            return null;
          }
        }
        console.error("Error fetching user data:", error);
        throw error;
      }
    },
    [effectiveUserId, authUser?.uid]
  );

  const query = useQuery<UserData | null>({
    queryKey,
    queryFn,
    enabled: shouldEnableQuery,
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
    refetchOnWindowFocus: false,
    refetchInterval: false,
    retry: (failureCount, error) => {
      if (error instanceof FirebaseError) {
        // Don't retry permission errors
        if (error.code === "permission-denied") return false;
        // Don't retry not-found errors
        if (error.code === "not-found") return false;
      }
      return failureCount < 2; // Retry other errors twice
    },
  });

  // Only log on initial load or errors to avoid excessive logging
  if (
    process.env.NODE_ENV === "development" &&
    (query.isLoading || query.isError)
  ) {
    console.log("[useUserData] Query state:", {
      userId: effectiveUserId,
      isSuccess: query.isSuccess,
      isError: query.isError,
      isLoading: query.isLoading,
      isFetching: query.isFetching,
      error: query.error,
      dataExists: !!query.data,
      enabled: shouldEnableQuery,
      authLoading,
      isInitialized,
      timestamp: new Date().toISOString(),
    });
  }

  return query;
};
