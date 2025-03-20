import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { Card } from "react-native-paper";
import { TaskType } from '@/backend/types/Task';
import ActiveTask from './activeTask';
import { useActiveTasks } from "@/hooks/queries/useActiveTasks";
import { useAuth } from "@/context/AuthContext";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import ErrorMessage from "@/components/errorHandlingMessages/errorMessage";
import { Ionicons } from '@expo/vector-icons';
import AddTask from '@/components/tasks/addTask';
import logger from '@/utils/logger';
import { Animated as RNAnimated } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useQueryClient } from '@tanstack/react-query';

export default function ActiveTasksList() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [isAddModalVisible, setIsAddModalVisible] = React.useState(false);
  const { tasks, isLoading, error, completeTask } = useActiveTasks(user?.uid);
  const queryClient = useQueryClient();

  const handleComplete = React.useCallback(async (taskId: string, type: TaskType) => {
    try {
      await completeTask({ taskId, type });
      
      // Force refetch of habits if it was a habit task
      if (type === "habit") {
        queryClient.invalidateQueries({ queryKey: ["habits", user?.uid] });
      }
    } catch (error) {
      // Error is handled by the mutation
    }
  }, [completeTask, queryClient, user?.uid]);

  logger.tasks("Tasks data updated", tasks);

  logger.dev("ActiveTasksList:", { 
    hasError: !!error,
    isLoading,
    taskCounts: {
      normal: tasks?.normalTasks?.length || 0,
      routine: tasks?.routineTasks?.length || 0,
      habit: tasks?.habitTasks?.length || 0,
      challenge: tasks?.challengeTasks?.length || 0
    }
  });

  const handleAddTask = () => {
    setIsAddModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsAddModalVisible(false);
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
        Today's Tasks
      </Text>
      <View style={styles.headerActions}>
        <Pressable
          onPress={handleAddTask}
          style={({ pressed }) => [
            styles.addButton,
            { 
              opacity: pressed ? 0.7 : 1,
              backgroundColor: colors.secondary
            }
          ]}
        >
          <Ionicons name="add" size={24} color={colors.primary} />
        </Pressable>
      </View>
    </View>
  );

  useEffect(() => {
    if (tasks?.routineTasks) {
      console.log('Routine tasks updated:', tasks.routineTasks.map(task => ({
        id: task.id,
        isCompleted: task.isCompleted,
        allCompleted: task.allCompleted,
        completions: task.completions,
        todayCompletions: task.todayCompletions
      })));
    }
  }, [tasks?.routineTasks]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message="Failed to load tasks" fadeAnim={new RNAnimated.Value(0)} />;
  }

  const renderSection = (title: string, sectionTasks: any[], type: TaskType) => {
    if (!sectionTasks?.length) return null;

    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {title}
        </Text>
        {sectionTasks.map((task, index) => {
          const uniqueKey = task.routineId 
            ? `${type}-${task.routineId}-${task.id}` 
            : task.habitId 
              ? `${type}-${task.habitId}-${task.id}` 
              : `${type}-${task.id}`;
          
          return (
            <View 
              key={uniqueKey}
              style={styles.taskCard}
            >
              <Card style={[styles.taskCardInner, { backgroundColor: colors.surface }]}>
                <ActiveTask
                  task={{ ...task, type }}
                  onComplete={() => handleComplete(task.id || task.taskId, type)}
                  participants={task.participants}
                />
              </Card>
            </View>
          );
        })}
      </View>
    );
  };

  const hasAnyTasks = !!(
    tasks.normalTasks?.length ||
    tasks.routineTasks?.length ||
    tasks.habitTasks?.length ||
    tasks.challengeTasks?.length
  );

  return (
    <View style={styles.container}>
      {renderHeader()}
      <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
        {new Date().toLocaleDateString('en-US', { 
          weekday: 'long',
          month: 'long',
          day: 'numeric'
        })}
      </Text>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!hasAnyTasks ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No active tasks for today
            </Text>
          </View>
        ) : (
          <>
            {renderSection("Daily Tasks", tasks.normalTasks, "normal")}
            {renderSection("Routine Tasks", tasks.routineTasks, "routine")}
            {renderSection("Habit Tasks", tasks.habitTasks, "habit")}
            {renderSection("Challenge Tasks", tasks.challengeTasks, "challenge")}
          </>
        )}
      </ScrollView>
      
      <AddTask 
        visible={isAddModalVisible}
        onClose={handleCloseModal}
        type="active"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 16, // Add some bottom padding
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 16,
    marginBottom: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addButton: {
    padding: 8,
    borderRadius: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
    paddingLeft: 4,
  },
  taskCard: {
    marginBottom: 12,
  },
  taskCardInner: {
    borderRadius: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    textAlign: "center",
    fontSize: 16,
    opacity: 0.7,
  },
});