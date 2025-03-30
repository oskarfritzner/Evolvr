import React, { useState, useEffect } from 'react';
import { View, Modal, ScrollView, TouchableOpacity, Text, useWindowDimensions } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { taskService } from '@/backend/services/taskService';
import type Task from '@/backend/types/Task';
import { Ionicons } from '@expo/vector-icons';
import { AddTaskProps } from './types';
import { createStyles } from './styles';
import { TaskFilters } from './TaskFilters';
import { TaskList } from './TaskList';
import { CreateTaskButton } from './CreateTaskButton';

export default function AddTask({ visible, onClose, type = 'task', onTaskAdded }: AddTaskProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = windowWidth >= 768;

  const styles = createStyles(colors, isDesktop);

  useEffect(() => {
    if (visible) {
      loadTasks();
    }
  }, [visible]);

  const loadTasks = async () => {
    try {
      setIsLoading(true);
      const tasks = await taskService.getAllTasks();
      setTasks(tasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTaskSelect = (task: Task) => {
    if (onTaskAdded) {
      onTaskAdded(task);
    }
    onClose();
  };

  const handleCreateTask = () => {
    // TODO: Implement task creation
    console.log('Create task');
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || Object.keys(task.categoryXp || {}).includes(selectedCategory);
    return matchesSearch && matchesCategory;
  });

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
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
          >
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
          >
            <View style={styles.titleContainer}>
              <Text style={[styles.title, { color: colors.secondary }]}>
                Select a Task
              </Text>
            </View>

            <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
              Choose a task to {type === 'habit' ? 'form your habit' : type === 'routine' ? 'add to your routine' : 'complete'}.
            </Text>

            <TaskFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedCategory={selectedCategory}
              onCategorySelect={setSelectedCategory}
              colors={colors}
            />

            <TaskList
              tasks={filteredTasks}
              onTaskSelect={handleTaskSelect}
              colors={colors}
            />

            <CreateTaskButton
              onPress={handleCreateTask}
              colors={colors}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
} 