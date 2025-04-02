import { useState, useEffect } from "react";
import { notificationService } from "@/backend/services/notificationService";

export const useNotificationCount = (userId: string | undefined) => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = notificationService.subscribeToNotifications(
      userId,
      (notifications) => {
        const count = notifications.reduce(
          (acc, n) =>
            !n.read && (!("responded" in n) || !n.responded) ? acc + 1 : acc,
          0
        );
        setUnreadCount((prev) => {
          if (prev !== count) return count;
          return prev;
        });
      }
    );

    return () => unsubscribe();
  }, [userId]);

  return unreadCount;
};
