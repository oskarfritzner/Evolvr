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

  const { data: activeTasks = [], isLoading: activeTasksLoading } = useQuery({
    queryKey: ['activeTasks', user?.uid],
    queryFn: () => taskService.getTasksByIds(user?.userData?.activeTasks || []),
    enabled: !!user?.uid,
  });

  const { data: routineTasks = [], isLoading: routineTasksLoading } = useQuery({
    queryKey: ['routineTasks', user?.uid],
    queryFn: () => routineService.getTodaysRoutineTasks(user!.uid),
    enabled: !!user?.uid,
  });

  const { data: habitTasks = [], isLoading: habitTasksLoading } = useQuery({
    queryKey: ['habitTasks', user?.uid],
    queryFn: () => habitService.getTodaysHabitTasks(user!.uid),
    enabled: !!user?.uid,
  });

const { data: challengeTasks = [], isLoading: challengeTasksLoading } = useQuery({
  queryKey: ['challengeTasks', user?.uid],
  queryFn: async () => {
    if (!user?.uid) return [];

    // Get user data with challenges
    const userData = user.userData || await userService.getUserData(user.uid);
    const activeChallenges = userData?.challenges || [];

    // Get tasks for all active challenges
    const allChallengeTasks = await Promise.all(
      activeChallenges
        .map(challenge => 
          challengeService.getUserChallengeTasks(user.uid, challenge.id)
        )
    );

    // Flatten and return all challenge tasks
    return allChallengeTasks.flat();
  },
  enabled: !!user?.uid,
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
      isLoading: activeTasksLoading || routineTasksLoading || habitTasksLoading || challengeTasksLoading,
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