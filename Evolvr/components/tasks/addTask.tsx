import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Animated,
  ScrollView,
  Modal,
  Dimensions,
  PanResponder,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";
import Task from "@/backend/types/Task";
import { taskService } from "@/backend/services/taskService";
import { FontAwesome5 } from "@expo/vector-icons";
import LittleTask from "@/components/tasks/littleTask";
import { useAuth } from "@/context/AuthContext";
import ErrorMessage from "@/components/errorHandlingMessages/errorMessage";
import { useRoutine } from "@/context/RoutineContext";
import { TextInput } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { SafeAreaView as SafeAreaViewRN } from "react-native-safe-area-context";
import { ChatModal } from "@/components/chat";

interface Props {
  visible: boolean;
  onClose: () => void;
  type: "active" | "routine" | "habit";
  mode?: "create" | "edit";
  onTaskAdded?: (task?: Task) => void;
  selectedTaskId?: string;
  title?: string;
  description?: string;
  filterPredicate?: (task: Task) => boolean;
}

const COMMON_HABIT_TITLES = ["Quit Addiction", "Meditate", "Journal entry"];

// Static styles outside component
const staticStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContainer: {
    width: "100%",
    height: "85%",
    maxHeight: "95%",
    minHeight: 300,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
    elevation: 5,
  },
  closeButton: {
    padding: 8,
  },
  safeArea: {
    flex: 1,
  },
  searchInput: {
    margin: 16,
    marginTop: 36,
    borderRadius: 8,
  },
  filtersContainer: {
    marginBottom: 8,
  },
  categoryFilters: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: "row",
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 80,
    alignItems: "center",
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: "500",
  },
  listContainer: {
    padding: 16,
    paddingTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
  },
  createTaskButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
    alignSelf: "flex-start",
  },
  createTaskButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  buttonIcon: {
    marginRight: 2,
  },
  myTasksChip: {
    backgroundColor: "transparent",
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 80,
    alignItems: "center",
  },
  description: {
    fontSize: 14,
    marginBottom: 16,
    paddingHorizontal: 16,
    lineHeight: 20,
  },
  dragIndicatorContainer: {
    padding: 16,
    alignItems: "center",
  },
  dragIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#ccc",
  },
});

const getContextSpecificTitle = (type: "active" | "routine" | "habit") => {
  switch (type) {
    case "habit":
      return "Select Habit Task";
    case "routine":
      return "Add Task to Routine";
    default:
      return "Add Task";
  }
};

const getContextSpecificDescription = (
  type: "active" | "routine" | "habit"
) => {
  switch (type) {
    case "habit":
      return "Choose a task to turn into a habit. This will be your daily goal for the next 66 days.";
    case "routine":
      return "Add tasks to your routine. You can set specific days for each task later.";
    default:
      return "Add a task to your active tasks list.";
  }
};

