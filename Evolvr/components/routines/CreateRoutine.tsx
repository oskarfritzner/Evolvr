import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Animated,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { useRoutine } from "@/context/RoutineContext";
import { useRoutines } from "@/hooks/queries/useRoutines";
import { routineService } from "@/backend/services/routineServices";
import { useAuth } from "@/context/AuthContext";
import type { Routine, RoutineTask } from "@/backend/types/Routine";
import { Timestamp } from "firebase/firestore";
import { generateId } from "@/utils/generateId";
import Toast from "react-native-toast-message";
import { useQueryClient } from "@tanstack/react-query";
import InfoModal from "@/components/shared/InfoModal";
import { INFO_CONTENT } from "@/constants/infoContent";
import FriendShareModal from "@/components/common/FriendShareModal";
import { useFriends } from "@/hooks/queries/useFriends";
import { FriendData } from "@/backend/types/Friend";
import type Task from "@/backend/types/Task";
import AddTask from "@/components/tasks/addTask";

interface Friend {
  userId: string;
  displayName: string;
  photoURL?: string;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface Props {
  visible: boolean;
  onClose: () => void;
  routine?: Routine | null;
  onRoutineCreated?: (routine: Routine) => void;
}

const CreateRoutine: React.FC<Props> = ({
  visible,
  onClose,
  routine,
  onRoutineCreated,
}) => {
  // 1. Context hooks
  const { colors } = useTheme();
  const { user } = useAuth();
  const {
    currentRoutine,
    updateRoutineName,
    updateRoutineDescription,
    updateRoutineTasks,
    clearRoutine,
  } = useRoutine();

  // 2. Query hooks
  const { createRoutine, updateRoutine, isCreating, isUpdating } = useRoutines(
    user?.uid
  );
  const { data: friends = [], isLoading: isLoadingFriends } = useFriends(
    user?.uid
  );
  const queryClient = useQueryClient();

  // 3. State hooks
  const [selectedTask, setSelectedTask] = useState<Partial<RoutineTask> | null>(
    null
  );
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedFriends, setSelectedFriends] = useState<FriendData[]>([]);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showFriendSelector, setShowFriendSelector] = useState(false);
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [validationMessage, setValidationMessage] = useState<string>("");
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
          updateRoutineDescription(routineToEdit.description || "");
          if (routineToEdit.tasks && routineToEdit.tasks.length > 0) {
            const formattedTasks = routineToEdit.tasks.map((task) => ({
              ...task,
              days: task.days || [],
            }));
            updateRoutineTasks(formattedTasks);
          }
        } else {
          showErrorMessage("Routine not found");
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
      setValidationMessage("");
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
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          delay: 2000,
          useNativeDriver: Platform.OS !== "web",
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
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(errorAnim, {
          toValue: 0,
          duration: 300,
          delay: 2000,
          useNativeDriver: Platform.OS !== "web",
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

  const handleDayToggle = useCallback(
    (taskId: string, dayIndex: number, e: any) => {
      e.stopPropagation();
      const updatedTasks = currentRoutine.tasks.map((task) => {
        if (task.id === taskId) {
          const newDays = task.days.includes(dayIndex)
            ? task.days.filter((d) => d !== dayIndex)
            : [...task.days, dayIndex];
          return { ...task, days: newDays };
        }
        return task;
      });
      updateRoutineTasks(updatedTasks);
    },
    [currentRoutine.tasks, updateRoutineTasks]
  );

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

    setSelectedTask((prevTask) => {
      if (!prevTask) return null;
      const currentDays = prevTask.days || [];
      const newDays = currentDays.includes(day)
        ? currentDays.filter((d) => d !== day)
        : [...currentDays, day];
      return { ...prevTask, days: newDays };
    });

    // Update the task in the routine
    const updatedTasks = currentRoutine.tasks.map((task) => {
      if (task.id === selectedTask.id) {
        const days = task.days.includes(day)
          ? task.days.filter((d) => d !== day)
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
    const updatedTasks = currentRoutine.tasks.map((task) => {
      if (task.id === taskId) {
        const allDaysSelected = task.days.length === 7;
        return {
          ...task,
          days: allDaysSelected ? [] : [0, 1, 2, 3, 4, 5, 6],
        };
      }
      return task;
    });
    updateRoutineTasks(updatedTasks);
  };

  const handleRemoveTask = useCallback(
    (taskId: string) => {
      const updatedTasks = currentRoutine.tasks.filter(
        (task) => task.id !== taskId
      );
      updateRoutineTasks(updatedTasks);
    },
    [currentRoutine.tasks, updateRoutineTasks]
  );

  const handleFriendSelect = useCallback(
    (selectedIds: string[]) => {
      const selectedFriendData = friends.filter((friend) =>
        selectedIds.includes(friend.userId)
      );
      setSelectedFriends(selectedFriendData);
    },
    [friends]
  );

  const handleTaskAdded = useCallback(
    (task: Task) => {
      if (!task) return;

      // Create a complete RoutineTask with all required properties
      const newTask: RoutineTask = {
        id: task.id || generateId(),
        title: task.title,
        description: task.description || "",
        days: [],
        completed: false,
        routineId: routine?.id || "",
        routineName: currentRoutine.name || "",
        frequency: "weekly",
        order: currentRoutine.tasks.length,
        participants: routine?.participants || [user?.uid || ""],
        createdAt: Timestamp.now(),
        createdBy: user?.uid || "",
        categories: task.categories || [],
        categoryXp: task.categoryXp || {},
        tags: task.tags || [],
        status: task.status,
      };

      const updatedTasks = [...currentRoutine.tasks, newTask];
      updateRoutineTasks(updatedTasks);
      setShowAddTask(false);
    },
    [
      currentRoutine.tasks,
      currentRoutine.name,
      routine?.id,
      routine?.participants,
      user?.uid,
      updateRoutineTasks,
    ]
  );

  const handleSubmit = async () => {
    // Validate the form
    if (!currentRoutine.name.trim()) {
      setValidationMessage("Please enter a title for your routine");
      return;
    }

    // Check if each task has at least one day selected
    const hasInvalidTask = currentRoutine.tasks.some(
      (task) => task.days.length === 0
    );
    if (hasInvalidTask) {
      setValidationMessage("Please select at least one day for each task");
      return;
    }

    setValidationMessage("");
    setIsLoading(true);

    try {
      const routineData: Partial<Routine> = {
        title: currentRoutine.name.trim(),
        description: currentRoutine.description.trim(),
        tasks: currentRoutine.tasks,
        createdBy: user?.uid || "",
        createdAt: new Date().getTime(), // Using timestamp as number
        participants: selectedFriends.map((f) => f.userId),
        active: true,
        invites: selectedFriends.map((f) => f.userId),
      };

      let result;

      if (isEditMode && routine?.id) {
        // Update existing routine
        result = await updateRoutine({
          routineId: routine.id,
          updates: routineData,
        });

        // Show success message
        showSuccessMessage("Routine updated successfully");
        Toast.show({
          type: "success",
          text1: "Routine updated successfully",
        });
      } else {
        // Create new routine
        routineData.id = generateId();
        result = await createRoutine(routineData as Routine);

        // Show success message
        showSuccessMessage("Routine created successfully");
        Toast.show({
          type: "success",
          text1: "Routine created successfully",
        });
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["routines", user?.uid] });

      // Notify parent component
      if (onRoutineCreated && result) {
        onRoutineCreated(result);
      }

      // Close modal after a brief delay
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error) {
      console.error("Error saving routine:", error);
      showErrorMessage("Failed to save routine");
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to save routine",
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
              task.days.includes(index) && { backgroundColor: colors.primary },
            ]}
            onPress={(e) => handleDayToggle(task.id, index, e)}
            disabled={isReadOnly}
          >
            <Text
              style={[
                styles.dayText,
                task.days.includes(index) && { color: colors.background },
              ]}
            >
              {day}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderDayPicker = () => {
    if (!showDayPicker || !selectedTask) return null;

    const webGridStyle =
      Platform.OS === "web"
        ? ({
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
          } as any)
        : {};

    return (
      <Modal
        visible={showDayPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDayPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.dayPickerContainer,
              { backgroundColor: colors.surface },
            ]}
          >
            <Text
              style={[styles.dayPickerTitle, { color: colors.textPrimary }]}
            >
              Select Days for {selectedTask.title}
            </Text>
            <View style={[styles.dayPickerGrid, webGridStyle]}>
              {DAYS.map((day, index) => {
                const isSelected = selectedTask?.days?.includes(index) || false;
                return (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.dayButton,
                      {
                        backgroundColor: isSelected
                          ? colors.primary
                          : colors.surface,
                        borderColor: isSelected
                          ? colors.primary
                          : colors.border,
                      },
                    ]}
                    onPress={() => handleDaySelect(index)}
                  >
                    <Text
                      style={[
                        styles.dayButtonText,
                        {
                          color: isSelected
                            ? colors.background
                            : colors.textPrimary,
                        },
                      ]}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity
              style={[styles.doneButton, { backgroundColor: colors.secondary }]}
              onPress={() => setShowDayPicker(false)}
            >
              <Text style={[styles.doneText, { color: colors.surface }]}>
                Done
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View
          style={[styles.modalContent, { backgroundColor: colors.surface }]}
        >
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              {isEditMode ? "Edit Routine" : "Create Routine"}
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent}>
            <View style={styles.section}>
              <Text
                style={[styles.sectionTitle, { color: colors.textPrimary }]}
              >
                Basic Information
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surfaceContainerLow,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
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
                  styles.textArea,
                  {
                    backgroundColor: colors.surfaceContainerLow,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
                placeholder="Description (optional)"
                placeholderTextColor={colors.textSecondary}
                value={currentRoutine.description}
                onChangeText={handleDescriptionChange}
                multiline
                editable={!isReadOnly}
              />
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text
                  style={[styles.sectionTitle, { color: colors.textPrimary }]}
                >
                  Tasks
                </Text>
                {!isReadOnly && (
                  <TouchableOpacity
                    style={[
                      styles.addTaskButton,
                      {
                        backgroundColor: colors.surfaceContainerLow,
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={handleAddRoutineTask}
                  >
                    <Ionicons name="add" size={20} color={colors.secondary} />
                    <Text
                      style={[
                        styles.addTaskText,
                        { color: colors.textPrimary },
                      ]}
                    >
                      Add Task
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {currentRoutine.tasks.length === 0 ? (
                <Text
                  style={[styles.emptyText, { color: colors.textSecondary }]}
                >
                  No tasks added yet
                </Text>
              ) : (
                <View style={styles.taskList}>
                  {currentRoutine.tasks.map((task) => (
                    <TouchableOpacity
                      key={task.id}
                      style={[
                        styles.taskItem,
                        {
                          backgroundColor: colors.surfaceContainerLow,
                          borderColor: colors.border,
                        },
                      ]}
                      onPress={() => handleTaskPress(task)}
                    >
                      <Text
                        style={[
                          styles.taskTitle,
                          { color: colors.textPrimary },
                        ]}
                      >
                        {task.title}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {!isReadOnly && (
              <View style={[styles.footer, { borderTopColor: colors.border }]}>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: colors.secondary }]}
                  onPress={handleSubmit}
                  disabled={isCreating || isUpdating}
                >
                  <Text style={[styles.buttonText, { color: colors.surface }]}>
                    {isCreating || isUpdating
                      ? "Saving..."
                      : isEditMode
                      ? "Save Changes"
                      : "Create Routine"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          {validationMessage && (
            <Text style={[styles.validationMessage, { color: colors.error }]}>
              {validationMessage}
            </Text>
          )}

          <Animated.View
            style={[
              styles.successMessage,
              {
                opacity: fadeAnim,
                transform: [
                  {
                    translateY: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.successText}>{successMessage}</Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.errorMessage,
              {
                opacity: errorAnim,
                transform: [
                  {
                    translateY: errorAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.errorText}>{errorMessage}</Text>
          </Animated.View>
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
        friends={friends.map((f) => ({
          id: f.userId,
          name: f.displayName,
          avatar: f.photoURL,
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
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: "100%",
    maxWidth: 600,
    maxHeight: "90%",
    overflow: "hidden",
    ...Platform.select({
      web: {
        boxShadow:
          "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      },
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
      },
    }),
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "600",
  },
  closeButton: {
    padding: 8,
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  dayPickerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
    justifyContent: "space-between",
  },
  dayButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  dayButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  taskList: {
    marginTop: 16,
  },
  taskItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  taskContent: {
    gap: 12,
  },
  taskTitle: {
    flex: 1,
    fontSize: 16,
  },
  daysContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  dayChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  dayText: {
    fontSize: 12,
    fontWeight: "500",
  },
  taskActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  taskActionButton: {
    padding: 8,
  },
  taskActionText: {
    fontSize: 14,
    fontWeight: "500",
  },
  emptyTasks: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
  },
  friendsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  friendChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  friendName: {
    fontSize: 14,
  },
  emptyFriends: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  validationMessage: {
    color: "#ef4444",
    marginTop: 8,
    fontSize: 14,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  infoButton: {
    padding: 4,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  addTaskButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  addTaskText: {
    marginLeft: 8,
    fontSize: 16,
  },
  selectAllButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 24,
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: "600",
  },
  doneButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
  },
  doneText: {
    fontSize: 14,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  dayPickerContainer: {
    borderRadius: 16,
    padding: 24,
    width: "90%",
    maxWidth: 400,
  },
  dayPickerTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 24,
    textAlign: "center",
  },
  successMessage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    padding: 20,
    zIndex: 1000,
  },
  successText: {
    color: "#2ecc71",
    fontSize: 18,
    fontWeight: "600",
  },
  errorMessage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    padding: 20,
    zIndex: 1000,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 18,
    fontWeight: "600",
  },
});

// Add this CSS-in-JS style for web only
const webStyles = Platform.select({
  web: {
    dayPickerGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(7, 1fr)",
      gap: "8px",
    },
  },
  default: {},
});

export default CreateRoutine;
