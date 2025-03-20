import { db } from "@/backend/config/firebase";
import {
  doc,
  updateDoc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  query,
  where,
  writeBatch,
  Timestamp,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import {
  Challenge,
  ChallengeParticipation,
  ChallengeMeta,
  ChallengeTask,
} from "../types/Challenge";
import { taskService } from "./taskService";
import { userService } from "./userService";
import { levelService } from "./levelService";
import logger from "@/utils/logger";

class ChallengeService {
  private challengesCollection = collection(db, "challenges");

  private getUserChallengesCollection(userId: string) {
    return collection(db, "users", userId, "userChallenges");
  }

  async getAllChallenges(): Promise<Challenge[]> {
    try {
      const querySnapshot = await getDocs(this.challengesCollection);
      return querySnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Challenge)
      );
    } catch (error) {
      console.error("Error getting all challenges:", error);
      throw error;
    }
  }

  async getChallengeById(challengeId: string): Promise<Challenge | null> {
    try {
      const challengeDoc = await getDoc(
        doc(this.challengesCollection, challengeId)
      );
      if (!challengeDoc.exists()) {
        return null;
      }
      return { id: challengeDoc.id, ...challengeDoc.data() } as Challenge;
    } catch (error) {
      throw error;
    }
  }

  async getUserChallenges(userId: string): Promise<ChallengeParticipation[]> {
    try {
      const userChallengesRef = this.getUserChallengesCollection(userId);
      const querySnapshot = await getDocs(
        query(userChallengesRef, where("active", "==", true))
      );

      return querySnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as ChallengeParticipation)
      );
    } catch (error) {
      console.error("Error getting user challenges:", error);
      throw error;
    }
  }

  async joinChallenge(userId: string, challengeId: string): Promise<void> {
    try {
      // Get challenge data
      const challengeDoc = await getDoc(
        doc(this.challengesCollection, challengeId)
      );
      if (!challengeDoc.exists()) throw new Error("Challenge not found");

      const challenge = {
        id: challengeDoc.id,
        ...challengeDoc.data(),
      } as Challenge;

      // Get existing participation or create new
      const participationRef = doc(
        this.getUserChallengesCollection(userId),
        challengeId
      );
      const participationDoc = await getDoc(participationRef);
      const now = Timestamp.now();

      // Helper function to remove undefined values from an object
      const removeUndefined = (obj: Record<string, any>) => {
        return Object.entries(obj).reduce((acc, [key, value]) => {
          if (value !== undefined) {
            acc[key] = value;
          }
          return acc;
        }, {} as Record<string, any>);
      };

      // Create challenge data object, filtering out undefined fields
      const challengeData = removeUndefined({
        title: challenge.title,
        description: challenge.description,
        duration: challenge.duration,
        tasks: challenge.tasks,
        imageUrl: challenge.imageUrl,
        category: challenge.category || [],
        difficulty: challenge.difficulty,
      });

      if (participationDoc.exists()) {
        // If participation exists, increment attempt number
        const participation = participationDoc.data() as ChallengeParticipation;
        const newAttemptNumber = (participation.currentAttempt || 0) + 1;

        // If there's an existing attempt, mark its end date
        if (participation.attempts?.[participation.currentAttempt]) {
          participation.attempts[participation.currentAttempt].endDate = now;
        }

        await updateDoc(participationRef, {
          active: true,
          startDate: now,
          progress: 0,
          currentAttempt: newAttemptNumber,
          [`attempts.${newAttemptNumber}`]: {
            startDate: now,
            progress: 0,
            taskCompletions: {},
          },
          challengeData,
        });
      } else {
        // Create new participation with first attempt
        await setDoc(participationRef, {
          id: challengeId,
          active: true,
          startDate: now,
          progress: 0,
          currentAttempt: 1,
          attempts: {
            1: {
              startDate: now,
              progress: 0,
              taskCompletions: {},
            },
          },
          challengeData,
        });
      }
    } catch (error) {
      console.error("Error joining challenge:", error);
      throw error;
    }
  }

  async getUserChallengeTasks(
    userId: string,
    challengeId: string
  ): Promise<ChallengeTask[]> {
    try {
      // Get the user's challenge participation
      const participationDoc = await getDoc(
        doc(db, "users", userId, "userChallenges", challengeId)
      );

      if (!participationDoc.exists() || !participationDoc.data().active) {
        return [];
      }

      const participation = participationDoc.data() as ChallengeParticipation;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get task details for all tasks in the challenge
      const taskIds =
        participation.challengeData?.tasks.map((task) => task.taskId) || [];
      const taskDetails = await taskService.getTasksByIds(taskIds);

      // Create a map of task details for easy lookup
      const taskDetailsMap = taskDetails.reduce((map, task) => {
        map[task.id] = task;
        return map;
      }, {} as Record<string, any>);

      // Get current attempt's task completions
      const currentAttempt = participation.currentAttempt;
      const currentAttemptData = participation.attempts[currentAttempt];

      // Map tasks with their details and check completion status
      const tasks = await Promise.all(
        (participation.challengeData?.tasks || []).map(async (taskMeta) => {
          const taskDetail = taskDetailsMap[taskMeta.taskId];
          if (!taskDetail) return null;

          const completions =
            currentAttemptData.taskCompletions[taskMeta.taskId]?.dates || [];
          const lastCompleted = completions[completions.length - 1];
          const isCompletedToday =
            lastCompleted &&
            new Date(lastCompleted.toDate()).setHours(0, 0, 0, 0) ===
              today.getTime();

          return {
            id: taskMeta.taskId,
            taskId: taskMeta.taskId,
            title: taskDetail.title,
            description: taskDetail.description,
            categoryXp: taskDetail.categoryXp,
            challengeId,
            challengeTitle: participation.challengeData?.title || "",
            frequency: taskMeta.frequency,
            days: taskMeta.days,
            timeOfDay: taskMeta.timeOfDay,
            challengeMeta: taskMeta,
            lastCompleted,
            isCompleted: isCompletedToday,
          } as ChallengeTask;
        })
      );

      // Filter out null values and tasks completed today
      return tasks.filter(
        (task): task is ChallengeTask => task !== null && !task.isCompleted
      );
    } catch (error) {
      console.error("Error getting challenge tasks:", error);
      return [];
    }
  }

  async completeChallengeTask(
    userId: string,
    taskId: string,
    challengeId: string,
    task: ChallengeTask
  ): Promise<void> {
    try {
      const batch = writeBatch(db);
      const now = Timestamp.now();

      // Update challenge participation
      const participationRef = doc(
        this.getUserChallengesCollection(userId),
        challengeId
      );
      const participationDoc = await getDoc(participationRef);

      if (!participationDoc.exists())
        throw new Error("Challenge participation not found");

      const participation = participationDoc.data() as ChallengeParticipation;
      const currentAttempt = participation.currentAttempt;
      const currentAttemptData = participation.attempts[currentAttempt];

      // Update task completions for current attempt
      const updatedTaskCompletions = {
        ...currentAttemptData.taskCompletions,
        [taskId]: {
          dates: [
            ...(currentAttemptData.taskCompletions[taskId]?.dates || []),
            now,
          ],
          lastCompleted: now,
        },
      };

      // Calculate new progress for current attempt
      const totalTasks = participation.challengeData?.tasks.length || 1;
      const completedTasks = Object.keys(updatedTaskCompletions).length;
      const newProgress = (completedTasks / totalTasks) * 100;

      batch.update(participationRef, {
        progress: newProgress,
        [`attempts.${currentAttempt}.progress`]: newProgress,
        [`attempts.${currentAttempt}.taskCompletions`]: updatedTaskCompletions,
      });

      // Create completion in user's completions subcollection
      const completionRef = doc(collection(db, "users", userId, "completions"));
      batch.set(completionRef, {
        taskId,
        challengeId,
        completedAt: now,
        type: "challenge",
        attemptNumber: currentAttempt,
        categoryXp: task.categoryXp,
      });

      await batch.commit();

      // Award XP for completing the challenge task
      await levelService.addXP(
        userId,
        task.categoryXp,
        "challenge",
        task.title
      );
    } catch (error) {
      console.error("Error completing challenge task:", error);
      throw error;
    }
  }

  async quitChallenge(userId: string, challengeId: string): Promise<void> {
    try {
      const participationRef = doc(
        this.getUserChallengesCollection(userId),
        challengeId
      );

      // Only update active status and remove challenge data to save space
      await updateDoc(participationRef, {
        active: false,
        challengeData: null,
      });
    } catch (error) {
      console.error("Error quitting challenge:", error);
      throw error;
    }
  }

  // Helper function to remove undefined values from an object
  private removeUndefined(obj: Record<string, any>) {
    return Object.entries(obj).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, any>);
  }

  async resetChallengeProgress(
    userId: string,
    challengeId: string
  ): Promise<void> {
    try {
      // Get fresh challenge data
      const challengeDoc = await getDoc(
        doc(this.challengesCollection, challengeId)
      );
      if (!challengeDoc.exists()) throw new Error("Challenge not found");

      const challenge = {
        id: challengeDoc.id,
        ...challengeDoc.data(),
      } as Challenge;

      // Create challenge data object, filtering out undefined fields
      const challengeData = this.removeUndefined({
        title: challenge.title,
        description: challenge.description,
        duration: challenge.duration,
        tasks: challenge.tasks,
        imageUrl: challenge.imageUrl,
        category: challenge.category || [],
        difficulty: challenge.difficulty,
      });

      // Reset participation
      const participationRef = doc(
        this.getUserChallengesCollection(userId),
        challengeId
      );
      await updateDoc(participationRef, {
        active: true,
        startDate: Timestamp.now(),
        progress: 0,
        taskCompletions: {},
        challengeData,
      });
    } catch (error) {
      console.error("Error resetting challenge progress:", error);
      throw error;
    }
  }

  async checkFailedChallenges(
    userId: string
  ): Promise<ChallengeParticipation[]> {
    try {
      const userChallengesRef = this.getUserChallengesCollection(userId);
      const querySnapshot = await getDocs(
        query(userChallengesRef, where("active", "==", true))
      );

      const failedChallenges: ChallengeParticipation[] = [];
      const now = new Date();

      querySnapshot.docs.forEach((doc) => {
        const participation = doc.data() as ChallengeParticipation;
        const startDate = participation.startDate.toDate();
        const endDate = new Date(startDate);
        endDate.setDate(
          endDate.getDate() + participation.challengeData!.duration
        );

        if (now > endDate && participation.progress < 100) {
          failedChallenges.push(participation);
        }
      });

      return failedChallenges;
    } catch (error) {
      console.error("Error checking failed challenges:", error);
      throw error;
    }
  }
}

export const challengeService = new ChallengeService();
