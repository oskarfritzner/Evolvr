import React, { createContext, useContext, useState } from "react";
import { View } from "react-native";
import type { RoutineTask } from "@/backend/types/Routine";

interface RoutineContextType {
  currentRoutine: {
    name: string;
    description: string;
    tasks: RoutineTask[];
  };
  addTaskToRoutine: (task: RoutineTask) => void;
  updateRoutineName: (name: string) => void;
  updateRoutineDescription: (description: string) => void;
  updateRoutineTasks: (tasks: RoutineTask[]) => void;
  clearRoutine: () => void;
}

const RoutineContext = createContext<RoutineContextType | undefined>(undefined);

export function RoutineProvider({ children }: { children: React.ReactNode }) {
  const [currentRoutine, setCurrentRoutine] = useState({
    name: "",
    description: "",
    tasks: [] as RoutineTask[],
  });

  const addTaskToRoutine = (task: RoutineTask) => {
    if (currentRoutine.tasks.some((t) => t.id === task.id)) {
      throw new Error("Task is already in the routine");
    }

    setCurrentRoutine((prev) => ({
      ...prev,
      tasks: [...prev.tasks, task],
    }));
  };

  const updateRoutineName = (name: string) => {
    setCurrentRoutine((prev) => ({ ...prev, name }));
  };

  const updateRoutineDescription = (description: string) => {
    setCurrentRoutine((prev) => ({ ...prev, description }));
  };

  const updateRoutineTasks = (tasks: RoutineTask[]) => {
    setCurrentRoutine((prev) => ({ ...prev, tasks }));
  };

  const clearRoutine = () => {
    setCurrentRoutine({
      name: "",
      description: "",
      tasks: [],
    });
  };

  const value = {
    currentRoutine,
    addTaskToRoutine,
    updateRoutineName,
    updateRoutineDescription,
    updateRoutineTasks,
    clearRoutine,
  };

  return (
    <React.Fragment>
      <RoutineContext.Provider value={value}>
        {children}
      </RoutineContext.Provider>
    </React.Fragment>
  );
}

export const useRoutine = () => {
  const context = useContext(RoutineContext);
  if (context === undefined) {
    throw new Error("useRoutine must be used within a RoutineProvider");
  }
  return context;
};
