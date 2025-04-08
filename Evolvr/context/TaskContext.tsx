import React, { createContext, useContext } from 'react';
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
  const { user } = useAuth();
  console.log('[TaskContext] Auth state:', {
    hasUser: !!user,
    userId: user?.uid,
    timestamp: new Date().toISOString(),
    stack: new Error().stack
  });

  const { data: userData, isLoading: userDataLoading, error: userDataError } = useUserData(user?.uid);
  
  console.log('[TaskContext] useUserData result:', {
    hasUserData: !!userData,
    userDataLoading,
    userDataError: userDataError ? String(userDataError) : null,
    userId: user?.uid,
    timestamp: new Date().toISOString()
  });

  // Only enable task queries when we have user data and it's not loading
  const shouldEnableQueries = !!user?.uid && !!userData && !userDataLoading;
  
  console.log('[TaskContext] Task queries state:', {
    shouldEnableQueries,
    userId: user?.uid,
    hasUserData: !!userData,
    userDataLoading,
    userDataError: userDataError ? String(userDataError) : null,
    timestamp: new Date().toISOString()
  });

  const { data: activeTasks = [], isLoading: activeTasksLoading, error: activeTasksError } = useQuery({
    queryKey: ['activeTasks', user?.uid],
    queryFn: () => {
      console.log('[TaskContext] Active tasks queryFn executing', {
        userId: user?.uid,
        hasUserData: !!userData,
        timestamp: new Date().toISOString()
      });
      return taskService.getTasksByIds(userData?.activeTasks || []);
    },
    enabled: shouldEnableQueries,
  });

  const { data: routineTasks = [], isLoading: routineTasksLoading } = useQuery({
    queryKey: ['routineTasks', user?.uid],
    queryFn: () => routineService.getTodaysRoutineTasks(user!.uid),
    enabled: shouldEnableQueries,
  });

  const { data: habitTasks = [], isLoading: habitTasksLoading } = useQuery({
    queryKey: ['habitTasks', user?.uid],
    queryFn: () => habitService.getTodaysHabitTasks(user!.uid),
    enabled: shouldEnableQueries,
  });

  const { data: challengeTasks = [], isLoading: challengeTasksLoading } = useQuery({
    queryKey: ['challengeTasks', user?.uid],
    queryFn: async () => {
      const activeChallenges = userData?.challenges || [];
      
      // Get tasks for all active challenges
      const allChallengeTasks = await Promise.all(
        activeChallenges.map((challenge: Challenge) => 
          challengeService.getUserChallengeTasks(user!.uid, challenge.id)
        )
      );

      // Flatten and return all challenge tasks
      return allChallengeTasks.flat();
    },
    enabled: shouldEnableQueries,
  });

  const removeTask = (taskId: string, type: 'normal' | 'routine' | 'habit' | 'challenge') => {
    // Handle task removal logic if needed
  };

  return (
    <TaskContext.Provider value={{
      activeTasks,
      routineTasks,
      habitTasks,
      challengeTasks,
      isLoading: userDataLoading || activeTasksLoading || routineTasksLoading || habitTasksLoading || challengeTasksLoading,
      removeTask,
    }}>
      {children}
    </TaskContext.Provider>
  );
}

export const useTasks = () => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
}; 