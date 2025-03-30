import { Habit } from "@/backend/types/Habit";
import type Task from "@/backend/types/Task";

export interface SetHabitProps {
  visible: boolean;
  onClose: () => void;
  onHabitCreated: (habit: Habit) => void;
}

export interface HabitFormProps {
  description: string;
  onDescriptionChange: (text: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  isValid: boolean;
  colors: any;
}

export interface TaskSelectorProps {
  selectedTask: Task | null;
  onTaskSelect: (task: Task) => void;
  onAddTaskPress: () => void;
  colors: any;
}

export interface HabitInfoModalProps {
  visible: boolean;
  onClose: () => void;
  colors: any;
}
