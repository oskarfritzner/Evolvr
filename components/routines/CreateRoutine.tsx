import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
  Modal, Animated, ActivityIndicator, Image, PanResponder, Platform,
  Dimensions, useWindowDimensions
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useRoutine } from '@/context/RoutineContext';
import { useRoutines } from '@/hooks/queries/useRoutines';
import { routineService } from '@/backend/services/routineServices';
import { useAuth } from '@/context/AuthContext';
import SuccessMessage from '@/components/errorHandlingMessages/successMessage';
import ErrorMessage from '@/components/errorHandlingMessages/errorMessage';
import { friendService } from '@/backend/services/friendService';
import type { Routine, RoutineTask } from '@/backend/types/Routine';
import { Button } from 'react-native-paper';
import { TaskStatus } from '@/backend/types/Task';
import { notificationService } from '@/backend/services/notificationService';
import { NotificationType } from '@/backend/types/Notification';
import { useRouter } from 'expo-router';
import { Timestamp, doc, updateDoc, increment, deleteField } from 'firebase/firestore';
import { db } from '@/backend/config/firebase';
import type { RoutineInviteNotification } from '@/backend/types/Notification';
import { generateId } from '@/utils/generateId';
import Toast from 'react-native-toast-message';
import { useQueryClient } from "@tanstack/react-query";
import InfoModal from '@/components/shared/InfoModal';
import { INFO_CONTENT } from '@/constants/infoContent';
import FriendShareModal from '@/components/common/FriendShareModal';
import { useFriends } from '@/hooks/queries/useFriends';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { FriendData } from '@/backend/types/Friend';
import type Task from '@/backend/types/Task';
import AddTask from '@/components/tasks/addTask';

interface Friend {
  userId: string;
  displayName: string;
  photoURL?: string;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface Props {
  visible: boolean;
  onClose: () => void;
  routine?: Routine | null;
}

const CreateRoutine: React.FC<Props> = ({ visible, onClose, routine }) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { currentRoutine, updateRoutineName, updateRoutineDescription, updateRoutineTasks, clearRoutine } = useRoutine();
  const { createRoutine, updateRoutine, isCreating, isUpdating } = useRoutines(user?.uid);
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Partial<RoutineTask> | null>(null);
  const params = useLocalSearchParams<{ mode: 'create' | 'edit', routineId?: string }>();
  const isEditMode = !!routine;
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const fadeAnim = useState(new Animated.Value(0))[0];
  const errorAnim = useState(new Animated.Value(0))[0];
  const [selectedFriends, setSelectedFriends] = useState<FriendData[]>([]);
  const [showAddTask, setShowAddTask] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = windowWidth >= 768;

  // Add loading state
  const [isLoading, setIsLoading] = useState(true);

  const queryClient = useQueryClient();

  const { data: friends = [], isLoading: isLoadingFriends } = useFriends(user?.uid);

  // First, add a state to track if we should reopen the create routine modal
  const [shouldReopenCreateModal, setShouldReopenCreateModal] = useState(false);

  // Add state for other modals
  const [showInfo, setShowInfo] = useState(false);
  const [showFriendSelector, setShowFriendSelector] = useState(false);

  // Add validation state
  const [validationMessage, setValidationMessage] = useState<string>('');

  // Add this check for whether user is creator
  const isCreator = routine?.createdBy === user?.uid;

  // Disable editing if not creator
  const isReadOnly = isEditMode && !isCreator;

  // Add validation check function
  const validateRoutine = () => {
    if (!currentRoutine.name.trim()) {
      return "Please give your routine a name";
    }
    if (currentRoutine.tasks.length === 0) {
      return "Add at least one task to your routine";
    }
    return "";
  };

