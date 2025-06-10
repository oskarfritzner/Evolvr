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
import { Button, TextInput as PaperTextInput } from "react-native-paper";
import { blue200 } from "react-native-paper/lib/typescript/styles/themes/v2/colors";

interface Friend {
  userId: string;
  displayName: string;
  photoURL?: string;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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
    addTaskToRoutine,
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
      }
      setIsLoading(false);
    };

    if (visible) {
      loadRoutine();
    }
  }, [routine, user?.userData?.cachedRoutines, visible]);

  // Single effect to handle modal visibility changes
  useEffect(() => {
    if (!visible) {
      // Reset all state when modal is closed
      setSelectedTask(null);
      setValidationMessage("");
      setShowInfo(false);
      setShowFriendSelector(false);
      setShowDayPicker(false);
      setShowAddTask(false);
      clearRoutine();
    }
  }, [visible]);

  // Success message animation effect
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
    (taskId: string, displayIndex: number, e: any) => {
      e.stopPropagation();
      // Convert display index (Mon=0) to storage index (Sun=0)
      const storageIndex = displayIndex === 6 ? 0 : displayIndex + 1;

      const updatedTasks = currentRoutine.tasks.map((task) => {
        if (task.id === taskId) {
          const newDays = task.days.includes(storageIndex)
            ? task.days.filter((d) => d !== storageIndex)
            : [...task.days, storageIndex];
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
    (task?: Task) => {
      console.log("CreateRoutine - handleTaskAdded called with task:", task);
      if (!task) {
        console.log("CreateRoutine - No task provided, returning");
        return;
      }

      // Create a complete RoutineTask with all required properties
      const newTask: RoutineTask = {
        ...task,
        id: task.id || generateId(),
        days: [0, 1, 2, 3, 4, 5, 6], // Default to all days selected
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

      console.log("CreateRoutine - Created new routine task:", newTask);
      console.log(
        "CreateRoutine - Current routine tasks:",
        currentRoutine.tasks
      );

      // Add the task to the routine using the context function
      console.log("CreateRoutine - Calling addTaskToRoutine");
      addTaskToRoutine(newTask);
      console.log("CreateRoutine - addTaskToRoutine completed");

      // Close the add task modal
      console.log("CreateRoutine - Closing AddTask modal");
      setShowAddTask(false);
    },
    [
      currentRoutine.tasks,
      currentRoutine.name,
      routine?.id,
      routine?.participants,
      user?.uid,
      addTaskToRoutine,
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
      <View style={styles.daysRow}>
        <TouchableOpacity
          style={[styles.allButton, { borderColor: colors.border }]}
          onPress={() => handleSetAll(task.id)}
          disabled={isReadOnly}
        >
          <Text style={[styles.allButtonText, { color: colors.textSecondary }]}>
            {task.days.length === 7 ? "Clear All" : "All Days"}
          </Text>
        </TouchableOpacity>
        <View style={styles.daysContainer}>
          {DAYS.map((day, displayIndex) => {
            // Convert display index (Mon=0) to storage index (Sun=0)
            const storageIndex = displayIndex === 6 ? 0 : displayIndex + 1;
            const isSelected = task.days.includes(storageIndex);
            return (
              <TouchableOpacity
                key={`${task.id}-${day}`}
                style={[
                  styles.dayChip,
                  { borderColor: colors.border },
                  isSelected && { backgroundColor: colors.secondary },
                ]}
                onPress={(e) => handleDayToggle(task.id, displayIndex, e)}
                disabled={isReadOnly}
              >
                <Text
                  style={[
                    styles.dayText,
                    {
                      color: isSelected ? colors.surface : colors.textSecondary,
                    },
                  ]}
                >
                  {day}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
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
      <View style={styles.overlay}>
        <View
          style={[
            styles.modalContainer,
            { backgroundColor: colors.surface },
            isDesktop && styles.modalContainerDesktop,
          ]}
        >
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
          >
            <View style={styles.titleContainer}>
              <Text style={[styles.title, { color: colors.secondary }]}>
                {isEditMode ? "Edit Routine" : "Create Routine"}
              </Text>
              <TouchableOpacity
                onPress={() => setShowInfo(true)}
                style={styles.infoButton}
              >
                <Ionicons
                  name="information-circle-outline"
                  size={24}
                  color={colors.secondary}
                />
              </TouchableOpacity>
            </View>

            <Text
              style={[styles.instructionText, { color: colors.textSecondary }]}
            >
              Create a routine to organize your recurring tasks. You can set
              specific days for each task and track your progress.
            </Text>

            <View style={isDesktop && styles.desktopLayout}>
              <View style={isDesktop && styles.desktopColumn}>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        color: colors.textPrimary,
                      },
                    ]}
                    placeholder="Enter routine name"
                    placeholderTextColor={colors.textSecondary}
                    value={currentRoutine.name}
                    onChangeText={handleNameChange}
                    editable={!isReadOnly}
                  />
                  <TextInput
                    style={[
                      styles.textArea,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        color: colors.textPrimary,
                      },
                    ]}
                    placeholder="Describe your routine (optional)"
                    placeholderTextColor={colors.textSecondary}
                    value={currentRoutine.description}
                    onChangeText={handleDescriptionChange}
                    multiline
                    numberOfLines={4}
                    editable={!isReadOnly}
                  />
                </View>
              </View>

              <View style={isDesktop && styles.desktopColumn}>
                <Text style={[styles.subtitle, { color: colors.textPrimary }]}>
                  Tasks
                </Text>
                <View style={styles.inputContainer}>
                  {currentRoutine.tasks.length === 0 ? (
                    <TouchableOpacity
                      style={[
                        styles.emptyState,
                        { borderColor: colors.border },
                      ]}
                      onPress={handleAddRoutineTask}
                      disabled={isReadOnly}
                    >
                      <Text
                        style={[
                          styles.emptyStateText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        No tasks added yet. Tap to add one!
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.taskList}>
                      {currentRoutine.tasks.map((task) => (
                        <View
                          key={task.id}
                          style={[
                            styles.taskItem,
                            { backgroundColor: colors.surfaceContainerLow },
                          ]}
                        >
                          <View style={styles.taskHeader}>
                            <TouchableOpacity
                              onPress={() => handleTaskPress(task)}
                              style={styles.taskTitleContainer}
                            >
                              <Text
                                style={[
                                  styles.taskTitle,
                                  { color: colors.textPrimary },
                                ]}
                                numberOfLines={2}
                              >
                                {task.title}
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handleRemoveTask(task.id)}
                              style={styles.removeButton}
                              disabled={isReadOnly}
                            >
                              <FontAwesome5
                                name="times"
                                size={16}
                                color={colors.error}
                              />
                            </TouchableOpacity>
                          </View>
                          {renderDays(task)}
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            </View>
          </ScrollView>

          <View
            style={[
              styles.buttonContainer,
              {
                backgroundColor: colors.surface,
                borderTopColor: colors.border,
              },
            ]}
          >
            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={isCreating || isUpdating}
              disabled={
                !currentRoutine.name.trim() ||
                currentRoutine.tasks.length === 0 ||
                isCreating ||
                isUpdating
              }
              style={[styles.button, { backgroundColor: colors.secondary }]}
              textColor={colors.surface}
            >
              {isCreating || isUpdating
                ? "Saving..."
                : isEditMode
                ? "Save Changes"
                : "Create Routine"}
            </Button>
          </View>
        </View>
      </View>

      <InfoModal
        visible={showInfo}
        onClose={() => setShowInfo(false)}
        title={INFO_CONTENT.routine.title}
        content={INFO_CONTENT.routine.content}
      />

      <AddTask
        visible={showAddTask}
        onClose={() => setShowAddTask(false)}
        type="routine"
        onTaskAdded={handleTaskAdded}
        title="Add Task to Routine"
        description="Select tasks to add to your routine. You can set specific days for each task later."
      />

      {renderDayPicker()}
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
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
  modalContainerDesktop: {
    ...Platform.select({
      web: {
        width: "90%",
        maxWidth: 800,
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
  closeButton: {
    padding: 8,
  },
  scrollView: {
    padding: 20,
  },
  scrollContent: {
    padding: 20,
  },
  titleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
  },
  infoButton: {
    padding: 4,
  },
  instructionText: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
  },
  desktopLayout: {
    flexDirection: "row",
    gap: 24,
  },
  desktopColumn: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 24,
  },
  input: {
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  textArea: {
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 100,
    textAlignVertical: "top",
  },
  taskList: {
    gap: 12,
  },
  taskItem: {
    borderRadius: 12,
    overflow: "hidden",
  },
  taskHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    paddingBottom: 8,
  },
  taskTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: "500",
    flex: 1,
    marginRight: 8,
  },
  removeButton: {
    padding: 8,
    borderRadius: 20,
  },
  daysRow: {
    padding: 16,
    paddingTop: 0,
  },
  allButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 8,
    alignSelf: "flex-start",
  },
  allButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  daysContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "space-between",
  },
  dayChip: {
    flex: 1,
    minWidth: "13%",
    maxWidth: 55,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
  },
  dayText: {
    fontSize: 14,
    fontWeight: "500",
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
  addTaskContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  addTaskText: {
    fontSize: 16,
    marginLeft: 8,
  },
  buttonContainer: {
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
  subtitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  emptyState: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  emptyStateText: {
    marginLeft: 8,
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
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
