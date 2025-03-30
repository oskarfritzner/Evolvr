import type Task from "@/backend/types/Task";

export interface AddTaskProps {
  visible: boolean;
  onClose: () => void;
  type?: "habit" | "routine" | "task";
  onTaskAdded?: (task?: Task) => void;
}

export interface TaskListProps {
  tasks: Task[];
  onTaskSelect: (task: Task) => void;
  colors: any;
}

export interface TaskFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: string | null;
  onCategorySelect: (category: string | null) => void;
  colors: any;
}

export interface TaskItemProps {
  task: Task;
  onSelect: (task: Task) => void;
  colors: any;
}

export interface CreateTaskButtonProps {
  onPress: () => void;
  colors: any;
}
