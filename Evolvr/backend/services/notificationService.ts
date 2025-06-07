import { db } from "@/backend/config/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  orderBy,
  Timestamp,
  onSnapshot,
  QuerySnapshot,
  getDoc,
  setDoc,
  increment,
  deleteDoc,
  writeBatch,
  limit,
} from "firebase/firestore";
import {
  ChallengeInviteNotification,
  FriendRequestNotification,
  Notification,
  NotificationType,
  RoutineInviteNotification,
  AchievementNotification,
} from "../types/Notification";
import { FriendRequest, FriendRequestStatus } from "../types/Friend";
import { UserNotification } from "../types/User";
import { generateId } from "@/utils/generateId";

export function isActiveNotification(notification: Notification): boolean {
  switch (notification.type) {
    case NotificationType.FRIEND_REQUEST:
      const friendRequest = notification as FriendRequestNotification;
      return friendRequest.status === "PENDING";
    case NotificationType.ROUTINE_INVITE:
    case NotificationType.CHALLENGE_INVITE:
      return !notification.responded;
    case NotificationType.ACHIEVEMENT:
      return false;
    default:
      return false;
  }
}

export const notificationService = {
  async getNotifications(userId: string): Promise<Notification[]> {
    try {
      const notificationsRef = collection(db, `users/${userId}/notifications`);
      const q = query(
        notificationsRef,
        orderBy("createdAt", "desc"),
        limit(50)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Notification[];
    } catch (error) {
      return [];
    }
  },

  subscribeToNotifications(
    userId: string,
    onUpdate: (notifications: Notification[]) => void
  ) {
    const notificationsRef = collection(db, `users/${userId}/notifications`);
    const q = query(notificationsRef, orderBy("createdAt", "desc"), limit(50));

    return onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Notification[];
      onUpdate(notifications);
    });
  },

  async markAsRead(userId: string, notificationId: string): Promise<void> {
    try {
      const notificationRef = doc(
        db,
        `users/${userId}/notifications/${notificationId}`
      );
      await updateDoc(notificationRef, { read: true });

      // Update unread counter
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        unreadNotifications: increment(-1),
      });
    } catch (error) {
      throw error;
    }
  },

  async markAllAsRead(userId: string): Promise<void> {
    try {
      const notificationsRef = collection(db, `users/${userId}/notifications`);
      const q = query(notificationsRef, where("read", "==", false));
      const snapshot = await getDocs(q);

      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => {
        batch.update(doc.ref, { read: true });
      });

      // Update unread counter
      const userRef = doc(db, "users", userId);
      batch.update(userRef, {
        unreadNotifications: 0,
      });

      await batch.commit();
    } catch (error) {
      throw error;
    }
  },

  async updateNotificationStatus(
    userId: string,
    notificationId: string,
    status: "accepted" | "declined"
  ): Promise<void> {
    try {
      const notificationRef = doc(
        db,
        `users/${userId}/notifications/${notificationId}`
      );

      await updateDoc(notificationRef, {
        status,
        responded: true,
        respondedAt: Timestamp.now(),
        read: true,
      });
    } catch (error) {
      throw error;
    }
  },

  async createNotification(notification: Notification): Promise<string> {
    try {
      // Create notification in subcollection
      const notificationRef = doc(
        collection(db, `users/${notification.userId}/notifications`)
      );

      await setDoc(notificationRef, {
        ...notification,
        id: notificationRef.id,
        createdAt: Timestamp.now(),
        read: false,
      });

      return notificationRef.id;
    } catch (error) {
      throw error;
    }
  },

  async deleteNotification(
    userId: string,
    notificationId: string
  ): Promise<void> {
    try {
      const notificationRef = doc(
        db,
        `users/${userId}/notifications/${notificationId}`
      );
      await deleteDoc(notificationRef);
    } catch (error) {
      throw error;
    }
  },

  subscribeToUnreadCount: (
    userId: string,
    options = { debounceTime: 1000 }
  ) => {
    let timeout: ReturnType<typeof setTimeout>;

    // Add initial delay for auth token propagation
    const setupTimerId = setTimeout(() => {
      try {
        const notificationsRef = collection(
          db,
          `users/${userId}/notifications`
        );
        const q = query(notificationsRef, where("read", "==", false));

        const unsubscribe = onSnapshot(q, {
          next: (snapshot) => {
            // Clear any pending timeout
            if (timeout) clearTimeout(timeout);

            // Set a new timeout to debounce the updates
            timeout = setTimeout(() => {
              // Count unread notifications
              const unreadCount = snapshot.docs.length;

              // Update user's unread notification count
              const userRef = doc(db, "users", userId);
              updateDoc(userRef, {
                unreadNotifications: unreadCount,
              }).catch((err) => {
                console.error("Error updating unread count:", err);
              });
            }, options.debounceTime);
          },
          error: (error) => {
            console.error("Notification listener error:", error);
            // Don't retry on error - just log it
            // This service is non-critical
          },
        });

        // Return combined cleanup function
        return () => {
          if (timeout) clearTimeout(timeout);
          unsubscribe();
        };
      } catch (error) {
        console.error("Error setting up notification listener:", error);
        return () => {}; // Return empty function on error
      }
    }, 2000); // 2 second delay for auth propagation

    // Return function that cleans up the setup timer if component unmounts before listener is established
    return () => {
      clearTimeout(setupTimerId);
      if (timeout) clearTimeout(timeout);
    };
  },
};
