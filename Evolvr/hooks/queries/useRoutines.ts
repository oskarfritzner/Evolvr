import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { routineService } from "@/backend/services/routineServices";
import type { Routine } from "@/backend/types/Routine";
import { useEffect, useState } from "react";
import { collection, query, onSnapshot, where } from "firebase/firestore";
import { db } from "@/backend/config/firebase";
import { View } from "react-native";
import { FirebaseError } from "firebase/app";

export function useRoutines(userId: string | undefined) {
  const queryClient = useQueryClient();
  const [listenerError, setListenerError] = useState<string | null>(null);

  const {
    data: routines = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["routines", userId],
    queryFn: () => routineService.getUserRoutines(userId || ""),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in memory a bit longer than stale time
  });

  const createRoutineMutation = useMutation({
    mutationFn: async (routineData: Partial<Routine>) => {
      if (!userId) throw new Error("No user ID provided");
      return routineService.saveRoutine(userId, routineData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["routines", userId],
        exact: false,
        refetchType: "all",
      });
    },
  });

  const updateRoutineMutation = useMutation({
    mutationFn: async ({
      routineId,
      updates,
    }: {
      routineId: string;
      updates: Partial<Routine>;
    }) => {
      return routineService.updateRoutine({ routineId, updates });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["routines", userId],
        exact: false,
        refetchType: "all",
      });
    },
  });

  // Add real-time listener with delay and error handling
  useEffect(() => {
    if (!userId) return;

    let unsubscribe: (() => void) | undefined;
    let retryCount = 0;
    const maxRetries = 3;

    const setupListener = () => {
      // Delay setting up the listener to ensure token propagation
      setTimeout(() => {
        try {
          const q = query(
            collection(db, "routines"),
            where("participants", "array-contains", userId)
          );

          unsubscribe = onSnapshot(
            q,
            (snapshot) => {
              // Force refetch of both routines and active tasks
              queryClient.invalidateQueries({ queryKey: ["routines", userId] });
              queryClient.invalidateQueries({
                queryKey: ["activeTasks", userId],
              });
              setListenerError(null);
            },
            (error) => {
              // Handle errors
              console.error("Routines listener error:", error);
              if (
                error instanceof FirebaseError &&
                error.code === "permission-denied"
              ) {
                setListenerError(
                  "Permission denied error in routines listener"
                );

                // Retry with exponential backoff
                if (retryCount < maxRetries) {
                  retryCount++;
                  const delay = Math.min(1000 * 2 ** retryCount, 10000);
                  setTimeout(() => {
                    if (unsubscribe) {
                      unsubscribe();
                      unsubscribe = undefined;
                    }
                    setupListener();
                  }, delay);
                }
              }
            }
          );
        } catch (err) {
          console.error("Error setting up routines listener:", err);
        }
      }, 1500); // Delay 1.5s for token propagation
    };

    setupListener();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [userId, queryClient]);

  return {
    routines,
    isLoading,
    refetch,
    createRoutine: createRoutineMutation.mutate,
    updateRoutine: updateRoutineMutation.mutate,
    isCreating: createRoutineMutation.isPending,
    isUpdating: updateRoutineMutation.isPending,
    listenerError,
  };
}
