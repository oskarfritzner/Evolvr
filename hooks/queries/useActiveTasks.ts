import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userService } from "@/backend/services/userService";
import { taskService } from "@/backend/services/taskService";
import { challengeService } from "@/backend/services/challengeService";
import { habitService } from "@/backend/services/habitService";
import { routineService } from "@/backend/services/routineServices";
import { TaskType } from "@/backend/types/Task";
import React from "react";
import { Alert } from "react-native";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/config/firebase";
import { ChallengeTask } from "@/backend/types/Challenge";
import { levelService } from "@/backend/services/levelService";
import { UserData } from "@/backend/types/UserData";
import Toast from "react-native-toast-message";

interface TasksData {
  normalTasks: any[];
  routineTasks: any[];
  habitTasks: any[];
  challengeTasks: any[];
}

const DEFAULT_TASKS: TasksData = {
  normalTasks: [],
  routineTasks: [],
  habitTasks: [],
  challengeTasks: [],
};

export function useActiveTasks(userId?: string) {
  const queryClient = useQueryClient();

  const {
    data: tasks = DEFAULT_TASKS,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["activeTasks", userId],
    queryFn: async () => {
      if (!userId) throw new Error("No user ID provided");
      const routineTasks = await routineService.getActiveRoutineTasks(userId);
      return {
        normalTasks: [],
        routineTasks,
        habitTasks: [],
        challengeTasks: [],
      };
    },
    enabled: !!userId,
    refetchInterval: 5000, // Refetch every 5 seconds
    staleTime: 0, // Consider data always stale
  });

  // Log whenever tasks data changes
  React.useEffect(() => {
    console.log("Tasks data updated:", tasks);
  }, [tasks]);

  // Add optimistic updates
  const optimisticRemoveTask = (taskId: string, type: TaskType) => {
    queryClient.setQueryData<TasksData>(["activeTasks", userId], (old) => {
      if (!old) return old;
      const key = `${type}Tasks` as keyof TasksData;

      // For routine tasks, only remove if all participants completed
      if (type === "routine") {
        return {
          ...old,
          [key]: old[key]
            .map((task: RoutineTaskWithMeta) => {
              if (task.id === taskId) {
                const today = new Date().toISOString().split("T")[0];
                const todayCompletions = task.completions?.[today] || [];
                const allParticipants = task.participants || [];

                // Only remove if all participants completed
                if (todayCompletions.length >= allParticipants.length) {
                  return null;
                }
                return task;
              }
              return task;
            })
            .filter(Boolean),
        };
      }

      // For other task types, remove as before
      return {
        ...old,
        [key]: old[key].filter((task) => task.id !== taskId),
      };
    });
  };

  const completeMutation = useMutation({
    mutationFn: async ({
      taskId,
      type,
    }: {
      taskId: string;
      type: TaskType;
    }) => {
      if (!userId) throw new Error("No user ID provided");

      try {
        if (type === "routine") {
          // Get routineId from the task
          const task = tasks.routineTasks.find((t) => t.id === taskId);
          if (!task?.routineId) {
            throw new Error("Routine ID not found for task");
          }
          await routineService.completeRoutineTask(
            userId,
            taskId,
            task.routineId
          );
        } else if (type === "habit") {
          await habitService.completeHabitTask(userId, taskId);
        } else {
          await taskService.completeTask(taskId, userId);
        }
      } catch (error) {
        console.error("Error completing task:", error);
        throw error;
      }
    },
    onMutate: async ({ taskId, type }) => {
      console.log("Starting mutation:", { taskId, type });
      await queryClient.cancelQueries({ queryKey: ["activeTasks", userId] });
      const previousTasks = queryClient.getQueryData<TasksData>([
        "activeTasks",
        userId,
      ]);

      // Handle optimistic updates based on task type
      if (type === "routine") {
        // For routine tasks, update completion status but don't remove
        queryClient.setQueryData<TasksData>(["activeTasks", userId], (old) => {
          if (!old) return old;
          const today = new Date().toISOString().split("T")[0];

          return {
            ...old,
            routineTasks: old.routineTasks.map((task) => {
              if (task.id === taskId) {
                const newTodayCompletions = [
                  ...task.todayCompletions,
                  {
                    completedBy: userId,
                    completedAt: new Date().getTime(),
                  },
                ];

                return {
                  ...task,
                  isCompleted: true,
                  todayCompletions: newTodayCompletions,
                  completions: {
                    ...task.completions,
                    [today]: newTodayCompletions,
                  },
                };
              }
              return task;
            }),
          };
        });
      } else {
        // For other task types, remove from list as before
        optimisticRemoveTask(taskId, type);
      }

      return { previousTasks };
    },
    onError: (error, variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(
          ["activeTasks", userId],
          context.previousTasks
        );
      }
    },
    onSettled: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["activeTasks", userId] });
      queryClient.invalidateQueries({ queryKey: ["userData", userId] });
      queryClient.invalidateQueries({ queryKey: ["routines", userId] });
    },
    onSuccess: () => {
      // Invalidate relevant queries to force refetch
      queryClient.invalidateQueries({ queryKey: ["activeTasks", userId] });
      queryClient.invalidateQueries({ queryKey: ["routines", userId] });
    },
  });

  return {
    tasks,
    isLoading,
    error,
    completeTask: completeMutation.mutate,
  };
}
