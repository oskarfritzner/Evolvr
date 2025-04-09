import React, { createContext, useContext, useMemo, useCallback } from 'react';
import type Task from '@/backend/types/Task';
import type { RoutineTaskWithMeta } from '@/backend/types/Routine';
import type { ChallengeTask } from '@/backend/types/Challenge';
import { taskService } from '@/backend/services/taskService';
import { routineService } from '@/backend/services/routineServices';
import { habitService } from '@/backend/services/habitService';
import { challengeService } from '@/backend/services/challengeService';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import { userService } from '@/backend/services/userService';
import { useUserData } from '@/hooks/queries/useUserData';
import type { UserData } from '@/backend/types/UserData';
import type { Challenge } from '@/backend/types/Challenge';

interface TaskContextType {
  activeTasks: Task[];
  routineTasks: RoutineTaskWithMeta[];
  habitTasks: Task[];
  challengeTasks: ChallengeTask[];
  isLoading: boolean;
  removeTask: (taskId: string, type: 'normal' | 'routine' | 'habit' | 'challenge') => void;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const { user, isInitialized } = useAuth();
  
  // Memoize user ID to prevent unnecessary re-renders
  const userId = useMemo(() => user?.uid, [user?.uid]);
  
  // Enable queries only when we have a valid user ID AND auth is initialized
  const shouldEnableQueries = useMemo(() => !!userId && isInitialized, [userId, isInitialized]);
  
  // Fetch user data first
  const { data: userData, isLoading: userDataLoading } = useUserData(shouldEnableQueries ? userId : undefined);
  
  // Memoize active task IDs to prevent unnecessary re-renders
  const activeTaskIds = useMemo(() => userData?.activeTasks || [], [userData?.activeTasks]);
  
  // Only enable subsequent queries when user data is loaded
  const shouldEnableTaskQueries = useMemo(() => 
    shouldEnableQueries && !!userData, 
    [shouldEnableQueries, userData]
  );

  // Fetch active tasks
  const { data: activeTasks = [], isLoading: activeTasksLoading } = useQuery({
    queryKey: ['activeTasks', userId, activeTaskIds.length],
    queryFn: () => taskService.getTasksByIds(activeTaskIds),
    enabled: shouldEnableTaskQueries && activeTaskIds.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
  });

  // Fetch routine tasks
  const { data: routineTasks = [], isLoading: routineTasksLoading } = useQuery({
    queryKey: ['routineTasks', userId],
    queryFn: () => routineService.getTodaysRoutineTasks(userId!),
    enabled: shouldEnableTaskQueries,
    staleTime: 1000 * 60 * 5, // 5 minutes 
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
  });

  // Fetch habit tasks
  const { data: habitTasks = [], isLoading: habitTasksLoading } = useQuery({
    queryKey: ['habitTasks', userId],
    queryFn: () => habitService.getTodaysHabitTasks(userId!),
    enabled: shouldEnableTaskQueries,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
  });

  // Determine if user has challenges
  const hasChallenges = useMemo(() => 
    !!(userData?.challenges && userData.challenges.length > 0),
    [userData?.challenges]
  );

  // Fetch challenge tasks
  const { data: challengeTasks = [], isLoading: challengeTasksLoading } = useQuery({
    queryKey: ['challengeTasks', userId, hasChallenges],
    queryFn: async () => {
      if (!userId || !userData?.challenges || !hasChallenges) return [];
      const activeChallenges = userData.challenges;
      const allChallengeTasks = await Promise.all(
        activeChallenges.map((challenge: Challenge) => 
          challengeService.getUserChallengeTasks(userId, challenge.id)
        )
      );
      return allChallengeTasks.flat();
    },
    enabled: shouldEnableTaskQueries && hasChallenges,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
  });

  // Memoize the remove task function
  const removeTask = useCallback(async (taskId: string, type: 'normal' | 'routine' | 'habit' | 'challenge') => {
    if (!userId) return;
    
    try {
      switch (type) {
        case 'normal':
          await taskService.deleteTask(userId, taskId);
          break;
        case 'routine':
          await routineService.deleteRoutine(userId, taskId);
          break;
        case 'habit':
          await habitService.deleteHabit(userId, taskId);
          break;
        case 'challenge':
          // Get the challenge task details from the active tasks
          const challengeTask = challengeTasks.find(t => t.id === taskId);
          if (!challengeTask) {
            throw new Error('Challenge task not found');
          }
          await challengeService.completeChallengeTask(
            userId,
            taskId,
            challengeTask.challengeId,
            challengeTask
          );
          break;
      }
    } catch (error) {
      console.error(`Error removing ${type} task:`, error);
      throw error;
    }
  }, [userId, challengeTasks]);

  // Calculate overall loading state
  const isLoading = useMemo(() => 
    userDataLoading || 
    (shouldEnableTaskQueries && (
      activeTasksLoading || 
      routineTasksLoading || 
      habitTasksLoading || 
      (hasChallenges && challengeTasksLoading)
    )),
    [
      userDataLoading, 
      shouldEnableTaskQueries,
      activeTasksLoading, 
      routineTasksLoading, 
      habitTasksLoading, 
      hasChallenges,
      challengeTasksLoading
    ]
  );

  // Memoize the context value
  const contextValue = useMemo(() => ({
    activeTasks,
    routineTasks,
    habitTasks,
    challengeTasks,
    isLoading,
    removeTask,
  }), [activeTasks, routineTasks, habitTasks, challengeTasks, isLoading, removeTask]);

  return (
    <TaskContext.Provider value={contextValue}>
      {children}
    </TaskContext.Provider>
  );
}

export function useTasks() {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
} 