const AddTask: React.FC<Props> = ({
  visible,
  onClose,
  type,
  mode,
  onTaskAdded,
  selectedTaskId,
  title,
  description,
  filterPredicate,
}) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const fadeAnim = useState(new Animated.Value(0))[0];
  const [errorMessage, setErrorMessage] = useState("");
  const errorAnim = useState(new Animated.Value(0))[0];
  const { addTaskToRoutine } = useRoutine();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const translateY = useRef(new Animated.Value(0)).current;
  const screenHeight = Dimensions.get("screen").height;
  const queryClient = useQueryClient();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showUserTasks, setShowUserTasks] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5; // Only respond to clear vertical drags
      },
      onPanResponderGrant: () => {
        translateY.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          // Only allow downward drag
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100) {
          // If dragged down far enough, close the modal
          Animated.timing(translateY, {
            toValue: screenHeight,
            duration: 300,
            useNativeDriver: true,
          }).start(() => onClose());
        } else {
          // Otherwise, snap back to original position
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            damping: 15,
            mass: 1,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    loadTasks();
  }, [selectedCategory]);

  useEffect(() => {
    if (visible) {
      translateY.setValue(screenHeight); // Start from bottom
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        mass: 0.8,
      }).start();
    }
  }, [visible]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      let fetchedTasks: Task[] = [];

      if (selectedCategory) {
        fetchedTasks = await taskService.getTasksByCategory(selectedCategory);
      } else {
        // Get both system tasks and user-generated tasks
        fetchedTasks = await taskService.getAllTasks();
      }

      // For habits, ensure we include both habit-specific tasks and regular tasks
      if (type === "habit") {
        fetchedTasks = fetchedTasks.filter(
          (task) =>
            task.type === "habit" ||
            COMMON_HABIT_TITLES.includes(task.title) ||
            // Include regular tasks and user-generated tasks that can be turned into habits
            task.type === "user-generated" ||
            !task.type ||
            task.type === "normal"
        );
      }

      setTasks(fetchedTasks);
    } catch (error) {
      console.error("Error loading tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const showSuccessMessage = (message: string) => {
    setSuccessMessage(message);
    fadeAnim.setValue(0);

    // Slide down
    Animated.spring(fadeAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start(() => {
      // Slide back up after delay
      setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => setSuccessMessage(""));
      }, 1500);
    });
  };

  const showErrorMessage = (message: string) => {
    setErrorMessage(message);
    errorAnim.setValue(0);
    Animated.spring(errorAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
    }).start(() => {
      setTimeout(() => {
        Animated.timing(errorAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => setErrorMessage(""));
      }, 2000);
    });
  };

  const handleAddTask = async (taskId: string) => {
    if (!user?.uid) return;

    try {
      // Find the task in our filtered list
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      if (type === "habit") {
        // For habits, just pass the task back to the parent
        if (onTaskAdded) {
          onTaskAdded(task);
        }
        showSuccessMessage("Task selected for habit");
      } else {
        // For active tasks, add to active tasks list
        await taskService.addTaskToActive(user.uid, taskId);
        queryClient.invalidateQueries({ queryKey: ["activeTasks", user.uid] });
        showSuccessMessage("Task added to your active tasks!");
      }

      setTimeout(() => {
        onClose();
        if (onTaskAdded && type !== "habit") {
          onTaskAdded();
        }
      }, 1000);
    } catch (error) {
      console.error("Error adding task:", error);
      showErrorMessage(
        error instanceof Error ? error.message : "Failed to add task"
      );
    }
  };

  const handleAddToRoutine = (task: Task) => {
    console.log("AddTask - handleAddToRoutine called with task:", task);
    try {
      if (onTaskAdded) {
        console.log("AddTask - Calling onTaskAdded callback");
        onTaskAdded(task);
        console.log("AddTask - onTaskAdded callback completed");
        showSuccessMessage("Task added to routine!");
        setTimeout(() => {
          console.log("AddTask - Closing modal");
          onClose();
        }, 1000);
      } else {
        console.log("AddTask - onTaskAdded callback is not defined");
      }
    } catch (error) {
      console.error("AddTask - Error in handleAddToRoutine:", error);
      if (error instanceof Error) {
        showErrorMessage(error.message);
      } else {
        showErrorMessage("Failed to add task to routine");
      }
    }
  };

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.tags?.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      );

    const matchesCategory =
      !categoryFilter ||
      Object.entries(task.categoryXp).some(
        ([category, xp]) => category === categoryFilter && xp > 0
      );

    // Show all tasks when showUserTasks is false, only show user-generated when true
    const matchesUserFilter = showUserTasks
      ? task.type === "user-generated"
      : true;

    // For habits, we've already filtered in loadTasks
    const matchesType = type === "habit" ? true : true;

    const matchesPredicate = filterPredicate ? filterPredicate(task) : true;

    return (
      matchesSearch &&
      matchesCategory &&
      matchesUserFilter &&
      matchesType &&
      matchesPredicate
    );
  });

  const renderTaskItem = ({ item }: { item: Task }) => (
    <LittleTask
      task={item}
      type={type === "habit" ? "active" : type}
      selectedDays={type === "routine" ? [0, 1, 2, 3, 4, 5, 6] : undefined}
      onAddPress={async (taskId) => {
        if (type === "routine") {
          handleAddToRoutine(item);
        } else {
          await handleAddTask(taskId);
        }
      }}
    />
  );

  // Dynamic styles that depend on colors
  const dynamicStyles = StyleSheet.create({
    successContainer: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      alignItems: "center",
      paddingTop: 16,
      zIndex: 1000,
    },
    successMessage: {
      backgroundColor: colors.success || "#4CAF50",
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.15,
      shadowRadius: 3,
      elevation: 4,
    },
    successText: {
      color: "#fff",
      fontSize: 14,
      fontWeight: "500",
    },
  });

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={staticStyles.overlay}>
        <Animated.View
          style={[
            staticStyles.modalContainer,
            { backgroundColor: colors.background },
            {
              transform: [{ translateY }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          <View style={staticStyles.dragIndicatorContainer}>
            <View
              style={[
                staticStyles.dragIndicator,
                { backgroundColor: colors.border },
              ]}
            />
          </View>

          <SafeAreaViewRN style={staticStyles.safeArea}>
            <View style={staticStyles.headerContainer}>
              <View style={staticStyles.headerTop}>
                <Text
                  style={[staticStyles.title, { color: colors.textPrimary }]}
                >
                  {title || getContextSpecificTitle(type)}
                </Text>
                <TouchableOpacity
                  style={staticStyles.closeButton}
                  onPress={onClose}
                >
                  <Ionicons
                    name="close"
                    size={24}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <Text
              style={[
                staticStyles.description,
                { color: colors.textSecondary },
              ]}
            >
              {description || getContextSpecificDescription(type)}
            </Text>

            <TextInput
              placeholder="Search tasks..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              mode="outlined"
              style={[staticStyles.searchInput]}
              theme={{
                colors: {
                  background: colors.surfaceContainerLow,
                  placeholder: colors.textSecondary,
                  text: colors.textPrimary,
                  primary: colors.secondary,
                },
              }}
            />

            <View style={staticStyles.filtersContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={staticStyles.categoryFilters}
              >
                <TouchableOpacity
                  style={[
                    staticStyles.myTasksChip,
                    {
                      backgroundColor: showUserTasks
                        ? colors.secondary + "20"
                        : "transparent",
                      borderColor: showUserTasks
                        ? colors.secondary
                        : colors.border,
                    },
                  ]}
                  onPress={() => setShowUserTasks(!showUserTasks)}
                >
                  <Text
                    style={[
                      staticStyles.categoryChipText,
                      {
                        color: showUserTasks
                          ? colors.secondary
                          : colors.textSecondary,
                      },
                    ]}
                  >
                    My Tasks
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>

            {loading ? (
              <View style={staticStyles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.secondary} />
              </View>
            ) : tasks.length === 0 ? (
              <View style={staticStyles.emptyContainer}>
                <Text
                  style={[
                    staticStyles.emptyText,
                    { color: colors.textSecondary },
                  ]}
                >
                  No tasks found
                </Text>
              </View>
            ) : (
              <FlatList
                data={tasks}
                renderItem={renderTaskItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={staticStyles.listContainer}
                showsVerticalScrollIndicator={false}
              />
            )}
          </SafeAreaViewRN>
        </Animated.View>
      </View>

      <ChatModal
        visible={isChatOpen}
        onClose={() => {
          setIsChatOpen(false);
          loadTasks(); // Reload tasks to show any new ones
        }}
        mode="taskCreator"
      />
    </Modal>
  );
};

export default AddTask;
