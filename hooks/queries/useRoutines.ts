import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { routineService } from "@/backend/services/routineServices";
import type { Routine } from "@/backend/types/Routine";
import { useEffect } from "react";
import { collection, query, onSnapshot, where } from "firebase/firestore";
import { db } from "@/backend/config/firebase";

export function useRoutines(userId: string | undefined) {
  const queryClient = useQueryClient();

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

  // Add real-time listener
  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, "routines"),
      where("participants", "array-contains", userId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Force refetch of both routines and active tasks
      queryClient.invalidateQueries({ queryKey: ["routines", userId] });
      queryClient.invalidateQueries({ queryKey: ["activeTasks", userId] });
    });

    return () => unsubscribe();
  }, [userId, queryClient]);

  return {
    routines,
    isLoading,
    refetch,
    createRoutine: createRoutineMutation.mutate,
    updateRoutine: updateRoutineMutation.mutate,
    isCreating: createRoutineMutation.isPending,
    isUpdating: updateRoutineMutation.isPending,
  };
}
