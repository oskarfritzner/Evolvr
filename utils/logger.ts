import { Platform } from "react-native";

const isDev = __DEV__;

function truncateObject(obj: any, maxLength = 100): any {
  const str = JSON.stringify(obj);
  if (str.length <= maxLength) return obj;

  return {
    ...obj,
    _truncated: true,
    _originalLength: str.length,
  };
}

function formatTasksData(tasks: any) {
  if (!tasks) return null;

  return {
    counts: {
      challenge: tasks.challengeTasks?.length || 0,
      habit: tasks.habitTasks?.length || 0,
      normal: tasks.normalTasks?.length || 0,
      routine: tasks.routineTasks?.length || 0,
    },
    summary: {
      challenge:
        tasks.challengeTasks?.map((t: any) => ({
          id: t.id,
          title: t.title,
        })) || [],
      habit:
        tasks.habitTasks?.map((t: any) => ({
          id: t.id,
          title: t.title,
        })) || [],
      normal:
        tasks.normalTasks?.map((t: any) => ({
          id: t.id,
          title: t.title,
        })) || [],
      routine:
        tasks.routineTasks?.map((t: any) => ({
          id: t.id,
          title: t.taskName || t.title,
        })) || [],
    },
  };
}

const logger = {
  debug: (...args: any[]) => {
    if (isDev) console.debug(...args);
  },
  log: (...args: any[]) => {
    if (isDev) console.log(...args);
  },
  warn: (...args: any[]) => {
    if (__DEV__) {
      console.warn(...args);
    }
  },
  error: (...args: any[]) => {
    if (__DEV__) {
      console.error(...args);
    }
    // In production, you might want to send errors to a monitoring service
  },
  dev: (...args: any[]) => {
    if (__DEV__) {
      console.log(...args);
    }
  },
  tasks: (message: string, tasksData: any) => {
    if (isDev && Platform.OS !== "web") {
      console.log("[TASKS]", message, formatTasksData(tasksData));
    }
  },
  info: (...args: any[]) => {
    if (__DEV__) {
      console.log(...args);
    }
  },
};

export default logger;
