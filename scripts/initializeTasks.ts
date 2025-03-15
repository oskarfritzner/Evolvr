import { taskService } from "@/backend/services/taskService";
import Task from "@/backend/types/Task";
import { db } from "@/backend/config/firebase";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";

const SEVENTY_FIVE_HARD_TASKS: Partial<Task>[] = [
  {
    title: "Follow a strict diet",
    description: "Follow a strict diet with zero cheat meals or alcohol",
    categories: ["physical", "mental"],
    categoryXp: {
      physical: 40,
      mental: 40,
    },
    createdBy: "Evolvr",
    createdAt: new Date(),
  },
  {
    title: "First workout (45 minutes)",
    description: "Complete your first 45-minute workout of the day",
    categories: ["physical", "mental"],
    categoryXp: {
      physical: 80,
      mental: 20,
    },
    createdBy: "Evolvr",
    createdAt: new Date(),
  },
  {
    title: "Outdoor workout (45 minutes)",
    description: "Complete a 45-minute workout outdoors, regardless of weather",
    categories: ["physical", "mental"],
    categoryXp: {
      physical: 80,
      mental: 40,
    },
    createdBy: "Evolvr",
    createdAt: new Date(),
  },
  {
    title: "Drink 1 gallon of water",
    description: "Drink 1 gallon (3.7 liters) of water throughout the day",
    categories: ["physical", "mental"],
    categoryXp: {
      physical: 40,
      mental: 10,
    },
    createdBy: "Evolvr",
    createdAt: new Date(),
  },
  {
    title: "Read 10 pages",
    description: "Read 10 pages of a non-fiction book (audiobooks don't count)",
    categories: ["intellectual", "mental"],
    categoryXp: {
      intellectual: 50,
      mental: 20,
    },
    createdBy: "Evolvr",
    createdAt: new Date(),
  },
  {
    title: "Take progress photo",
    description: "Take a progress photo to document your journey",
    categories: ["mental"],
    categoryXp: {
      mental: 20,
    },
    createdBy: "Evolvr",
    createdAt: new Date(),
  },
];

async function initializeTasks() {
  try {
    for (const taskData of SEVENTY_FIVE_HARD_TASKS) {
      const createdTask = await taskService.createTask(taskData);
      console.log(`Successfully created task: ${taskData.title}`);
    }
    console.log("Successfully initialized all 75 Hard Challenge tasks");
  } catch (error) {
    console.error("Error initializing tasks:", error);
  }
}

// Add this function to help add a task to a user's active tasks
async function addTaskToUser(userId: string, taskId: string) {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      activeTasks: arrayUnion(taskId),
    });
    console.log(`Added task ${taskId} to user ${userId}`);
  } catch (error) {
    console.error("Error adding task to user:", error);
  }
}

// You can call this after creating tasks
// await addTaskToUser("YOUR_USER_ID", "TASK_ID");

async function addTestTask() {
  try {
    // Create a test task
    const taskData: Partial<Task> = {
      title: "Test Task",
      description: "This is a test task",
      categories: ["mental"],
      categoryXp: {
        mental: 20,
      },
      createdBy: "Evolvr",
      createdAt: new Date(),
    };

    const taskId = await taskService.createTask(taskData);
    console.log("Created test task with ID:", taskId);

    // Add it to your user's active tasks
    const userId = "YOUR_USER_ID"; // Replace with your actual user ID
    await addTaskToUser(userId, taskId);

    console.log("Test task added successfully");
  } catch (error) {
    console.error("Error adding test task:", error);
  }
}

// Uncomment to run
// addTestTask();

initializeTasks();
