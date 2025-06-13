import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { useRoutine } from "@/context/RoutineContext";
import { useRoutines } from "@/hooks/queries/useRoutines";
import { useAuth } from "@/context/AuthContext";
import type { Routine, RoutineTask } from "@/backend/types/Routine";
import { Timestamp } from "firebase/firestore";
import { generateId } from "@/utils/generateId";
import Toast from "react-native-toast-message";
import { useQueryClient } from "@tanstack/react-query";
import InfoModal from "@/components/shared/InfoModal";
import { INFO_CONTENT } from "@/constants/infoContent";
import { useFriends } from "@/hooks/queries/useFriends";
import { FriendData } from "@/backend/types/Friend";
import type Task from "@/backend/types/Task";
import AddTask from "@/components/tasks/addTask";
import { Button } from "react-native-paper";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface Props {
  visible: boolean;
  onClose: () => void;
  routine: Routine;
  onRoutineUpdated?: (routine: Routine) => void;
}

const EditRoutine: React.FC<Props> = ({
  visible,
  onClose,
  routine,
  onRoutineUpdated,
}) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const {
    currentRoutine,
    updateRoutineName,
    updateRoutineDescription,
    updateRoutineTasks,
    clearRoutine,
  } = useRoutine();

  const { updateRoutine, isUpdating } = useRoutines(user?.uid);
  const { data: friends = [] } = useFriends(user?.uid);
  const queryClient = useQueryClient();

  const [selectedTask, setSelectedTask] = useState<Partial<RoutineTask> | null>(
    null
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedFriends, setSelectedFriends] = useState<FriendData[]>([]);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = windowWidth >= 768;

  // Initialize routine state when modal opens
  useEffect(() => {
    if (visible && routine) {
      updateRoutineName(routine.title);
      updateRoutineDescription(routine.description || "");
      if (routine.tasks && routine.tasks.length > 0) {
        updateRoutineTasks(routine.tasks);
      }
    } else {
      clearRoutine();
    }
  }, [visible, routine?.id]);

  const handleNameChange = (text: string) => {
    updateRoutineName(text);
  };

  const handleDescriptionChange = (text: string) => {
    updateRoutineDescription(text);
  };

  const handleTaskAdded = useCallback(
    (task?: Task) => {
      if (!task) return;

      if (currentRoutine.tasks.some((t) => t.id === task.id)) {
        Toast.show({
          type: "error",
          text1: "Task already added",
          text2: "You cannot add the same task twice to a routine.",
        });
        return;
      }

      const newTask: RoutineTask = {
        ...task,
        id: task.id || generateId(),
        title: task.title,
        description: task.description || "",
        days: [0, 1, 2, 3, 4, 5, 6],
        completed: false,
        routineId: routine.id,
        routineName: currentRoutine.name || routine.title,
        frequency: "weekly",
        order: currentRoutine.tasks.length,
        participants: routine.participants,
        createdAt: Timestamp.now(),
        createdBy: user?.uid || "",
        categories: task.categories || [],
        categoryXp: task.categoryXp || {},
        tags: task.tags || [],
        status: task.status,
        active: true,
        completions: {},
      };

      const updatedTasks = [...currentRoutine.tasks, newTask];
      updateRoutineTasks(updatedTasks);
      setShowAddTask(false);

      Toast.show({
        type: "success",
        text1: "Task added",
        text2: "The task was added to your routine.",
      });
    },
    [
      routine.id,
      routine.participants,
      user?.uid,
      currentRoutine.name,
      currentRoutine.tasks,
      updateRoutineTasks,
    ]
  );

  const handleRemoveTask = useCallback(
    (taskId: string) => {
      const updatedTasks = currentRoutine.tasks.filter(
        (task) => task.id !== taskId
      );
      updateRoutineTasks(updatedTasks);

      Toast.show({
        type: "success",
        text1: "Task removed",
        text2: "The task was removed from your routine.",
      });
    },
    [currentRoutine.tasks, updateRoutineTasks]
  );

  const handleDayToggle = useCallback(
    (taskId: string, displayIndex: number, e: any) => {
      e.stopPropagation();
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

  const handleSubmit = async () => {
    if (!currentRoutine.name?.trim()) {
      setErrorMessage("Please enter a title for your routine");
      return;
    }
    if (currentRoutine.tasks.length === 0) {
      setErrorMessage("Please add at least one task");
      return;
    }
    if (
      currentRoutine.tasks.some((task) => !task.days || task.days.length === 0)
    ) {
      setErrorMessage("Please select at least one day for each task");
      return;
    }

    setIsLoading(true);
    try {
      const formattedTasks = currentRoutine.tasks.map((task) => ({
        ...task,
        id: task.id || generateId(),
        title: task.title,
        active: true,
        days: task.days || [],
        participants: routine.participants,
        completions: task.completions || {},
        routineId: routine.id,
        routineName: currentRoutine.name.trim(),
        description: task.description || "",
        categoryXp: task.categoryXp || {},
        createdAt: task.createdAt || Timestamp.now(),
        createdBy: user?.uid || "",
        frequency: task.frequency || "weekly",
        order: task.order || currentRoutine.tasks.indexOf(task),
        categories: task.categories || [],
        tags: task.tags || [],
        status: task.status || "ACTIVE",
      }));

      const routineData: Partial<Routine> = {
        title: currentRoutine.name.trim(),
        description: currentRoutine.description?.trim(),
        tasks: formattedTasks,
        participants: [
          user?.uid || "",
          ...selectedFriends.map((f) => f.userId),
        ],
        active: true,
        invites: selectedFriends.map((f) => f.userId),
        metadata: routine.metadata,
      };

      const result = await updateRoutine({
        routineId: routine.id,
        updates: routineData,
      });

      queryClient.invalidateQueries({ queryKey: ["routines", user?.uid] });
      if (onRoutineUpdated && result) onRoutineUpdated(result);
      onClose();
    } catch (error) {
      setErrorMessage("Failed to update routine");
    } finally {
      setIsLoading(false);
    }
  };

  const renderDays = (task: RoutineTask) => {
    return (
      <View style={styles.daysRow}>
        <TouchableOpacity
          style={[styles.allButton, { borderColor: colors.border }]}
          onPress={() => handleSetAll(task.id)}
        >
          <Text style={[styles.allButtonText, { color: colors.textSecondary }]}>
            {task.days.length === 7 ? "Clear All" : "All Days"}
          </Text>
        </TouchableOpacity>
        <View style={styles.daysContainer}>
          {DAYS.map((day, displayIndex) => {
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
                Edit Routine
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
                      onPress={() => setShowAddTask(true)}
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
                      {currentRoutine.tasks.map((task: RoutineTask) => (
                        <View
                          key={task.id}
                          style={[
                            styles.taskItem,
                            { backgroundColor: colors.surfaceContainerLow },
                          ]}
                        >
                          <View style={styles.taskHeader}>
                            <View style={styles.taskTitleContainer}>
                              <Text
                                style={[
                                  styles.taskTitle,
                                  { color: colors.textPrimary },
                                ]}
                                numberOfLines={2}
                              >
                                {task.title}
                              </Text>
                            </View>
                            <TouchableOpacity
                              onPress={() => handleRemoveTask(task.id)}
                              style={styles.removeButton}
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

                      <TouchableOpacity
                        style={[
                          styles.addTaskButton,
                          { borderColor: colors.border },
                        ]}
                        onPress={() => setShowAddTask(true)}
                      >
                        <View style={styles.addTaskContent}>
                          <FontAwesome5
                            name="plus"
                            size={16}
                            color={colors.secondary}
                          />
                          <Text
                            style={[
                              styles.addTaskText,
                              { color: colors.secondary },
                            ]}
                          >
                            Add Another Task
                          </Text>
                        </View>
                      </TouchableOpacity>
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
              loading={isUpdating}
              disabled={
                !currentRoutine.name?.trim() ||
                currentRoutine.tasks.length === 0 ||
                isUpdating
              }
              style={[styles.button, { backgroundColor: colors.secondary }]}
              textColor={colors.surface}
            >
              {isUpdating ? "Saving..." : "Save Changes"}
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
});

export default EditRoutine;
