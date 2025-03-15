import { db } from "@/backend/config/firebase";
import {
  doc,
  updateDoc,
  getDoc,
  setDoc,
  arrayUnion,
  collection,
  getDocs,
  arrayRemove,
  increment,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import {
  Challenge,
  UserChallenge,
  ChallengeMeta,
  UserChallengeProgress,
  ChallengeTask,
} from "@/backend/types/Challenge";
import { taskService } from "./taskService";
import Toast from "react-native-toast-message";
import { TaskStatus } from "../types/Task";
import { Timestamp } from "firebase/firestore";
import { levelService } from "./levelService";
import { UserData } from "../types/UserData";
import type Task from "../types/Task";
import type { UserChallengeProgress as UserChallengeProgressType } from "../types/Challenge";

class ChallengeService {
  async getAllChallenges(): Promise<Challenge[]> {
    try {
      const challengesRef = collection(db, "challenges");
      const challengesSnapshot = await getDocs(challengesRef);

      return challengesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Challenge[];
    } catch (error) {
      console.error("Error fetching challenges:", error);
      throw error;
    }
  }

  async joinChallenge(userId: string, challengeId: string): Promise<void> {
    try {
      const userRef = doc(db, "users", userId);
      const challengeRef = doc(db, "challenges", challengeId);

      const [userDoc, challengeDoc] = await Promise.all([
        getDoc(userRef),
        getDoc(challengeRef),
      ]);

      if (!userDoc.exists() || !challengeDoc.exists()) {
        throw new Error("User or Challenge not found");
      }

      const challenge = challengeDoc.data() as Challenge;
      const userChallenge: UserChallenge = {
        ...challenge,
        id: challengeId,
        startDate: Date.now(),
        active: true,
        progress: 0,
        taskProgress: [],
        taskCompletions: {},
        attempts: 1,
      };

      // Reset completed tasks for today for this challenge
      const userData = userDoc.data() as UserData;
      const today = new Date().toISOString().split("T")[0];
      const updatedCompletedTasks = (userData.completedTasks || []).filter(
        (task: any) =>
          !(
            task.type === "challenge" &&
            task.challengeId === challengeId &&
            task.completedAt.toDate().toISOString().split("T")[0] === today
          )
      );

      await updateDoc(userRef, {
        challenges: arrayUnion(userChallenge),
        completedTasks: updatedCompletedTasks,
      });
    } catch (error) {
      console.error("Error joining challenge:", error);
      throw error;
    }
  }

  async getTodaysChallengeTasks(userId: string): Promise<any[]> {
    try {
      const userDoc = await getDoc(doc(db, "users", userId));
      const userData = userDoc.data();
      if (!userData?.challenges) return [];

      const today = new Date();
      const dateString = today.toISOString().split("T")[0];
      const todayStart = new Date(dateString);
      const todayEnd = new Date(dateString);
      todayEnd.setDate(todayEnd.getDate() + 1);

      // Get today's completed tasks
      const todayCompletedTasks = (userData.completedTasks || []).filter(
        (completion: any) => {
          const completedAt = completion.completedAt?.toDate();
          return (
            completion.type === "challenge" &&
            completedAt >= todayStart &&
            completedAt < todayEnd
          );
        }
      );

      let challengeTasks: any[] = [];

      for (const challenge of userData.challenges) {
        if (!challenge.active) continue;

        for (const taskMeta of challenge.tasks) {
          // Check if task was completed today
          const isCompletedInHistory = todayCompletedTasks.some(
            (completion: any) =>
              completion.taskId === taskMeta.taskId &&
              completion.challengeId === challenge.id
          );

          // If not completed today, get the task details
          if (!isCompletedInHistory) {
            const taskDoc = await getDoc(doc(db, "tasks", taskMeta.taskId));
            if (taskDoc.exists()) {
              challengeTasks.push({
                ...taskDoc.data(),
                id: taskDoc.id,
                challengeId: challenge.id,
                challengeTitle: challenge.title,
                type: "challenge",
                challengeMeta: {
                  taskId: taskMeta.taskId,
                  frequency: taskMeta.frequency,
                },
                challengeParticipants: challenge.participants,
              });
            }
          }
        }
      }

      return challengeTasks;
    } catch (error) {
      console.error("Error getting today's challenge tasks:", error);
      return [];
    }
  }

  async initializeChallenge(challenge: Challenge): Promise<void> {
    try {
      const challengeRef = doc(db, "challenges", challenge.id);
      await setDoc(challengeRef, challenge);
    } catch (error) {
      console.error("Error initializing challenge:", error);
      throw error;
    }
  }

  async getChallengeById(challengeId: string): Promise<Challenge | null> {
    try {
      const challengeRef = doc(db, "challenges", challengeId);
      const challengeDoc = await getDoc(challengeRef);

      if (!challengeDoc.exists()) {
        return null;
      }

      return { id: challengeDoc.id, ...challengeDoc.data() } as Challenge;
    } catch (error) {
      console.error("Error fetching challenge:", error);
      throw error;
    }
  }

  async updateChallengeProgress(
    userId: string,
    challengeId: string
  ): Promise<void> {
    try {
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        throw new Error("User not found");
      }

      const userData = userDoc.data();
      const challenges = userData.challenges || [];
      const challengeIndex = challenges.findIndex(
        (c: UserChallenge) => c.id === challengeId
      );

      if (challengeIndex === -1) {
        throw new Error("Challenge not found");
      }

      // Calculate progress based on completed tasks
      const challenge = challenges[challengeIndex];
      const totalDays = challenge.duration;
      const startDate = challenge.startDate;
      const currentDate = Date.now();
      const daysPassed = Math.floor(
        (currentDate - startDate) / (24 * 60 * 60 * 1000)
      );
      const progress = Math.min(
        Math.round((daysPassed / totalDays) * 100),
        100
      );

      challenges[challengeIndex] = {
        ...challenge,
        progress,
      };

      await updateDoc(userRef, { challenges });
    } catch (error) {
      console.error("Error updating challenge progress:", error);
      throw error;
    }
  }

  async initialize75HardChallenge(): Promise<void> {
    try {
      const challenge: Challenge = {
        id: "75-hard",
        title: "75 Hard Challenge",
        description:
          "A transformative mental toughness program. Complete all daily tasks for 75 days straight. If you miss a task, start over from day 1.",
        duration: 75,
        tasks: [
          {
            taskId: "1b7fQXKKglxSEvFPdKRN", // Follow a strict diet
            frequency: "daily",
          },
          {
            taskId: "TnpxkpOelyXiebDDrXwH", // First workout
            frequency: "daily",
          },
          {
            taskId: "B5C488pijsj7HLjTGawq", // Outdoor workout
            frequency: "daily",
          },
          {
            taskId: "zqqw5u4Hu6vYLBFYr6GP", // Drink water
            frequency: "daily",
          },
          {
            taskId: "TnpxkpOelyXiebDDrXwH", // Read 10 pages
            frequency: "daily",
          },
          {
            taskId: "gey9mfEii6qKlPebPbY9", // Take progress photo
            frequency: "daily",
          },
        ],
        imageUrl: "https://example.com/75-hard-image.jpg",
        createdAt: Date.now(),
        category: ["mental", "physical"],
        difficulty: "hard",
        participants: [],
      };

      await this.initializeChallenge(challenge);
      console.log("Successfully initialized 75 Hard Challenge");
    } catch (error) {
      console.error("Error initializing 75 Hard Challenge:", error);
      throw error;
    }
  }

  async checkChallengeCompletion(
    userId: string,
    challengeId: string
  ): Promise<boolean> {
    try {
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data() as UserData;

      const challengeRef = doc(db, "challenges", challengeId);
      const challengeDoc = await getDoc(challengeRef);
      const challenge = challengeDoc.data() as Challenge;

      if (!challenge || !userData) return false;

      const userChallenge = userData.challenges?.find(
        (c) => c.id === challengeId
      );
      if (!userChallenge) return false;

      // Check if all tasks in the challenge have been completed
      const allTasksCompleted = challenge.tasks.every((challengeTask) => {
        const taskProgress = userChallenge.taskProgress?.find(
          (p) => p.taskId === challengeTask.taskId
        );
        if (!taskProgress) return false;

        // For daily tasks, check if completed enough times
        if (challengeTask.frequency === "daily") {
          return taskProgress.completedDates.length >= challenge.duration;
        }

        // For weekly tasks, check if completed at least once per week
        if (challengeTask.frequency === "weekly") {
          const weeksInChallenge = Math.ceil(challenge.duration / 7);
          return taskProgress.completedDates.length >= weeksInChallenge;
        }

        return false;
      });

      return allTasksCompleted;
    } catch (error) {
      console.error("Error checking challenge completion:", error);
      return false;
    }
  }

  async completeTask(
    userId: string,
    challengeId: string,
    taskId: string
  ): Promise<void> {
    try {
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data() as UserData;

      // Get the challenge data
      const challengeRef = doc(db, "challenges", challengeId);
      const challengeDoc = await getDoc(challengeRef);
      const challenge = challengeDoc.data() as Challenge;

      if (!challenge) {
        throw new Error("Challenge not found");
      }

      // Find the user's challenge progress
      const userChallenge = userData.challenges?.find(
        (c) => c.id === challengeId
      );
      if (!userChallenge) {
        throw new Error("User challenge not found");
      }

      // Update task completion in user's challenge progress
      const now = Date.now();
      const taskProgress = userChallenge.taskProgress || [];
      const existingProgress = taskProgress.find((t) => t.taskId === taskId);

      if (existingProgress) {
        existingProgress.completedDates.push(now);
        existingProgress.lastCompleted = now;
        existingProgress.streakCount++;
      } else {
        taskProgress.push({
          taskId,
          completedDates: [now],
          streakCount: 1,
          lastCompleted: now,
        });
      }

      // Calculate if the challenge is fully completed
      const isFullyCompleted = await this.checkChallengeCompletion(
        userId,
        challengeId
      );

      // Get the current stats
      const stats = userData.stats || {};
      const challengesCompleted = stats.challengesCompleted || [];

      // Only update challengesCompleted if the challenge is fully completed
      // and hasn't been marked as completed before
      const updatedChallengesCompleted =
        isFullyCompleted && !challengesCompleted.includes(challengeId)
          ? [...challengesCompleted, challengeId]
          : challengesCompleted;

      // Update user document
      await updateDoc(userRef, {
        // Update challenge progress
        challenges: userData.challenges.map((c) =>
          c.id === challengeId ? { ...c, taskProgress } : c
        ),
        // Update completed tasks
        completedTasks: arrayUnion({
          taskId,
          completedAt: Timestamp.now(),
          type: "challenge",
          challengeId,
        }),
        // Update stats
        stats: {
          ...stats,
          challengesCompleted: updatedChallengesCompleted,
          totalTasksCompleted: (stats.totalTasksCompleted || 0) + 1,
        },
      });

      // Log for debugging
      console.log("Updated challenge stats:", {
        userId,
        challengeId,
        isFullyCompleted,
        completedChallenges: updatedChallengesCompleted.length,
        wasAlreadyCompleted: challengesCompleted.includes(challengeId),
        taskProgress,
      });
    } catch (error) {
      console.error("Error completing challenge task:", error);
      throw error;
    }
  }

  async quitChallenge(userId: string, challengeId: string): Promise<void> {
    try {
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        throw new Error("User not found");
      }

      const userData = userDoc.data();
      const challenges = userData.challenges || [];

      // Find and remove the challenge from challenges array
      const updatedChallenges = challenges.filter(
        (c: UserChallenge) => c.id !== challengeId
      );

      // Add to completedChallenges array
      await updateDoc(userRef, {
        challenges: updatedChallenges,
        "stats.challengesCompleted": arrayUnion(challengeId),
      });

      // Remove user from challenge participants
      const challengeRef = doc(db, "challenges", challengeId);
      await updateDoc(challengeRef, {
        participants: arrayRemove(userId),
      });
    } catch (error) {
      console.error("Error quitting challenge:", error);
      throw error;
    }
  }

  async completeChallenge(userId: string, challengeId: string): Promise<void> {
    try {
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        throw new Error("User not found");
      }

      const userData = userDoc.data();
      const challenges = userData.challenges || [];

      // Remove from active challenges
      const updatedChallenges = challenges.filter(
        (c: UserChallenge) => c.id !== challengeId
      );

      // Update user document
      await updateDoc(userRef, {
        challenges: updatedChallenges,
        "stats.challengesCompleted": arrayUnion(challengeId),
        "stats.totalTasksCompleted": increment(1),
      });

      // Add completion timestamp
      await updateDoc(doc(db, "challenges", challengeId), {
        completions: arrayUnion({
          userId,
          completedAt: Date.now(),
        }),
      });
    } catch (error) {
      console.error("Error completing challenge:", error);
      throw error;
    }
  }

  async resetChallengeProgress(
    userId: string,
    challengeId: string
  ): Promise<void> {
    try {
      const userRef = doc(db, "users", userId);
      const challengeRef = doc(db, "challenges", challengeId);

      const [userDoc, challengeDoc] = await Promise.all([
        getDoc(userRef),
        getDoc(challengeRef),
      ]);

      if (!userDoc.exists() || !challengeDoc.exists()) {
        throw new Error("User or Challenge not found");
      }

      const userData = userDoc.data();
      const challenge = challengeDoc.data() as Challenge;
      const userChallenge: UserChallenge = {
        ...challenge,
        id: challengeId,
        startDate: Date.now(),
        active: true,
        progress: 0,
        taskProgress: [],
        taskCompletions: {},
        attempts:
          (userData.challenges.find((c: UserChallenge) => c.id === challengeId)
            ?.attempts || 0) + 1,
      };

      const challenges = userData.challenges || [];

      // Replace existing challenge with reset version
      const updatedChallenges = challenges.map((c: UserChallenge) =>
        c.id === challengeId ? userChallenge : c
      );

      await updateDoc(userRef, {
        challenges: updatedChallenges,
      });
    } catch (error) {
      console.error("Error resetting challenge progress:", error);
      throw error;
    }
  }

  async checkFailedChallenges(userId: string): Promise<UserChallenge[]> {
    try {
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) return [];

      const userData = userDoc.data();
      const challenges = userData.challenges || [];
      const now = Date.now();
      const oneDayMs = 24 * 60 * 60 * 1000;

      // Find challenges where tasks weren't completed yesterday
      return challenges.filter((challenge: UserChallenge) => {
        const lastTask = challenge.taskProgress.find(
          (task: UserChallengeProgressType) =>
            task.lastCompleted && now - task.lastCompleted > oneDayMs
        );
        return lastTask !== undefined;
      });
    } catch (error) {
      console.error("Error checking failed challenges:", error);
      return [];
    }
  }

  async getUserChallengeTasks(
    userId: string,
    challengeId: string
  ): Promise<ChallengeTask[]> {
    try {
      const userRef = doc(db, "users", userId);
      const challengeRef = doc(db, "challenges", challengeId);

      const [userDoc, challengeDoc] = await Promise.all([
        getDoc(userRef),
        getDoc(challengeRef),
      ]);

      if (!userDoc.exists() || !challengeDoc.exists()) return [];

      const userData = userDoc.data() as UserData;
      const challenge = challengeDoc.data() as Challenge;

      // Get today's date for completion check
      const today = new Date().toISOString().split("T")[0];

      // Get today's completions for this challenge
      const todayCompletions =
        userData.completedTasks?.filter(
          (task: any) =>
            task.type === "challenge" &&
            task.challengeId === challengeId &&
            task.completedAt.toDate().toISOString().split("T")[0] === today
        ) || [];

      // Get tasks that haven't been completed today
      const tasks = await Promise.all(
        challenge.tasks
          .filter(
            (taskMeta) =>
              !todayCompletions.some((t) => t.taskId === taskMeta.taskId)
          )
          .map(async (taskMeta) => {
            const taskDoc = await getDoc(doc(db, "tasks", taskMeta.taskId));
            if (!taskDoc.exists()) return null;

            return {
              ...taskDoc.data(),
              id: taskMeta.taskId,
              type: "challenge",
              challengeId,
              challengeTitle: challenge.title,
              challengeMeta: taskMeta,
              challengeParticipants: challenge.participants,
            } as ChallengeTask;
          })
      );

      return tasks.filter((task): task is ChallengeTask => task !== null);
    } catch (error) {
      console.error("Error getting challenge tasks:", error);
      return [];
    }
  }
}

export const challengeService = new ChallengeService();
