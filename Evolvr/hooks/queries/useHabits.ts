import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { habitService } from "@/backend/services/habitService";
import type { Habit } from "@/backend/types/Habit";
import type Task from "@/backend/types/Task";
import React from "react";
import { getDoc, doc } from "firebase/firestore";
import { db } from "@/backend/config/firebase";
import { UserData } from "@/backend/types/UserData";

export function useHabits(userId: string | undefined) {
  const queryClient = useQueryClient();

  const {
    data: habits = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["habits", userId],
    queryFn: () => {
      if (!userId) throw new Error("No user ID provided");
      return habitService.getUserHabits(userId);
    },
    enabled: !!userId,
    staleTime: 1000, // Add a small stale time to prevent double fetching
  });

  // Add a check for duplicate IDs
  const uniqueHabits = React.useMemo(() => {
    const seen = new Set();
    return habits.filter((habit) => {
      if (seen.has(habit.id)) return false;
      seen.add(habit.id);
      return true;
    });
  }, [habits]);

  const { data: todaysTasks } = useQuery<Task[]>({
    queryKey: ["habitTasks", userId, "today"],
    queryFn: () => {
      if (!userId) throw new Error("No user ID provided");
      return habitService.getTodaysHabitTasks(userId);
    },
    enabled: !!userId,
  });

  const { data: userData } = useQuery({
    queryKey: ["userData", userId],
    queryFn: async () => {
      if (!userId) throw new Error("No user ID provided");
      const userDoc = await getDoc(doc(db, "users", userId));
      return userDoc.data() as UserData;
    },
    enabled: !!userId,
  });

  const createHabitMutation = useMutation({
    mutationFn: async (habitData: Partial<Habit>) => {
      if (!userId) throw new Error("No user ID provided");

      // Check for duplicate before making the service call
      const currentHabits =
        queryClient.getQueryData<Habit[]>(["habits", userId]) || [];
      const isDuplicate = currentHabits.some(
        (habit) =>
          habit.title.toLowerCase() === habitData.title?.toLowerCase() &&
          habit.task.id === habitData.task?.id
      );

      if (isDuplicate) {
        // Return a Result object instead of throwing
        return {
          success: false,
          error: "A similar habit already exists",
          habit: null,
        };
      }

      try {
        const newHabit = await habitService.createHabit(userId, habitData);
        return {
          success: true,
          error: null,
          habit: newHabit,
        };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to create habit",
          habit: null,
        };
      }
    },
    onSuccess: (result) => {
      if (result.success && result.habit) {
        // Only update cache if creation was successful
        queryClient.setQueryData(
          ["habits", userId],
          (oldData: Habit[] = []) => {
            return [...oldData, result.habit];
          }
        );
      }
    },
  });

  return {
    habits: uniqueHabits,
    todaysTasks,
    isLoading,
    createHabit: createHabitMutation.mutateAsync,
    refetchHabits: refetch,
    userData,
  };
}
