import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { FontAwesome5 } from '@expo/vector-icons';
import { ChallengeInviteNotification, FriendRequestNotification, Notification as NotificationType, NotificationType as NotificationTypes, RoutineInviteNotification, RoutineDeletedNotification } from '@/backend/types/Notification';
import { useRouter } from 'expo-router';

interface NotificationProps {
  notification: NotificationType;
  onAccept?: () => Promise<void>;
  onDecline?: () => Promise<void>;
  onPress?: () => void;
}

const isRespondableNotification = (
  notification: NotificationType
): notification is FriendRequestNotification | RoutineInviteNotification | ChallengeInviteNotification => {
  return notification.type === NotificationTypes.FRIEND_REQUEST ||
         notification.type === NotificationTypes.ROUTINE_INVITE ||
         notification.type === NotificationTypes.CHALLENGE_INVITE;
};

const isRoutineDeletedNotification = (
  notification: NotificationType
): notification is RoutineDeletedNotification => {
  return notification.type === NotificationTypes.ROUTINE_DELETED;
};

export default function Notification({ 
  notification, 
  onAccept, 
  onDecline,
  onPress 
}: NotificationProps) {
  const { colors } = useTheme();
  const router = useRouter();

  const getNotificationIcon = (type: NotificationTypes) => {
    switch (type) {
      case NotificationTypes.FRIEND_REQUEST:
        return 'user-friends';
      case NotificationTypes.ROUTINE_INVITE:
        return 'calendar-check';
      case NotificationTypes.CHALLENGE_INVITE:
        return 'trophy';
      case NotificationTypes.ACHIEVEMENT:
        return 'medal';
      default:
        return 'bell';
    }
  };

  const renderAvatar = () => {
    let photoURL;
    
    switch (notification.type) {
      case NotificationTypes.FRIEND_REQUEST:
        photoURL = notification.senderPhotoURL;
        break;
      case NotificationTypes.ROUTINE_INVITE:
        photoURL = 'inviterPhotoURL' in notification ? notification.inviterPhotoURL : undefined;
        break;
      default:
        photoURL = undefined;
    }

    return (
      <View style={[styles.avatarContainer, { backgroundColor: colors.surface }]}>
        {photoURL ? (
          <Image source={{ uri: photoURL }} style={styles.avatar} />
        ) : (
          <FontAwesome5 
            name={getNotificationIcon(notification.type)} 
            size={20} 
            color={colors.primary} 
          />
        )}
      </View>
    );
  };

  const renderContent = () => {
    switch (notification.type) {
      case NotificationTypes.FRIEND_REQUEST:
        return (
          <Text style={[styles.message, { color: colors.textPrimary }]}>
            <Text style={styles.highlight}>{notification.senderDisplayName}</Text>
            {' sent you a friend request'}
          </Text>
        );

      case NotificationTypes.ROUTINE_INVITE:
        return (
          <Text style={[styles.message, { color: colors.textPrimary }]}>
            <Text style={styles.highlight}>{notification.inviterName}</Text>
            {' invited you to join routine '}
            <Text style={styles.highlight}>{notification.routineName}</Text>
          </Text>
        );

      case NotificationTypes.CHALLENGE_INVITE:
        return (
          <Text style={[styles.message, { color: colors.textPrimary }]}>
            <Text style={styles.highlight}>{notification.inviterName}</Text>
            {' invited you to join challenge '}
            <Text style={styles.highlight}>{notification.challengeName}</Text>
          </Text>
        );

      case NotificationTypes.ACHIEVEMENT:
        return (
          <Text style={[styles.message, { color: colors.textPrimary }]}>
            {'You earned the '}
            <Text style={styles.highlight}>{notification.achievementName}</Text>
            {' achievement!'}
          </Text>
        );

      case NotificationTypes.ROUTINE_DELETED:
        return (
          <Text style={[styles.message, { color: colors.textPrimary }]}>
            The routine <Text style={styles.highlight}>{notification.routineTitle}</Text>
            {' has been deleted by its creator'}
          </Text>
        );

      default:
        return null;
    }
  };

  const renderActions = () => {
    switch (notification.type) {
      case NotificationTypes.ROUTINE_DELETED:
        if (notification.responded) {
          return (
            <Text style={[styles.statusText, { 
              color: notification.status === 'continued' ? colors.success : colors.textSecondary 
            }]}>
              {notification.status === 'continued' ? 'Continued Solo' : 'Dismissed'}
            </Text>
          );
        }
        return null;

      case NotificationTypes.ROUTINE_INVITE:
        if (!notification.responded) {
          return (
            <TouchableOpacity
              style={[styles.viewButton, { 
                backgroundColor: colors.secondary,
                borderWidth: 0,
              }]}
              onPress={onPress}
            >
              <Text style={[styles.actionButtonText, { 
                color: colors.primary,
                fontWeight: '600'
              }]}>
                View Routine
              </Text>
            </TouchableOpacity>
          );
        }
        return (
          <Text style={[styles.statusText, { 
            color: notification.status === 'accepted' ? colors.success : colors.error 
          }]}>
            {notification.status === 'accepted' ? 'Accepted' : 'Declined'}
          </Text>
        );

      case NotificationTypes.FRIEND_REQUEST:
      case NotificationTypes.CHALLENGE_INVITE:
        if (!notification.responded) {
          return (
            <View style={styles.actions}>
              {onAccept && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.acceptButton, { 
                    backgroundColor: colors.secondary,
                    borderWidth: 0,
                  }]}
                  onPress={onAccept}
                >
                  <Text style={[styles.actionButtonText, { color: colors.primary }]}>
                    {notification.type === NotificationTypes.FRIEND_REQUEST ? 'Accept' : 'Join'}
                  </Text>
                </TouchableOpacity>
              )}
              {onDecline && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.declineButton, { 
                    backgroundColor: 'transparent',
                    borderColor: colors.border,
                    borderWidth: 1,
                  }]}
                  onPress={onDecline}
                >
                  <Text style={[styles.actionButtonText, { color: colors.textPrimary }]}>
                    Decline
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }
        return null;

      default:
        return null;
    }
  };

  const touchableStyles = [
    styles.container,
    { 
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    !notification.read && [styles.unread, { borderLeftColor: colors.primary }],
  ];
  
  return (
    <TouchableOpacity
      style={touchableStyles}
      onPress={isRespondableNotification(notification) && notification.responded ? undefined : onPress}
      disabled={isRespondableNotification(notification) && notification.responded}
      activeOpacity={isRespondableNotification(notification) && notification.responded ? 1 : 0.7}
    >
      {renderAvatar()}
      <View style={[styles.content, { flex: 1 }]}>
        <Text style={[styles.message, { color: colors.textPrimary }]} numberOfLines={0}>
          {renderContent()}
        </Text>
        {renderActions()}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2.84,
    elevation: 2,
    borderWidth: 1,
    minHeight: 80,
  },
  unread: {
    borderLeftWidth: 3,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  highlight: {
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 80,
    alignItems: 'center',
  },
  acceptButton: {
    borderWidth: 0,
  },
  declineButton: {
    backgroundColor: 'transparent',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  viewButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
  },
});
