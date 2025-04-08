import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userService } from "@/backend/services/userService";
import { taskService } from "@/backend/services/taskService";
import { challengeService } from "@/backend/services/challengeService";
import { habitService } from "@/backend/services/habitService";
import { routineService } from "@/backend/services/routineServices";
import { TaskType } from "@/backend/types/Task";
import React from "react";
import { Alert } from "react-native";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/backend/config/firebase";
import {
  ChallengeTask,
  ChallengeParticipation,
} from "@/backend/types/Challenge";
import { levelService } from "@/backend/services/levelService";
import { UserData } from "@/backend/types/UserData";
import { RoutineTaskWithMeta } from "@/backend/types/Routine";
import Toast from "react-native-toast-message";
import { Timestamp } from "firebase/firestore";

interface TasksData {
  normalTasks: any[];
  routineTasks: any[];
  habitTasks: any[];
  challengeTasks: ChallengeTask[];
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

      // Get user's active tasks
      const userDoc = await getDoc(doc(db, "users", userId));
      const userData = userDoc.data() as UserData;
      const activeTaskIds = userData?.activeTasks || [];

      // Fetch normal tasks
      const normalTasks = await taskService.getTaskDetails(activeTaskIds);

      // Fetch routine tasks
      const routineTasks = await routineService.getActiveRoutineTasks(userId);

      // Fetch habit tasks
      const habitTasks = await habitService.getTodaysHabitTasks(userId);

      // Fetch challenge tasks from userChallenges subcollection
      const userChallengesRef = collection(
        db,
        "users",
        userId,
        "userChallenges"
      );
      const activeChallengesQuery = query(
        userChallengesRef,
        where("active", "==", true)
      );
      const activeChallengesSnapshot = await getDocs(activeChallengesQuery);

      const challengeTasks = await Promise.all(
        activeChallengesSnapshot.docs.map(async (doc) => {
          const participation = doc.data() as ChallengeParticipation;
          return challengeService.getUserChallengeTasks(userId, doc.id);
        })
      ).then((tasks) => tasks.flat());

      return {
        normalTasks,
        routineTasks,
        habitTasks,
        challengeTasks,
      };
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 1, // Consider data fresh for 1 minute
    gcTime: 1000 * 60 * 5, // Keep in cache for 5 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
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
          routineTasks: old.routineTasks
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

      // For challenge tasks
      if (type === "challenge") {
        return {
          ...old,
          challengeTasks: old.challengeTasks.filter(
            (task: ChallengeTask) => task.id !== taskId
          ),
        };
      }

      // For other task types
      return {
        ...old,
        [key]: old[key].filter((task: any) => task.id !== taskId),
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
        } else if (type === "challenge") {
          // Get challenge task details
          const task = tasks.challengeTasks.find((t) => t.id === taskId);
          if (!task?.challengeId) {
            throw new Error("Challenge ID not found for task");
          }
          await challengeService.completeChallengeTask(
            userId,
            taskId,
            task.challengeId,
            task
          );
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
      } else if (type === "challenge") {
        // For challenge tasks, update completion status but don't remove
        queryClient.setQueryData<TasksData>(["activeTasks", userId], (old) => {
          if (!old) return old;

          return {
            ...old,
            challengeTasks: old.challengeTasks.map((task) => {
              if (task.id === taskId) {
                return {
                  ...task,
                  isCompleted: true,
                  lastCompleted: Timestamp.now(),
                };
              }
              return task;
            }),
          };
        });
      } else {
        // For other task types, remove from list
        queryClient.setQueryData<TasksData>(["activeTasks", userId], (old) => {
          if (!old) return old;
          return {
            ...old,
            normalTasks: old.normalTasks.filter((t) => t.id !== taskId),
            habitTasks: old.habitTasks.filter((t) => t.id !== taskId),
          };
        });
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
      queryClient.invalidateQueries({ queryKey: ["challenges", userId] });
      queryClient.invalidateQueries({ queryKey: ["challengeTasks", userId] });
    },
    onSuccess: () => {
      // Invalidate relevant queries to force refetch
      queryClient.invalidateQueries({ queryKey: ["activeTasks", userId] });
      queryClient.invalidateQueries({ queryKey: ["routines", userId] });
      queryClient.invalidateQueries({ queryKey: ["challenges", userId] });
      queryClient.invalidateQueries({ queryKey: ["challengeTasks", userId] });
    },
  });

  return {
    tasks,
    isLoading,
    error,
    completeTask: completeMutation.mutate,
  };
}