  // Load existing routine data if in edit mode
  useEffect(() => {
    const loadRoutine = async () => {
      setIsLoading(true);
      
      if (routine && user?.userData?.cachedRoutines) {
        
        const routineToEdit = routine;
        
        if (routineToEdit) {
          updateRoutineName(routineToEdit.title);
          updateRoutineDescription(routineToEdit.description || '');
          
          if (routineToEdit.tasks && routineToEdit.tasks.length > 0) {
            const formattedTasks = routineToEdit.tasks.map(task => ({
              ...task,
              days: task.days || [],
            }));
            updateRoutineTasks(formattedTasks);
          }
        } else {
          showErrorMessage('Routine not found');
        }
      } else {
        clearRoutine();
      }
      setIsLoading(false);
    };

    loadRoutine();
    
    return () => {
      clearRoutine();
    };
  }, [routine, user?.userData?.cachedRoutines]);

  // Add this useEffect to load friends
  useEffect(() => {
    const loadFriends = async () => {
      if (!user?.uid) return;
      
      try {
        const friendsList = await friendService.getFriendsList(user.uid);
      } catch (error) {
        console.error('Error loading friends:', error);
      }
    };

    loadFriends();
  }, [user?.uid]);

  // Update the return JSX to show loading state
  if (isEditMode && isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Simplify to just handle Add Task
  const handleAddRoutineTask = () => {
    console.log('Add Task button pressed');
    setShowAddTask(true);
    console.log('showAddTask set to:', true);
  };

  const handleTaskSelect = async (taskId: string, days: number[]) => {
    // Implement task selection logic
  };

  const handleTaskPress = (task: Partial<RoutineTask>) => {
    setSelectedTask(task);
    setShowDayPicker(true);
  };

  const handleDaySelect = (day: number) => {
    if (!selectedTask) return;

    setSelectedTask(prevTask => {
      if (!prevTask) return null;
      const currentDays = prevTask.days || [];
      const newDays = currentDays.includes(day)
        ? currentDays.filter(d => d !== day)
        : [...currentDays, day];
      return { ...prevTask, days: newDays };
    });

    // Update the task in the routine
    const updatedTasks = currentRoutine.tasks.map(task => {
      if (task.id === selectedTask.id) {
        const days = task.days.includes(day)
          ? task.days.filter(d => d !== day)
          : [...task.days, day];
        return { ...task, days };
      }
      return task;
    });

    updateRoutineTasks(updatedTasks);
  };

  const handleNameChange = (text: string) => {
    updateRoutineName(text);
  };

  const handleDescriptionChange = (text: string) => {
    updateRoutineDescription(text);
  };

  const handleSetAll = (taskId: string) => {
    const updatedTasks = currentRoutine.tasks.map(task => {
      if (task.id === taskId) {
        const allDaysSelected = task.days.length === 7;
        return {
          ...task,
          days: allDaysSelected ? [] : [0,1,2,3,4,5,6]
        };
      }
      return task;
    });
    updateRoutineTasks(updatedTasks);
  };

  const handleRemoveTask = (taskId: string) => {
    const updatedTasks = currentRoutine.tasks.filter(task => task.id !== taskId);
    updateRoutineTasks(updatedTasks);
  };

  const handleFriendSelect = (selectedIds: string[]) => {
    const selectedFriendData = friends.filter(friend => 
      selectedIds.includes(friend.userId)
    );
    setSelectedFriends(selectedFriendData);
  };

  const handleSave = async () => {
    if (!user?.uid) return;
    
    try {
      if (!currentRoutine.name.trim()) {
        throw new Error('Please enter a routine name');
      }

      if (currentRoutine.tasks.length === 0) {
        throw new Error('Please add at least one task to the routine');
      }

      // Declare newInvites at the top level of the try block
      let newInvites: string[] = [];
      const routineId = routine?.id || generateId();

      console.log('Starting routine save with:', {
        isEdit: !!routine?.id,
        selectedFriends: selectedFriends.map(f => ({ id: f.userId, name: f.username })),
        currentParticipants: routine?.participants || [],
        currentInvites: routine?.invites || []
      });

      const routineData: Partial<Routine> = {
        title: currentRoutine.name,
        description: currentRoutine.description,
        tasks: currentRoutine.tasks.map(task => ({
          ...task,
          routineId,
          routineName: currentRoutine.name,
        })),
        lastUpdated: Timestamp.now(),
      };

      if (!routine?.id) {
        // Creating new routine
        routineData.id = routineId;
        routineData.createdBy = user.uid;
        routineData.createdAt = Timestamp.now().toDate().getTime();
        routineData.participants = [user.uid];
        routineData.invites = selectedFriends.map(f => f.userId);
        routineData.active = true;
        
        await createRoutine(routineData);
      } else {
        // First update the routine
        console.log('Updating existing routine:', {
          routineId: routine.id,
          currentParticipants: routine.participants,
          currentInvites: routine.invites
        });

        await updateRoutine({ 
          routineId: routine.id, 
          updates: {
            ...routineData,
            // Include existing participants and invites to prevent overwriting
            participants: routine.participants,
            invites: routine.invites,
          }
        });

        // Then handle invites separately
        newInvites = selectedFriends
          .map(f => f.userId)
          .filter(id => {
            const isAlreadyParticipant = routine.participants.includes(id);
            const isAlreadyInvited = routine.invites.includes(id);
            
            // Get the existing notification for this user if any
            const existingNotification = Object.values(user.userData?.notifications || {})
              .find((notification: any) => 
                notification.type === NotificationType.ROUTINE_INVITE && 
                notification.routineId === routine.id &&
                notification.userId === id
              );
            
            const canBeInvited = !isAlreadyParticipant && 
              (!isAlreadyInvited || (existingNotification?.responded === true));

            console.log('Checking invite status for:', {
              userId: id,
              isAlreadyParticipant,
              isAlreadyInvited,
              existingNotification: existingNotification ? {
                id: existingNotification.id,
                responded: existingNotification.responded,
                status: existingNotification.status,
                userId: existingNotification.userId
              } : null,
              canBeInvited,
              currentParticipants: routine.participants,
              currentInvites: routine.invites,
              notificationsCount: Object.keys(user.userData?.notifications || {}).length
            });

            // If they're not a participant, allow re-invite
            return !isAlreadyParticipant;
          });

        console.log('Filtered new invites:', {
          newInvites,
          selectedFriends: selectedFriends.map(f => ({ id: f.userId, name: f.username })),
          existingParticipants: routine.participants,
          existingInvites: routine.invites
        });

        if (newInvites.length > 0) {
          try {
            // First update the routine's invites array - remove any existing invites for these users
            const updatedInvites = [
              ...(routine.invites || []).filter(id => !newInvites.includes(id)), 
              ...newInvites
            ];

            console.log('Updating routine invites:', {
              routineId: routine.id,
              currentInvites: routine.invites,
              newInvites,
              updatedInvites,
              removedInvites: routine.invites.filter(id => newInvites.includes(id))
            });

            // Update the routine first
            await routineService.updateRoutine({
              routineId: routine.id,
              updates: {
                invites: updatedInvites
              }
            });

            // Then create notifications
            console.log('Creating notifications for:', newInvites);
            
            for (const inviteeId of newInvites) {
              try {
                // Create new notification
                const notificationId = generateId();
                const notificationData = {
                  id: notificationId,
                  type: NotificationType.ROUTINE_INVITE,
                  userId: inviteeId,
                  routineId: routine.id,
                  routineName: currentRoutine.name,
                  inviterId: user.uid,
                  inviterName: user.userData?.displayName || 'Unknown',
                  inviterPhotoURL: user.userData?.photoURL,
                  routine: {
                    title: currentRoutine.name,
                    description: currentRoutine.description || '',
                    tasks: currentRoutine.tasks.map(task => ({
                      id: task.id,
                      title: task.title,
                      days: task.days,
                      description: task.description || '',
                    })),
                  },
                  responded: false,
                  read: false,
                  createdAt: Timestamp.now(),
                };

                console.log('Creating notification:', {
                  inviteeId,
                  notificationId,
                  notificationData
                });

                // Update both the notification and unreadNotifications counter in one operation
                const userRef = doc(db, "users", inviteeId);
                await updateDoc(userRef, {
                  [`notifications.${notificationId}`]: notificationData,
                  unreadNotifications: increment(1)
                });

                console.log('Successfully created notification for:', inviteeId);
              } catch (notifError) {
                console.error('Error creating notification:', {
                  inviteeId,
                  error: notifError
                });
              }
            }
          } catch (inviteError) {
            console.error('Error handling invites:', {
              error: inviteError,
              newInvites,
              routineId: routine.id
            });
          }
        }
      }

      // Reset and close
      clearRoutine();
      setSelectedFriends([]);
      onClose();
      
      // Show success message
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: routine?.id 
          ? `Routine updated successfully${newInvites.length ? ' and invites sent' : ''}`
          : 'Routine created successfully'
      });

      console.log('Routine save completed successfully', {
        routineId,
        newInvites
      });

      // Refresh routines list
      queryClient.invalidateQueries({ queryKey: ["routines", user.uid] });
    } catch (error) {
      console.error('Error in handleSave:', {
        error,
        routineId: routine?.id,
        selectedFriends: selectedFriends.map(f => f.userId)
      });
      showErrorMessage(error instanceof Error ? error.message : 'Failed to save routine');
    }
  };

  const handleDelete = async () => {
    if (!user?.uid || !routine?.id) return;
    
    try {
      await routineService.deleteRoutine(user.uid, routine.id);
      queryClient.invalidateQueries({ queryKey: ["routines", user.uid] });
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Routine deleted successfully'
      });
      onClose();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error instanceof Error ? error.message : 'Failed to delete routine'
      });
    }
  };

  const showSuccessMessage = (message: string) => {
    setSuccessMessage(message);
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        delay: 2000,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  };

  const showErrorMessage = (message: string) => {
    setErrorMessage(message);
    Animated.sequence([
      Animated.timing(errorAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(errorAnim, {
        toValue: 0,
        duration: 300,
        delay: 2000,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  };

  // Add this function to handle individual day toggles
  const handleDayToggle = (taskId: string, dayIndex: number, e: any) => {
    e.stopPropagation();
    const updatedTasks = currentRoutine.tasks.map(task => {
      if (task.id === taskId) {
        const newDays = task.days.includes(dayIndex)
          ? task.days.filter(d => d !== dayIndex)
          : [...task.days, dayIndex];
        return { ...task, days: newDays };
      }
      return task;
    });
    updateRoutineTasks(updatedTasks);
  };

  // Add this useEffect to monitor showAddTask changes
  useEffect(() => {
    console.log('showAddTask state changed:', showAddTask);
  }, [showAddTask]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[
          styles.modalContainer, 
          { backgroundColor: colors.background },
          isDesktop && styles.modalContainerDesktop
        ]}>
          {showAddTask ? (
            <View style={[styles.addTaskContainer, { backgroundColor: colors.background }]}>
              <AddTask
                visible={true}
                onClose={() => setShowAddTask(false)}
                type="routine"
                onTaskAdded={(task) => {
                  if (task) {
                    // Convert the selected task to a RoutineTask
                    const routineTask: RoutineTask = {
                      ...task,
                      routineId: '', // Will be set when routine is created
                      routineName: currentRoutine.name,
                      frequency: 'weekly',
                      order: currentRoutine.tasks.length,
                      participants: [user?.uid || ''],
                      days: [0,1,2,3,4,5,6], // Default to all days
                      createdAt: Timestamp.now(),
                      active: true,
                    };

                    // Add to routine tasks
                    updateRoutineTasks([...currentRoutine.tasks, routineTask]);
                    console.log('Added task to routine:', routineTask);
                  }
                  setShowAddTask(false);
                }}
              />
            </View>
          ) : showInfo ? (
            <View style={[styles.addTaskContainer, { backgroundColor: colors.background }]}>
              <InfoModal
                visible={true}
                onClose={() => setShowInfo(false)}
                title={INFO_CONTENT.routine.title}
                content={INFO_CONTENT.routine.content}
              />
            </View>
          ) : showFriendSelector ? (
            <View style={[styles.addTaskContainer, { backgroundColor: colors.background }]}>
              <FriendShareModal
                visible={true}
                onDismiss={() => setShowFriendSelector(false)}
                onShare={handleFriendSelect}
                friends={friends.map(friend => ({
                  id: friend.userId,
                  name: friend.displayName,
                  avatar: friend.photoURL
                }))}
              />
            </View>
          ) : (
            <>
              <TouchableOpacity 
                style={styles.closeButton} 
                onPress={onClose}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>

              <View style={styles.titleContainer}>
                <Text style={[styles.title, { color: colors.textPrimary }]}>
                  {routine?.id 
                    ? isReadOnly 
                      ? 'View Shared Routine'
                      : 'Edit Routine'
                    : 'Create Routine'
                  }
                </Text>
                <TouchableOpacity
                  onPress={() => setShowInfo(true)}
                  style={styles.infoButton}
                >
                  <Ionicons 
                    name="information-circle-outline" 
                    size={24} 
                    color={isReadOnly ? colors.textPrimary : colors.secondary} 
                  />
                </TouchableOpacity>
              </View>

              <ScrollView style={[styles.scrollView, { paddingBottom: 80 }]}>
                <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
                  {isReadOnly 
                    ? 'View routine details. Only the creator can make changes.'
                    : isEditMode 
                      ? 'Modify your routine by adjusting tasks and schedules. Changes will be updated for all participants.'
                      : 'Build your perfect routine by selecting tasks and setting their schedule. Share with friends to stay accountable and motivated.'}
                </Text>

                <View style={isDesktop && styles.desktopLayout}>
                  <View style={isDesktop && styles.desktopColumn}>
                    {/* Basic Info Section */}
                    <View style={[styles.card, { backgroundColor: colors.surface }]}>
                      <View style={styles.inputContainer}>
                        <Text style={[styles.label, { color: colors.textPrimary }]}>Routine Name</Text>
                        <TextInput
                          style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary }]}
                          value={currentRoutine.name}
                          onChangeText={handleNameChange}
                          placeholder="Enter routine name"
                          placeholderTextColor={colors.textSecondary}
                          editable={!isReadOnly}
                        />
                      </View>

                      <View style={styles.inputContainer}>
                        <Text style={[styles.label, { color: colors.textPrimary }]}>Description</Text>
                        <TextInput
                          style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary }]}
                          value={currentRoutine.description}
                          onChangeText={handleDescriptionChange}
                          placeholder="Enter description"
                          placeholderTextColor={colors.textSecondary}
                          multiline
                          numberOfLines={3}
                          editable={!isReadOnly}
                        />
                      </View>
                    </View>

                    {/* Friends Section */}
                    <View style={[styles.card, { backgroundColor: colors.surface }]}>
                      <Text style={[styles.label, { color: colors.textPrimary }]}>Share with Friends</Text>
                      <TouchableOpacity 
                        style={[styles.addFriendsButton, { backgroundColor: colors.background }]}
                        onPress={() => setShowFriendSelector(true)}
                        activeOpacity={0.7}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        disabled={isReadOnly}
                      >
                        <FontAwesome5 
                          name="user-friends" 
                          size={16} 
                          color={isReadOnly ? colors.textPrimary : colors.secondary} 
                        />
                        <Text style={[styles.addFriendsText, { 
                          color: isReadOnly ? colors.textPrimary : colors.secondary 
                        }]}>
                          {selectedFriends.length > 0 
                            ? `${selectedFriends.length} friend${selectedFriends.length === 1 ? '' : 's'} selected`
                            : 'Add Friends'}
                        </Text>
                      </TouchableOpacity>
                      
                      {selectedFriends.length > 0 && (
                        <View style={styles.selectedFriends}>
                          {selectedFriends.map((friend) => (
                            <View 
                              key={friend.userId} 
                              style={[styles.friendChip, { backgroundColor: colors.background }]}
                            >
                              <Text style={[styles.friendChipText, { color: colors.textPrimary }]}>
                                {friend.displayName}
                              </Text>
                              {!isReadOnly && (
                                <TouchableOpacity
                                  onPress={() => setSelectedFriends(prev => 
                                    prev.filter(f => f.userId !== friend.userId)
                                  )}
                                >
                                  <FontAwesome5 name="times" size={12} color={colors.textSecondary} />
                                </TouchableOpacity>
                              )}
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={isDesktop && styles.desktopColumn}>
                    {/* Tasks Section */}
                    <View style={[styles.card, { backgroundColor: colors.surface }]}>
                      <View style={styles.tasksSectionHeader}>
                        <Text style={[styles.label, { color: colors.textPrimary }]}>Tasks</Text>
                        {!isReadOnly && (
                          <TouchableOpacity 
                            style={[styles.addTaskButton, { backgroundColor: colors.secondary }]}
                            onPress={handleAddRoutineTask}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.addTaskText, { color: colors.primary }]}>
                              Add Task
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      <View style={styles.weeklySchedule}>
                        <View style={styles.headerRow}>
                          <View style={styles.daysHeader}>
                            {DAYS.map((day) => (
                              <View key={day} style={styles.dayColumn}>
                                <Text style={[styles.dayText, { color: colors.textPrimary }]}>{day}</Text>
                              </View>
                            ))}
                          </View>
                        </View>

                        <ScrollView 
                          style={styles.tasksScrollView}
                          showsVerticalScrollIndicator={true}
                        >
                          {currentRoutine.tasks.map((task) => (
                            <View key={task.id}>
                              <TouchableOpacity 
                                style={styles.taskRow}
                                onPress={() => handleTaskPress(task)}
                              >
                                <View style={styles.taskContentWrapper}>
                                  {/* Title row */}
                                  <View style={styles.titleRow}>
                                    <TouchableOpacity 
                                      onPress={(e) => {
                                        e.stopPropagation();
                                        handleRemoveTask(task.id);
                                      }}
                                      style={styles.removeButton}
                                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                      disabled={isReadOnly}
                                    >
                                      <FontAwesome5 
                                        name="times-circle" 
                                        size={16} 
                                        color={colors.error} 
                                      />
                                    </TouchableOpacity>
                                    <Text 
                                      style={[styles.taskText, { color: colors.textPrimary }]}
                                      numberOfLines={2}
                                      disabled={isReadOnly}
                                    >
                                      {task.title}
                                    </Text>
                                  </View>

                                  {/* Days row */}
                                  <View style={styles.daysRow}>
                                    <TouchableOpacity 
                                      style={styles.allButton}
                                      onPress={(e) => {
                                        e.stopPropagation();
                                        handleSetAll(task.id);
                                      }}
                                      disabled={isReadOnly}
                                    >
                                      <Text style={[styles.allButtonText, { color: colors.textPrimary }]}>all</Text>
                                    </TouchableOpacity>
                                    <View style={styles.daysContainer}>
                                      {DAYS.map((_, index) => (
                                        <TouchableOpacity
                                          key={index}
                                          style={styles.dayColumn}
                                          onPress={(e) => {
                                            e.stopPropagation();
                                            handleDayToggle(task.id, index, e);
                                          }}
                                          disabled={isReadOnly}
                                        >
                                          <FontAwesome5 
                                            name="check" 
                                            size={14}
                                            color={task.days.includes(index) 
                                              ? (isReadOnly ? colors.textPrimary : colors.secondary)
                                              : colors.textSecondary
                                          } 
                                          />
                                        </TouchableOpacity>
                                      ))}
                                    </View>
                                  </View>
                                </View>
                              </TouchableOpacity>
                            </View>
                          ))}
                        </ScrollView>
                      </View>
                    </View>
                  </View>
                </View>
              </ScrollView>

              {!isReadOnly && (
                <View style={[styles.buttonContainer, { backgroundColor: colors.background }]}>
                  {validationMessage && (
                    <Text style={[styles.errorMessage, { color: colors.error }]}>
                      {validationMessage}
                    </Text>
                  )}
                  {routine?.id && isCreator && (
                    <TouchableOpacity
                      style={[styles.deleteButton, { borderColor: colors.error }]}
                      onPress={handleDelete}
                      accessibilityLabel="Delete routine"
                      accessibilityRole="button"
                    >
                      <Text style={[styles.buttonText, { color: colors.error }]}>
                        Delete Routine
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity 
                    style={[
                      styles.createButton, 
                      { 
                        backgroundColor: colors.secondary,
                        opacity: validationMessage ? 0.5 : 1 
                      }
                    ]}
                    onPress={() => {
                      const message = validateRoutine();
                      if (message) {
                        setValidationMessage(message);
                        return;
                      }
                      handleSave();
                    }}
                    disabled={!!validationMessage}
                  >
                    <Text style={[styles.buttonText, { color: colors.primary }]}>
                      {routine?.id ? 'Save Changes' : 'Create Routine'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  weeklySchedule: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: 8,
  },
  tasksScrollView: {
    height: 224,
  },
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    paddingVertical: 8,
    paddingLeft: 40,
  },
  taskColumn: {
    flex: 2,
    paddingRight: 16,
  },
  daysHeader: {
    flex: 3,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingRight: 8,
  },
  daysContainer: {
    flex: 3,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingRight: 8,
  },
  dayColumn: {
    width: 32,
    alignItems: 'center',
    paddingVertical: 8,
    justifyContent: 'center',
  },
  headerText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  dayText: {
    fontWeight: '600',
    fontSize: 14,
  },
  taskRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  taskContentWrapper: {
    gap: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },
  daysRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  allButton: {
    width: 40,
    alignItems: 'center',
    paddingVertical: 4,
  },
  allButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  removeButton: {
    padding: 8,
    marginRight: 4,
  },
  taskText: {
    flex: 1,
    fontSize: 14,
  },
  addTaskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addTaskText: {
    fontSize: 14,
    fontWeight: '600',
  },
  createButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    padding: 20,
    borderRadius: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  dayButton: {
    padding: 12,
    borderRadius: 8,
    width: '30%',
    alignItems: 'center',
  },
  dayButtonText: {
    fontWeight: '500',
  },
  doneButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  setAllButton: {
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  setAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  taskNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  backButton: {
    padding: 8,
    marginLeft: 8,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  deleteButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  addFriendsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  addFriendsText: {
    fontSize: 14,
    fontWeight: '500',
  },
  selectedFriends: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  friendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  friendChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 16,
    width: '100%',
    maxWidth: 600,
    maxHeight: '90%',
    marginVertical: 20,
    marginHorizontal: Platform.OS === 'web' ? 20 : '5%',
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    zIndex: 1,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    // Add any necessary styles for the scroll view
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1.6,
  },
  instructionText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  modalContainerDesktop: {
    maxWidth: 1000,
    maxHeight: '80%',
  },
  desktopLayout: {
    flexDirection: 'row',
    gap: 24,
  },
  desktopColumn: {
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  validationText: {
    textAlign: 'center',
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  taskContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tasksSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoButton: {
    marginLeft: 8,
    padding: 4,
  },
  addTaskContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  errorMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
    position: 'absolute',
    top: -30,
    left: 16,
    right: 16,
  },
  readOnlyText: {
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 16,
    textAlign: 'center',
  },
});

export default CreateRoutine;
