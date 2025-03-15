import { Challenge } from "@/backend/types/Challenge";

export const SEVENTY_FIVE_HARD: Challenge = {
  id: "75-hard",
  title: "75 Hard Challenge",
  description: `The 75 Hard Challenge is a transformative mental toughness program. It's not just about physical transformation - it's about developing discipline, commitment, and mental resilience. For 75 days straight, you must complete all tasks with zero compromises. If you miss any task, you start over from Day 1.`,
  duration: 75,
  category: ["mental"],
  difficulty: "hard",
  imageUrl: "/images/challenges/75-hard.jpg", // You'll need to add this image
  createdAt: Date.now(),
  participants: [],
  tasks: [
    {
      taskId: "task_diet_strict",
      frequency: "daily",
    },
    {
      taskId: "task_workout_45min",
      frequency: "daily",
    },
    {
      taskId: "task_outdoor_workout",
      frequency: "daily",
    },
    {
      taskId: "task_water_gallon",
      frequency: "daily",
    },
    {
      taskId: "task_reading_10pages",
      frequency: "daily",
    },
    {
      taskId: "task_progress_photo",
      frequency: "daily",
    },
  ],
};
