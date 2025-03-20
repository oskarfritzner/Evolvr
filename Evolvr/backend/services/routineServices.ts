import {
  doc,
  updateDoc,
  increment,
  collection,
  getDocs,
  query,
  where,
  getDoc,
  Timestamp,
  setDoc,
  deleteDoc,
  arrayUnion,
  deleteField,
  arrayRemove,
  writeBatch,
  onSnapshot,
  runTransaction,
} from "firebase/firestore";
import { db } from "@/backend/config/firebase";
import type { Routine, RoutineTask } from "../types/Routine";
import type { XPService } from "../types/SharedTypes";
import type { UserData } from "../types/UserData";
import Task, { TaskStatus, TaskType, TaskCompletion } from "../types/Task";
import type { ParticipantData } from "../types/Participant";
import type { RoutineTaskWithMeta } from "../types/Routine";
import { generateId } from "@/utils/generateId";
import {
  NotificationType,
  RoutineInviteNotification,
} from "../types/Notification";
import { levelService } from "./levelService";
import { streakService } from "./streakService";
import type { CachedRoutine } from "../types/Routine";
import { notificationService } from "./notificationService";
import type { CompletedTask } from "../types/Task";
import { auth } from "@/backend/config/firebase";
import { useQueryClient } from "@tanstack/react-query";

let xpService: XPService;
export const setXPService = (service: XPService) => {
  xpService = service;
};

const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes in milliseconds

