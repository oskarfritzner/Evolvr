import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
  Modal, Animated, Platform, useWindowDimensions
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useRoutine } from '@/context/RoutineContext';
import { useRoutines } from '@/hooks/queries/useRoutines';
import { routineService } from '@/backend/services/routineServices';
import { useAuth } from '@/context/AuthContext';
import type { Routine, RoutineTask } from '@/backend/types/Routine';
import { Timestamp } from 'firebase/firestore';
import { generateId } from '@/utils/generateId';
import Toast from 'react-native-toast-message';
import { useQueryClient } from "@tanstack/react-query";
import InfoModal from '@/components/shared/InfoModal';
import { INFO_CONTENT } from '@/constants/infoContent';
import FriendShareModal from '@/components/common/FriendShareModal';
import { useFriends } from '@/hooks/queries/useFriends';
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
  onRoutineCreated?: (routine: Routine) => void;
}

const CreateRoutine: React.FC<Props> = ({ visible, onClose, routine, onRoutineCreated }) => {
  // 1. Context hooks
  const { colors } = useTheme();
  const { user } = useAuth();
  const { currentRoutine, updateRoutineName, updateRoutineDescription, updateRoutineTasks, clearRoutine } = useRoutine();
  
  // 2. Query hooks
  const { createRoutine, updateRoutine, isCreating, isUpdating } = useRoutines(user?.uid);
  const { data: friends = [], isLoading: isLoadingFriends } = useFriends(user?.uid);
  const queryClient = useQueryClient();

  // 3. State hooks
  const [selectedTask, setSelectedTask] = useState<Partial<RoutineTask> | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<FriendData[]>([]);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showFriendSelector, setShowFriendSelector] = useState(false);
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [validationMessage, setValidationMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // 4. Ref hooks
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const errorAnim = useRef(new Animated.Value(0)).current;

  // 5. Derived values
  const isEditMode = !!routine;
  const isCreator = routine?.createdBy === user?.uid;
  const isReadOnly = isEditMode && !isCreator;
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = windowWidth >= 768;

  // 6. Effect hooks
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

  useEffect(() => {
    if (!visible) {
      // Reset form when modal is closed
      setSelectedTask(null);
      setValidationMessage('');
      setShowAddTask(false);
      setShowInfo(false);
      setShowFriendSelector(false);
      setShowDayPicker(false);
    }
  }, [visible]);

  useEffect(() => {
    if (successMessage) {
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
    }
  }, [successMessage, fadeAnim]);

  useEffect(() => {
    if (errorMessage) {
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
    }
  }, [errorMessage, errorAnim]);

  // 7. Handlers
  const showSuccessMessage = useCallback((message: string) => {
    setSuccessMessage(message);
  }, []);

  const showErrorMessage = useCallback((message: string) => {
    setErrorMessage(message);
  }, []);

  const handleDayToggle = useCallback((taskId: string, dayIndex: number, e: any) => {
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
  }, [currentRoutine.tasks, updateRoutineTasks]);

  const handleAddRoutineTask = () => {
    setShowAddTask(true);
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

  const handleRemoveTask = useCallback((taskId: string) => {
    const updatedTasks = currentRoutine.tasks.filter(task => task.id !== taskId);
    updateRoutineTasks(updatedTasks);
  }, [currentRoutine.tasks, updateRoutineTasks]);

  const handleFriendSelect = useCallback((selectedIds: string[]) => {
    const selectedFriendData = friends.filter(friend => 
      selectedIds.includes(friend.userId)
    );
    setSelectedFriends(selectedFriendData);
  }, [friends]);

  const handleTaskAdded = useCallback((task: Task) => {
    setShowAddTask(false);
    
    // Create a complete RoutineTask with all required properties
    const newTask: RoutineTask = {
      id: task.id || generateId(),
      title: task.title,
      description: task.description || '',
      days: [],
      completed: false,
      routineId: routine?.id || '',
      routineName: currentRoutine.name || '',
      frequency: 'weekly',
      order: currentRoutine.tasks.length,
      participants: routine?.participants || [user?.uid || ''],
      createdAt: Timestamp.now(),
      createdBy: user?.uid || '',
      categories: task.categories || [],
      categoryXp: task.categoryXp || {},
      tags: task.tags || [],
      status: task.status,
    };
    
    const updatedTasks = [...currentRoutine.tasks, newTask];
    updateRoutineTasks(updatedTasks);
  }, [currentRoutine.tasks, currentRoutine.name, routine?.id, routine?.participants, user?.uid, updateRoutineTasks]);

  const handleSubmit = async () => {
    // Validate the form
    if (!currentRoutine.name.trim()) {
      setValidationMessage('Please enter a title for your routine');
      return;
    }

    // Check if each task has at least one day selected
    const hasInvalidTask = currentRoutine.tasks.some(task => task.days.length === 0);
    if (hasInvalidTask) {
      setValidationMessage('Please select at least one day for each task');
      return;
    }

    setValidationMessage('');
    setIsLoading(true);

    try {
      const routineData: Partial<Routine> = {
        title: currentRoutine.name.trim(),
        description: currentRoutine.description.trim(),
        tasks: currentRoutine.tasks,
        createdBy: user?.uid || '',
        createdAt: new Date().getTime(), // Using timestamp as number
        participants: selectedFriends.map(f => f.userId),
        active: true,
        invites: selectedFriends.map(f => f.userId),
      };

      let result;
      
      if (isEditMode && routine?.id) {
        // Update existing routine
        result = await updateRoutine({
          routineId: routine.id,
          updates: routineData
        });
        
        // Show success message
        showSuccessMessage('Routine updated successfully');
        Toast.show({
          type: 'success',
          text1: 'Routine updated successfully',
        });
      } else {
        // Create new routine
        routineData.id = generateId();
        result = await createRoutine(routineData as Routine);
        
        // Show success message
        showSuccessMessage('Routine created successfully');
        Toast.show({
          type: 'success',
          text1: 'Routine created successfully',
        });
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['routines', user?.uid] });
      
      // Notify parent component
      if (onRoutineCreated && result) {
        onRoutineCreated(result);
      }

      // Close modal after a brief delay
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error) {
      console.error('Error saving routine:', error);
      showErrorMessage('Failed to save routine');
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to save routine',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFriendShare = () => {
    setShowFriendSelector(true);
  };

  // 8. Render methods
  const renderDays = (task: RoutineTask) => {
    return (
      <View style={styles.daysContainer}>
        {DAYS.map((day, index) => (
          <TouchableOpacity
            key={`${task.id}-${day}`}
            style={[
              styles.dayChip,
              task.days.includes(index) && { backgroundColor: colors.primary }
            ]}
            onPress={(e) => handleDayToggle(task.id, index, e)}
            disabled={isReadOnly}
          >
            <Text style={[
              styles.dayText,
              task.days.includes(index) && { color: colors.background }
            ]}>
              {day}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderDayPicker = () => {
    if (!selectedTask) return null;
    
    return (
      <Modal
        visible={showDayPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDayPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDayPicker(false)}
        >
          <View 
            style={[
              styles.dayPickerContainer,
              { backgroundColor: colors.surface }
            ]}
          >
            <Text style={[styles.dayPickerTitle, { color: colors.textPrimary }]}>
              Select Days for {selectedTask.title}
            </Text>
            
            <View style={styles.daysContainer}>
              {DAYS.map((day, index) => {
                const isSelected = selectedTask.days?.includes(index) || false;
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dayChip,
                      isSelected ? { backgroundColor: colors.secondary } : { backgroundColor: colors.surface }
                    ]}
                    onPress={() => handleDaySelect(index)}
                  >
                    <Text style={[
                      styles.dayText,
                      isSelected ? { color: colors.background } : { color: colors.secondary }
                    ]}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            
            <TouchableOpacity
              style={[styles.selectAllButton, { backgroundColor: colors.secondary }]}
              onPress={() => {
                if (selectedTask && selectedTask.id) {
                  handleSetAll(selectedTask.id);
                }
              }}
            >
              <Text style={[styles.selectAllText, { color: colors.background }]}>
                {selectedTask.days?.length === 7 ? 'Clear All' : 'Select All'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.doneButton, { backgroundColor: colors.secondary }]}
              onPress={() => setShowDayPicker(false)}
            >
              <Text style={[styles.doneText, { color: colors.background }]}>
                Done
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  return (
    <Modal
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
      animationType="slide"
    >
      <View style={[styles.modalContainer, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <View style={styles.titleContainer}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {isEditMode ? 'Edit Routine' : 'Create Routine'}
              </Text>
              <TouchableOpacity onPress={() => setShowInfo(true)} style={styles.infoButton}>
                <Ionicons name="information-circle-outline" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent}>
            <View style={styles.formSection}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Basic Information</Text>
              <TextInput
                style={[
                  styles.input,
                  { 
                    backgroundColor: colors.surface, 
                    color: colors.textPrimary,
                    borderColor: colors.border 
                  }
                ]}
                placeholder="Routine Name"
                placeholderTextColor={colors.textSecondary}
                value={currentRoutine.name}
                onChangeText={handleNameChange}
                editable={!isReadOnly}
              />
              <TextInput
                style={[
                  styles.input, 
                  styles.multilineInput,
                  { 
                    backgroundColor: colors.surface, 
                    color: colors.textPrimary,
                    borderColor: colors.border 
                  }
                ]}
                placeholder="Description (optional)"
                placeholderTextColor={colors.textSecondary}
                value={currentRoutine.description}
                onChangeText={handleDescriptionChange}
                multiline
                editable={!isReadOnly}
              />
            </View>

            <View style={styles.formSection}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Tasks</Text>
                {!isReadOnly && (
                  <TouchableOpacity
                    style={[styles.addButton, { backgroundColor: colors.primary }]}
                    onPress={handleAddRoutineTask}
                  >
                    <Text style={[styles.addButtonText, { color: colors.background }]}>Add Task</Text>
                  </TouchableOpacity>
                )}
              </View>

              {currentRoutine.tasks.length === 0 ? (
                <View style={styles.emptyTasks}>
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    No tasks added yet. Add tasks to your routine.
                  </Text>
                </View>
              ) : (
                <View style={styles.tasksList}>
                  {currentRoutine.tasks.map((task) => (
                    <View key={task.id} style={[styles.taskItem, { backgroundColor: colors.surface }]}>
                      <TouchableOpacity
                        style={styles.taskContent}
                        onPress={() => handleTaskPress(task)}
                        disabled={isReadOnly}
                      >
                        <Text style={[styles.taskTitle, { color: colors.textPrimary }]}>{task.title}</Text>
                        <View style={styles.daysContainer}>
                          {DAYS.map((day, index) => (
                            <TouchableOpacity
                              key={index}
                              style={[
                                styles.dayChip,
                                task.days.includes(index) 
                                  ? { backgroundColor: colors.primary } 
                                  : { backgroundColor: colors.surface }
                              ]}
                              onPress={(e) => handleDayToggle(task.id, index, e)}
                              disabled={isReadOnly}
                            >
                              <Text
                                style={[
                                  styles.dayText,
                                  task.days.includes(index) 
                                    ? { color: colors.background } 
                                    : { color: colors.textSecondary }
                                ]}
                              >
                                {day}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </TouchableOpacity>
                      
                      {!isReadOnly && (
                        <View style={styles.taskActions}>
                          <TouchableOpacity 
                            style={styles.taskActionButton}
                            onPress={() => handleSetAll(task.id)}
                          >
                            <Text style={[styles.taskActionText, { color: colors.primary }]}>
                              {task.days.length === 7 ? 'Clear All' : 'Select All'}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={styles.taskActionButton}
                            onPress={() => handleRemoveTask(task.id)}
                          >
                            <Ionicons name="trash-outline" size={20} color={colors.error} />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>

            {!isReadOnly && (
              <View style={styles.formSection}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Share with Friends</Text>
                  <TouchableOpacity 
                    style={[styles.addButton, { backgroundColor: colors.primary }]}
                    onPress={() => setShowFriendSelector(true)}
                  >
                    <Text style={[styles.addButtonText, { color: colors.background }]}>
                      {selectedFriends.length > 0 ? 'Edit Friends' : 'Select Friends'}
                    </Text>
                  </TouchableOpacity>
                </View>
                
                {selectedFriends.length > 0 ? (
                  <View style={styles.friendsList}>
                    {selectedFriends.map((friend) => (
                      <View key={friend.userId} style={[styles.friendChip, { backgroundColor: colors.surface }]}>
                        <Text style={[styles.friendName, { color: colors.textPrimary }]}>{friend.displayName}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyFriends}>
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                      No friends selected. Select friends to share this routine with.
                    </Text>
                  </View>
                )}
              </View>
            )}

            {validationMessage ? (
              <Text style={[styles.validationMessage, { color: colors.error }]}>
                {validationMessage}
              </Text>
            ) : null}

            {!isReadOnly && (
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.primary }]}
                onPress={handleSubmit}
                disabled={isCreating || isUpdating}
              >
                <Text style={[styles.saveButtonText, { color: colors.background }]}>
                  {isCreating || isUpdating 
                    ? 'Saving...' 
                    : isEditMode ? 'Update Routine' : 'Create Routine'}
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>

      <InfoModal
        visible={showInfo}
        onClose={() => setShowInfo(false)}
        title={INFO_CONTENT.routine.title}
        content={INFO_CONTENT.routine.content}
      />

      <FriendShareModal
        visible={showFriendSelector}
        onDismiss={() => setShowFriendSelector(false)}
        onShare={handleFriendSelect}
        friends={friends.map(f => ({
          id: f.userId,
          name: f.displayName,
          avatar: f.photoURL
        }))}
      />

      <AddTask
        visible={showAddTask}
        onClose={() => setShowAddTask(false)}
        type="routine"
        onTaskAdded={(task) => {
          if (task) {
            handleTaskAdded(task);
          }
        }}
        title="Add Task to Routine"
        description="Select tasks to add to your routine. You can set specific days for each task later."
      />

      {renderDayPicker()}
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    maxWidth: 400,
    borderRadius: 8,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginRight: 16,
  },
  infoButton: {
    padding: 4,
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: 16,
  },
  formSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 4,
    padding: 10,
    fontSize: 16,
  },
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyTasks: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 10,
  },
  tasksList: {
    flex: 1,
  },
  taskItem: {
    borderWidth: 1,
    borderRadius: 4,
    padding: 12,
    marginBottom: 10,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  dayChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
  },
  dayText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  taskActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  taskActionButton: {
    padding: 4,
  },
  taskActionText: {
    fontSize: 14,
  },
  friendsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  friendChip: {
    padding: 8,
    borderRadius: 4,
    margin: 4,
  },
  friendName: {
    fontSize: 14,
  },
  emptyFriends: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  validationMessage: {
    textAlign: 'center',
    marginVertical: 10,
    fontSize: 14,
  },
  saveButton: {
    padding: 12,
    borderRadius: 4,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  dayPickerContainer: {
    width: '80%',
    maxWidth: 400,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  dayPickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  selectAllButton: {
    padding: 10,
    borderRadius: 4,
    marginTop: 10,
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  doneButton: {
    padding: 10,
    borderRadius: 4,
    marginTop: 10,
  },
  doneText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default CreateRoutine;
