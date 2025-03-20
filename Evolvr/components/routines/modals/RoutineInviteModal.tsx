import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Modal, Portal } from 'react-native-paper';
import { useTheme } from '@/context/ThemeContext';
import { RoutineInviteNotification } from '@/backend/types/Notification';
import { FontAwesome5 } from '@expo/vector-icons';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import Toast from 'react-native-toast-message';
import { notificationService } from '@/backend/services/notificationService';
import { routineService } from '@/backend/services/routineServices';
import { useAuth } from '@/context/AuthContext';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface Props {
  visible: boolean;
  notification: RoutineInviteNotification;
  onClose: () => void;
  onAccept: () => void;
  onDecline: () => void;
}

export default function RoutineInviteModal({ visible, notification, onClose, onAccept, onDecline }: Props) {
  const { colors } = useTheme();
  const [routineData, setRoutineData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isDesktop = windowWidth >= 768;
  const { user } = useAuth();

  useEffect(() => {
    if (notification?.routine) {
      setRoutineData(notification.routine);
      setIsLoading(false);
    }
  }, [notification]);

  const tasksByDay = routineData?.tasks?.reduce((acc: any, task: any) => {
    task.days?.forEach((day: number) => {
      if (!acc[day]) acc[day] = [];
      acc[day].push(task);
    });
    return acc;
  }, {});

  const handleAccept = async () => {
    try {
      if (!user?.uid || !notification) return;

      console.log('Accepting routine invite:', {
        notificationId: notification.id,
        routineId: notification.routineId
      });

      // Update notification status
      await notificationService.updateNotificationStatus(
        user.uid,
        notification.id,
        "accepted"
      );

      // Add user to routine participants
      await routineService.addParticipant(notification.routineId, user.uid);

      // Remove user from invites
      await routineService.removeInvite(notification.routineId, user.uid);

      console.log('Successfully accepted routine invite');
      
      // Close modal and show success message
      onClose();
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'You have joined the routine!'
      });

    } catch (error) {
      console.error('Error accepting routine invite:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error instanceof Error ? error.message : 'Failed to accept invite'
      });
    }
  };

  const handleDecline = async () => {
    await onDecline();
    onClose();
  };

  if (!visible || !notification) return null;

  return (
    <Portal>
      <Modal 
        visible={visible} 
        onDismiss={onClose}
        contentContainerStyle={[
          styles.modal, 
          { 
            backgroundColor: colors.surface,
            width: isDesktop ? '80%' : '90%',
            maxWidth: isDesktop ? 600 : undefined,
            maxHeight: windowHeight * 0.8,
          }
        ]}
      >
        <View style={styles.headerContainer}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Routine Invite
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <FontAwesome5 name="times" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={true}
        >
          <Text style={[styles.routineName, { color: colors.textPrimary }]}>
            {notification?.routineName || 'Loading...'}
          </Text>
          
          {notification.routine?.description && (
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {notification.routine.description}
            </Text>
          )}

          <View style={styles.divider} />

          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Schedule Overview
          </Text>
          
          {isLoading ? (
            <LoadingSpinner />
          ) : tasksByDay ? (
            Object.entries(tasksByDay).map(([day, tasks]) => (
              <View 
                key={day} 
                style={[styles.dayContainer, { backgroundColor: colors.background }]}
              >
                <Text style={[styles.dayTitle, { color: colors.secondary }]}>
                  {DAYS[parseInt(day)]}
                </Text>
                
                {(tasks as any[]).map((task, index) => (
                  <View 
                    key={`${task.id}-${index}`}
                    style={[styles.taskItem, { borderColor: colors.border }]}
                  >
                    <FontAwesome5 
                      name="tasks" 
                      size={14} 
                      color={colors.secondary} 
                      style={styles.taskIcon}
                    />
                    <Text style={[styles.taskText, { color: colors.textPrimary }]}>
                      {task.title}
                    </Text>
                  </View>
                ))}
              </View>
            ))
          ) : (
            <Text style={[styles.noTasks, { color: colors.textSecondary }]}>
              No tasks found for this routine
            </Text>
          )}
        </ScrollView>

        <View style={[styles.buttonContainer, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.button, styles.declineButton, { borderColor: colors.error }]}
            onPress={handleDecline}
          >
            <Text style={[styles.buttonText, { color: colors.error }]}>
              Decline
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.acceptButton, { backgroundColor: colors.secondary }]}
            onPress={handleAccept}
          >
            <Text style={[styles.buttonText, { color: colors.primary }]}>
              Join Routine
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    borderRadius: 16,
    marginHorizontal: 20,
    overflow: 'hidden',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  closeButton: {
    padding: 8,
  },
  scrollContainer: {
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  routineName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  dayContainer: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  dayTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  taskIcon: {
    marginRight: 12,
  },
  taskText: {
    fontSize: 14,
    flex: 1,
  },
  noTasks: {
    textAlign: 'center',
    fontSize: 14,
    marginTop: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineButton: {
    borderWidth: 1,
  },
  acceptButton: {
    borderWidth: 0,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
}); 