export const routineService = {
  async completeRoutine(userId: string, routine: Routine): Promise<void> {
    const userRef = doc(db, "users", userId);

    // Update XP gains
    if (routine.xpGains) {
      await xpService.updateUserLevels(userId, routine.xpGains);
    }

    // Update routine completion
    await updateDoc(userRef, {
      "stats.routinesCompleted": increment(1),
    });
  },

  getRoutineStreak(userData: UserData, userId: string): number {
    // Implementation here
    return 0; // or actual implementation
  },

  async getParticipants(participantIds: string[]): Promise<ParticipantData[]> {
    try {
      const participants = await Promise.all(
        participantIds.map(async (userId) => {
          const userDoc = await getDoc(doc(db, "users", userId));
          if (!userDoc.exists()) return null;
          const userData = userDoc.data() as UserData;
          return {
            id: userId,
            username: userData.username,
            photoURL: userData.photoURL,
          };
        })
      );
      return participants.filter((p): p is ParticipantData => p !== null);
    } catch (error) {
      console.error("Error getting participants:", error);
      return [];
    }
  },

  async getTodaysRoutineTasks(userId: string): Promise<RoutineTaskWithMeta[]> {
    // This is the same as getActiveRoutineTasks, just rename for consistency
    return this.getActiveRoutineTasks(userId);
  },

  async updateRoutine({
    routineId,
    updates,
  }: {
    routineId: string;
    updates: Partial<Routine>;
  }): Promise<void> {
    try {
      const routineRef = doc(db, "routines", routineId);
      const routineDoc = await getDoc(routineRef);

      if (!routineDoc.exists()) {
        throw new Error("Routine not found");
      }

      const currentRoutine = routineDoc.data() as Routine;

      // Preserve existing data while updating
      const updatedData: Partial<Routine> = {
        ...updates,
        lastUpdated: Timestamp.now(),
      };

      // If tasks are being updated, merge with existing tasks
      if (updates.tasks) {
        const existingTasks = currentRoutine.tasks || [];
        const updatedTasks = existingTasks.map((existingTask) => {
          // Find matching task in updates
          const updatedTask = updates.tasks?.find(
            (task) => task.id === existingTask.id
          );
          if (updatedTask) {
            // Merge existing task with updates, preserving completions
            return {
              ...existingTask,
              ...updatedTask,
              completions: {
                ...existingTask.completions,
                ...(updatedTask.completions || {}),
              },
              participants: existingTask.participants, // Preserve participants
              active: updatedTask.active ?? existingTask.active ?? true,
            };
          }
          return existingTask; // Keep unchanged tasks
        });

        // Add any new tasks from updates that don't exist in current routine
        updates.tasks.forEach((newTask) => {
          if (!existingTasks.find((task) => task.id === newTask.id)) {
            updatedTasks.push({
              ...newTask,
              active: true,
              participants: currentRoutine.participants || [],
            });
          }
        });

        updatedData.tasks = updatedTasks;
      }

      // Preserve participants
      delete updatedData.participants;

      // Update the routine
      await updateDoc(routineRef, updatedData);

      // Try to notify participants, but don't fail if notifications fail
      try {
        const participants = currentRoutine.participants || [];
        for (const participantId of participants) {
          if (participantId !== currentRoutine.createdBy) {
            try {
              // Update user's routine cache
              const userRef = doc(db, "users", participantId);
              await updateDoc(userRef, {
                [`routines.${routineId}`]: null,
                lastRoutineSync: null,
              });

              // Create notification with subcollection approach
              await notificationService.createNotification({
                id: generateId(),
                userId: participantId,
                type: NotificationType.ROUTINE_UPDATED,
                read: false,
                createdAt: Timestamp.now(),
                routineId,
                routineName: currentRoutine.title,
                updatedBy: currentRoutine.createdBy,
                message: "updated the routine",
              });
            } catch (individualError) {
              console.error("Notification error details:", individualError);
              continue;
            }
          }
        }
      } catch (notificationError) {
        console.warn("Failed to process notifications:", notificationError);
        // Don't throw the error since the routine update succeeded
      }
    } catch (error) {
      console.error("Error updating routine:", error);
      throw error;
    }
  },

  async saveRoutine(
    userId: string,
    routineData: Partial<Routine>
  ): Promise<void> {
    try {
      const routineId = routineData.id || generateId();
      const routineRef = doc(db, "routines", routineId);

      // Get user data for notification
      const userDoc = await getDoc(doc(db, "users", userId));
      const userData = userDoc.data();
      const inviterName =
        userData?.displayName || userData?.username || "Unknown";

      // Ensure required fields and proper structure
      const routine: Routine = {
        ...routineData,
        id: routineId,
        createdBy: userId,
        createdAt: Timestamp.now().toMillis(),
        participants: [userId], // Start with creator as participant
        invites: routineData.invites || [], // Keep any invites
        active: true, // Must be true per rules
        tasks: (routineData.tasks || []).map((task) => ({
          ...task,
          routineId,
          routineName: routineData.title || "",
          participants: [userId],
          active: true,
        })),
        title: routineData.title || "",
        description: routineData.description || "",
        lastUpdated: Timestamp.now(),
      };

      // Validate required fields as per Firestore rules
      if (
        !routine.title ||
        !Array.isArray(routine.tasks) ||
        !Array.isArray(routine.participants) ||
        !Array.isArray(routine.invites)
      ) {
        throw new Error("Missing required fields for routine");
      }

      await setDoc(routineRef, routine);

      // Send notifications to invited users
      if (routine.invites?.length) {
        await Promise.all(
          routine.invites.map(async (invitedUserId) => {
            const notification: RoutineInviteNotification = {
              id: generateId(),
              type: NotificationType.ROUTINE_INVITE,
              userId: invitedUserId,
              routineId: routineId,
              routineName: routine.title,
              inviterId: userId,
              inviterName,
              inviterPhotoURL: userData?.photoURL,
              read: false,
              createdAt: Timestamp.now(),
              routine: {
                title: routine.title,
                description: routine.description,
                tasks: routine.tasks.map((task) => ({
                  id: task.id,
                  title: task.title || "",
                  days: task.days || [],
                  description: task.description || "",
                })),
              },
            };
            await notificationService.createNotification(notification);
          })
        );
      }
    } catch (error) {
      console.error("Error saving routine:", error);
      throw error;
    }
  },

  async deleteRoutine(userId: string, routineId: string): Promise<boolean> {
    try {
      const routineRef = doc(db, "routines", routineId);
      const routineDoc = await getDoc(routineRef);

      if (!routineDoc.exists()) {
        throw new Error("Routine not found");
      }

      const routine = routineDoc.data() as Routine;

      if (routine.createdBy !== userId) {
        throw new Error("Only the creator can delete a routine");
      }

      // Handle participant updates first
      const otherParticipants = routine.participants.filter(
        (id) => id !== userId
      );

      if (otherParticipants.length > 0) {
        // Create a batch for participant updates
        const participantBatch = writeBatch(db);

        for (const participantId of otherParticipants) {
          const userRef = doc(db, "users", participantId);
          participantBatch.update(userRef, {
            [`notifications.${routineId}`]: {
              id: routineId,
              type: NotificationType.ROUTINE_DELETED,
              routineId,
              routineTitle: routine.title,
              creatorId: userId,
              routine: {
                title: routine.title,
                description: routine.description || "",
                tasks: routine.tasks.map((task) => ({
                  id: task.id,
                  title: task.title || "",
                  description: task.description || "",
                  days: task.days || [],
                })),
              },
              read: false,
              responded: false,
              createdAt: Timestamp.now(),
            },
            [`routines.${routineId}`]: deleteField(),
            lastRoutineSync: null,
          });
        }

        // Commit participant updates
        await participantBatch.commit();
      }

      // Create a new batch for routine deletion
      const deleteBatch = writeBatch(db);

      // Update creator's data
      const creatorRef = doc(db, "users", userId);
      deleteBatch.update(creatorRef, {
        [`routines.${routineId}`]: deleteField(),
        lastRoutineSync: null,
      });

      // Delete the routine document
      deleteBatch.delete(routineRef);

      // Commit routine deletion
      await deleteBatch.commit();

      return true;
    } catch (error) {
      throw error;
    }
  },

  async getUserRoutines(userId: string): Promise<Routine[]> {
    try {
      const q = query(
        collection(db, "routines"),
        where("participants", "array-contains", userId)
      );

      const routinesSnapshot = await getDocs(q);
      return routinesSnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Routine)
      );
    } catch (error) {
      console.error("Error getting user routines:", error);
      return [];
    }
  },

  async acceptRoutineInvite(userId: string, routineId: string): Promise<void> {
    try {
      const routineRef = doc(db, "routines", routineId);
      const userRef = doc(db, "users", userId);
      const batch = writeBatch(db);

      // Get current routine data
      const routineDoc = await getDoc(routineRef);
      if (!routineDoc.exists()) {
        throw new Error("Routine not found");
      }
      const routine = routineDoc.data() as Routine;

      // Update routine participants
      batch.update(routineRef, {
        participants: arrayUnion(userId),
        invites: arrayRemove(userId),
      });

      // Update notification status and invalidate cache
      batch.update(userRef, {
        [`notifications.${routineId}`]: {
          type: NotificationType.ROUTINE_INVITE,
          routineId,
          routineName: routine.title,
          inviterId: routine.createdBy,
          responded: true,
          status: "accepted",
          read: true,
          createdAt: Timestamp.now(),
        },
        // Clear cached routine data to force refresh
        [`routines.${routineId}`]: null,
        lastRoutineSync: null,
      });

      // Also notify the routine creator
      const creatorRef = doc(db, "users", routine.createdBy);
      batch.update(creatorRef, {
        [`notifications.${routineId}_${userId}_joined`]: {
          id: `${routineId}_${userId}_joined`,
          type: NotificationType.ROUTINE_UPDATED,
          routineId,
          routineName: routine.title,
          updatedBy: userId,
          message: `joined the routine`,
          read: false,
          createdAt: Timestamp.now(),
        },
        // Invalidate creator's cache too
        lastRoutineSync: null,
      });

      await batch.commit();
    } catch (error) {
      throw error;
    }
  },

  async declineRoutineInvite(userId: string, routineId: string): Promise<void> {
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        [`notifications.${routineId}.responded`]: true,
      });
    } catch (error) {
      console.error("Error declining routine invite:", error);
      throw error;
    }
  },

  async leaveRoutine(
    userId: string,
    routineId: string,
    keepPersonal: boolean
  ): Promise<void> {
    try {
      const routineRef = doc(db, "routines", routineId);
      const routineDoc = await getDoc(routineRef);

      if (!routineDoc.exists()) {
        throw new Error("Routine not found");
      }

      const routine = routineDoc.data() as Routine;

      // Verify user is a participant
      if (!routine.participants.includes(userId)) {
        throw new Error("User is not a participant in this routine");
      }

      const batch = writeBatch(db);

      // Update routine participants
      batch.update(routineRef, {
        participants: routine.participants.filter((id) => id !== userId),
      });

      // Update user data
      const userRef = doc(db, "users", userId);

      if (keepPersonal) {
        // Create a personal copy of the routine
        const newRoutineId = generateId();
        const newRoutineRef = doc(db, "routines", newRoutineId);

        const personalRoutine = {
          ...routine,
          id: newRoutineId,
          participants: [userId],
          createdBy: userId,
          title: `${routine.title} (Personal)`,
          createdAt: Timestamp.now(),
        };

        batch.set(newRoutineRef, personalRoutine);
      }

      // Remove from original routine cache
      batch.update(userRef, {
        [`routines.${routineId}`]: deleteField(),
        lastRoutineSync: null,
      });

      await batch.commit();
    } catch (error) {
      throw error;
    }
  },

  async getRoutine(routineId: string): Promise<Routine | null> {
    try {
      const routineRef = doc(db, "routines", routineId);
      const routineDoc = await getDoc(routineRef);

      if (!routineDoc.exists()) return null;

      return routineDoc.data() as Routine;
    } catch (error) {
      console.error("Error getting routine:", error);
      return null;
    }
  },

  async completeRoutineTask(
    userId: string,
    taskId: string,
    routineId: string
  ): Promise<void> {
    try {
      const routineRef = doc(db, "routines", routineId);
      const routineDoc = await getDoc(routineRef);

      if (!routineDoc.exists()) {
        throw new Error("Routine not found");
      }

      const routine = routineDoc.data() as Routine;
      const today = new Date().toISOString().split("T")[0];

      const tasksArray = (
        Array.isArray(routine.tasks)
          ? routine.tasks
          : Object.values(routine.tasks || {})
      ) as RoutineTask[];

      const taskIndex = tasksArray.findIndex((task) => task.id === taskId);
      if (taskIndex === -1) {
        throw new Error("Task not found in routine");
      }

      const task = tasksArray[taskIndex];
      const completedAt = Timestamp.now();

      const batch = writeBatch(db);

      // 1. Update the task's completions in the routine document
      batch.update(routineRef, {
        [`tasks.${taskIndex}.completions.${today}`]: arrayUnion({
          completedBy: userId,
          completedAt,
        }),
      });

      // 2. Create completion document in user's completions subcollection
      const completionRef = doc(collection(db, "users", userId, "completions"));
      batch.set(completionRef, {
        taskId,
        completedAt,
        type: "routine",
        routineId,
        categoryXp: task.categoryXp,
      } as TaskCompletion);

      // 3. Update user's active tasks if needed
      await batch.commit();

      // Award XP for completing the routine task
      await levelService.addXP(userId, task.categoryXp, "routine", task.title);

      // Update streak and other metadata as needed
      await this.updateRoutineMetadata(routineId);
    } catch (error) {
      throw error;
    }
  },

  async getActiveRoutineTasks(userId: string): Promise<RoutineTaskWithMeta[]> {
    try {
      const routines = await this.getUserRoutines(userId);
      const routineTasks: RoutineTaskWithMeta[] = [];

      for (const routine of routines) {
        const tasksArray = (
          Array.isArray(routine.tasks)
            ? routine.tasks
            : Object.values(routine.tasks || {})
        ) as RoutineTask[];

        for (const task of tasksArray) {
          if (task.active === false) continue;

          const today = new Date().toISOString().split("T")[0];
          const todayCompletions = (task.completions?.[today] || []).map(
            (completion) => ({
              completedBy: completion.completedBy,
              completedAt: completion.completedAt.toMillis(),
            })
          );

          // Get user's completion status
          const userHasCompleted = todayCompletions.some(
            (completion) => completion.completedBy === userId
          );

          // Check if all participants have completed
          const allCompleted = routine.participants.every((participantId) =>
            todayCompletions.some(
              (completion) => completion.completedBy === participantId
            )
          );

          // Changed logic here: For individual routines (single participant) use userHasCompleted
          // For shared routines (multiple participants) use allCompleted
          const isIndividualRoutine = routine.participants.length === 1;
          const shouldShowTask = isIndividualRoutine
            ? !userHasCompleted
            : !allCompleted;

          if (shouldShowTask) {
            routineTasks.push({
              id: task.id,
              taskId: task.id,
              taskName: task.title || "Untitled Task",
              routineId: routine.id,
              routineTitle: routine.title,
              participants: await this.getParticipants(routine.participants),
              isCompleted: userHasCompleted,
              allCompleted,
              todayCompletions,
              categoryXp: task.categoryXp,
              description: task.description,
              createdBy: routine.createdBy,
              type: "routine",
              streak: routine.metadata?.currentStreak || 0,
              lastCompleted: routine.metadata?.lastCompleted || null,
              completions: Object.fromEntries(
                Object.entries(task.completions || {}).map(([date, comps]) => [
                  date,
                  comps.map((c) => ({
                    completedBy: c.completedBy,
                    completedAt: c.completedAt.toMillis(),
                  })),
                ])
              ),
            });
          }
        }
      }

      return routineTasks;
    } catch (error) {
      throw error;
    }
  },

  async inviteToRoutine(
    routineId: string,
    invitedUserIds: string[]
  ): Promise<void> {
    try {
      const routineRef = doc(db, "routines", routineId);
      const routineDoc = await getDoc(routineRef);
      if (!routineDoc.exists()) throw new Error("Routine not found");

      const routine = routineDoc.data() as Routine;

      // Get inviter's data
      const inviterDoc = await getDoc(doc(db, "users", routine.createdBy));
      const inviterData = inviterDoc.data();
      const inviterName =
        inviterData?.displayName || inviterData?.username || "Unknown";

      // Filter out users who are already participants or invited
      const validInvites = invitedUserIds.filter(
        (userId) =>
          !routine.participants.includes(userId) &&
          !routine.invites.includes(userId)
      );

      if (validInvites.length === 0) {
        throw new Error("No valid users to invite");
      }

      // Update routine with new invites
      await updateDoc(routineRef, {
        invites: arrayUnion(...validInvites),
      });

      // Send notifications to all valid invitees
      await Promise.all(
        validInvites.map(async (userId) => {
          await notificationService.createNotification({
            id: generateId(),
            type: NotificationType.ROUTINE_INVITE,
            userId,
            routineId,
            routineName: routine.title,
            inviterId: routine.createdBy,
            inviterName,
            inviterPhotoURL: inviterData?.photoURL,
            routine: {
              title: routine.title,
              description: routine.description || "",
              tasks: routine.tasks.map((task) => ({
                id: task.id,
                title: task.title,
                days: task.days,
                description: task.description || "",
              })),
            },
            responded: false,
            read: false,
            createdAt: Timestamp.now(),
          });
        })
      );
    } catch (error) {
      console.error("Error inviting to routine:", error);
      throw error;
    }
  },

  // Add a new function to handle continuing a deleted routine
  async continueDeletedRoutine(
    userId: string,
    routineId: string,
    notification: any
  ): Promise<void> {
    try {
      const batch = writeBatch(db);

      // Create new routine with the participant as creator
      const newRoutineId = generateId();
      const newRoutine = {
        ...notification.routine,
        id: newRoutineId,
        title: `${notification.routine.title} (Continued)`,
        createdAt: Timestamp.now().toMillis(),
      };

      // Add new routine document
      batch.set(doc(db, "routines", newRoutineId), newRoutine);

      // Update user's notifications and cached routines
      const userRef = doc(db, "users", userId);
      batch.update(userRef, {
        [`notifications.${routineId}.responded`]: true,
        [`notifications.${routineId}.status`]: "accepted",
        cachedRoutines: arrayUnion(newRoutine),
      });

      await batch.commit();
    } catch (error) {
      console.error("Error continuing routine:", error);
      throw error;
    }
  },

  async updateRoutineMetadata(routineId: string): Promise<void> {
    try {
      const routineRef = doc(db, "routines", routineId);
      const routineDoc = await getDoc(routineRef);

      if (!routineDoc.exists()) {
        throw new Error("Routine not found");
      }

      const routine = routineDoc.data() as Routine;
      const today = new Date().toISOString().split("T")[0];

      // Convert tasks to array if it's an object
      const tasksArray = (
        Array.isArray(routine.tasks)
          ? routine.tasks
          : Object.values(routine.tasks || {})
      ) as RoutineTask[];

      // Get all tasks completions for today
      const tasksCompletions = tasksArray.map((task) => ({
        taskId: task.id,
        completions: task.completions?.[today] || [],
      }));

      // Check if all tasks are completed by all participants
      const allTasksCompleted = tasksCompletions.every((task) =>
        routine.participants.every((participantId) =>
          task.completions.some(
            (completion) => completion.completedBy === participantId
          )
        )
      );

      // Calculate streak
      let currentStreak = routine.metadata?.currentStreak || 0;
      const lastCompleted = routine.metadata?.lastCompleted?.toDate() || null;

      if (allTasksCompleted) {
        if (lastCompleted) {
          const oneDayInMs = 24 * 60 * 60 * 1000;
          const daysSinceLastCompleted = Math.round(
            (new Date().getTime() - lastCompleted.getTime()) / oneDayInMs
          );

          if (daysSinceLastCompleted === 1) {
            currentStreak++;
          } else if (daysSinceLastCompleted > 1) {
            currentStreak = 1;
          }
        } else {
          currentStreak = 1;
        }
      }

      // Update routine metadata
      await updateDoc(routineRef, {
        "metadata.currentStreak": currentStreak,
        "metadata.lastCompleted": allTasksCompleted
          ? Timestamp.now()
          : routine.metadata?.lastCompleted,
        "metadata.bestStreak": Math.max(
          currentStreak,
          routine.metadata?.bestStreak || 0
        ),
        "metadata.totalCompletions":
          (routine.metadata?.totalCompletions || 0) +
          (allTasksCompleted ? 1 : 0),
      });
    } catch (error) {
      console.error("Error updating routine metadata:", error);
      throw error;
    }
  },

  async addParticipant(routineId: string, userId: string): Promise<void> {
    try {
      const routineRef = doc(db, "routines", routineId);
      await updateDoc(routineRef, {
        participants: arrayUnion(userId),
      });
    } catch (error) {
      throw error;
    }
  },

  async removeInvite(routineId: string, userId: string): Promise<void> {
    try {
      const routineRef = doc(db, "routines", routineId);
      await updateDoc(routineRef, {
        invites: arrayRemove(userId),
      });
    } catch (error) {
      throw error;
    }
  },

  // Other routine-related methods...
};

function isConsecutiveDay(lastDate: Date, currentDate: Date): boolean {
  const oneDayInMs = 24 * 60 * 60 * 1000;
  const diffInDays = Math.round(
    (currentDate.getTime() - lastDate.getTime()) / oneDayInMs
  );
  return diffInDays === 1;
}
