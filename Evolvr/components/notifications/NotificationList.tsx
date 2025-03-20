import React, { useState } from 'react';
import { View, StyleSheet, FlatList, Text } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { notificationService } from '@/backend/services/notificationService';
import { Notification as NotificationType, NotificationType as NotificationTypes, RoutineInviteNotification } from '@/backend/types/Notification';
import { friendService } from '@/backend/services/friendService';
import { routineService } from '@/backend/services/routineServices';
import { useRouter } from 'expo-router';
import Notification from './NotificationItem';
import { useTheme } from '@/context/ThemeContext';
import RoutineInviteModal from '@/components/routines/modals/RoutineInviteModal';
import { collection, query, orderBy, limit, startAfter, getDocs } from 'firebase/firestore';
import { db } from '@/backend/config/firebase';

export default function NotificationList() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<RoutineInviteNotification | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastVisible, setLastVisible] = useState<any>(null);

  React.useEffect(() => {
    if (!user?.uid) return;
    
    // Load initial notifications
    const loadNotifications = async () => {
      try {
        setIsLoading(true);
        const notificationsRef = collection(db, `users/${user.uid}/notifications`);
        const q = query(
          notificationsRef,
          orderBy("createdAt", "desc"),
          limit(20)
        );
        
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
          const newNotifications = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as NotificationType[];
          setNotifications(newNotifications);
        }
      } catch (error) {
        console.error("Error loading notifications:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadNotifications();

    // Subscribe to real-time updates
    return notificationService.subscribeToNotifications(user.uid, (updatedNotifications) => {
      setNotifications(updatedNotifications);
    });
  }, [user?.uid]);

  const loadMoreNotifications = async () => {
    if (isLoading || !user?.uid || !lastVisible) return;

    try {
      setIsLoading(true);
      const notificationsRef = collection(db, `users/${user.uid}/notifications`);
      const q = query(
        notificationsRef,
        orderBy("createdAt", "desc"),
        startAfter(lastVisible),
        limit(20)
      );

      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        const newNotifications = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as NotificationType[];
        setNotifications(prev => [...prev, ...newNotifications]);
      }
    } catch (error) {
      console.error("Error loading more notifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async (notification: NotificationType) => {
    try {
      switch (notification.type) {
        case NotificationTypes.FRIEND_REQUEST:
          await friendService.acceptFriendRequest(
            notification.id,
            {
              userId: notification.senderId,
              username: notification.senderDisplayName,
              displayName: notification.senderDisplayName,
              photoURL: notification.senderPhotoURL,
            },
            {
              userId: user!.uid,
              username: user?.userData?.username || 'Unknown',
              displayName: user?.userData?.username || 'Unknown',
              photoURL: user?.userData?.photoURL,
            }
          );
          break;

        case NotificationTypes.ROUTINE_INVITE:
          await routineService.acceptRoutineInvite(user!.uid, notification.routineId);
          break;

        case NotificationTypes.CHALLENGE_INVITE:
          // Handle challenge invite acceptance
          break;

        case NotificationTypes.ROUTINE_DELETED:
          await routineService.continueDeletedRoutine(
            user!.uid,
            notification.routineId,
            notification
          );
          break;
      }
      
      await notificationService.updateNotificationStatus(
        user!.uid,
        notification.id,
        'accepted'
      );
    } catch (error) {
      console.error('Error accepting notification:', error);
    }
  };

  const handleDecline = async (notification: NotificationType) => {
    try {
      switch (notification.type) {
        case NotificationTypes.FRIEND_REQUEST:
          await friendService.declineFriendRequest(notification.id);
          break;

        case NotificationTypes.ROUTINE_INVITE:
          await routineService.declineRoutineInvite(user!.uid, notification.routineId);
          break;

        case NotificationTypes.CHALLENGE_INVITE:
          // Handle challenge invite decline
          break;

        case NotificationTypes.ROUTINE_DELETED:
          // Just mark as responded, no other action needed
          break;
      }
      
      await notificationService.updateNotificationStatus(
        user!.uid,
        notification.id,
        'declined'
      );
    } catch (error) {
      console.error('Error declining notification:', error);
    }
  };

  const handlePress = (notification: NotificationType) => {
    switch (notification.type) {
      case NotificationTypes.ROUTINE_INVITE:
        setSelectedNotification(notification as RoutineInviteNotification);
        break;
    }
  };

  if (!notifications.length) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          No notifications
        </Text>
      </View>
    );
  }

  return (
    <>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Notification
            notification={item}
            onAccept={() => handleAccept(item)}
            onDecline={() => handleDecline(item)}
            onPress={() => handlePress(item)}
          />
        )}
        contentContainerStyle={[
          styles.list,
          notifications.length === 0 && styles.emptyList
        ]}
        style={{ flex: 1, backgroundColor: colors.background }}
        onEndReached={loadMoreNotifications}
        onEndReachedThreshold={0.5}
      />
      <RoutineInviteModal
        visible={!!selectedNotification}
        notification={selectedNotification!}
        onClose={() => setSelectedNotification(null)}
        onAccept={() => handleAccept(selectedNotification!)}
        onDecline={() => handleDecline(selectedNotification!)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingVertical: 8,
    flexGrow: 1,
    paddingBottom: 20,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.8,
  },
}); 