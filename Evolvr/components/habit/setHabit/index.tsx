import React, { useState, useEffect } from 'react';
import { View, Modal, ScrollView, TouchableOpacity, Text, useWindowDimensions } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { habitService } from '@/backend/services/habitService';
import { Habit } from '@/backend/types/Habit';
import { useHabits } from '@/hooks/queries/useHabits';
import { taskService } from '@/backend/services/taskService';
import type Task from '@/backend/types/Task';
import { Ionicons } from '@expo/vector-icons';
import { Timestamp } from "firebase/firestore";
import { generateId } from '@/utils/generateId';
import Toast from 'react-native-toast-message';
import { useQueryClient } from '@tanstack/react-query';
import AddTask from '@/components/tasks/addTask';
import { SetHabitProps } from './types';
import { createStyles } from './styles';
import { HabitInfoModal } from './HabitInfoModal';
import { TaskSelector } from './TaskSelector';
import { HabitForm } from './HabitForm';

export default function SetHabit({ visible, onClose, onHabitCreated }: SetHabitProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [description, setDescription] = useState('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createHabit } = useHabits(user?.uid);
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = windowWidth >= 768;

  const styles = createStyles(colors, isDesktop);

  useEffect(() => {
    if (!visible) {
      resetForm();
    }
  }, [visible]);

  const resetForm = () => {
    setDescription('');
    setSelectedTask(null);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    
    if (!description) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please provide your motivation'
      });
      return;
    }
    if (!selectedTask) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please select a task'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const habitData = {
        title: selectedTask.title,
        reason: description,
        task: selectedTask,
      };

      const result = await createHabit(habitData);
      
      if (!result.success) {
        Toast.show({
          type: 'warning',
          text1: 'Cannot Create Habit',
          text2: result.error || 'Failed to create habit',
          position: 'bottom',
          visibilityTime: 3000,
        });
        return;
      }

      resetForm();
      onClose();

      Toast.show({
        type: 'success',
        text1: 'Habit Created',
        text2: 'Your 66-day journey begins now!',
        position: 'bottom'
      });
      
      if (onHabitCreated && result.habit) {
        onHabitCreated(result.habit);
      }

    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error instanceof Error ? error.message : 'An unexpected error occurred',
        position: 'bottom'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTaskAdded = (task?: Task) => {
    if (task) {
      setSelectedTask(task);
    }
    setShowAddTask(false);
  };

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
                Create New Habit
              </Text>
              <TouchableOpacity
                onPress={() => setShowInfo(true)}
                style={styles.infoButton}
              >
                <Ionicons name="information-circle-outline" size={24} color={colors.secondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
              Create a 66-day habit challenge to build lasting positive changes. Select a task to form your habit - completing it daily earns bonus XP and builds your streak.
            </Text>

            <View style={isDesktop && styles.desktopLayout}>
              <View style={isDesktop && styles.desktopColumn}>
                <HabitForm
                  description={description}
                  onDescriptionChange={setDescription}
                  onSubmit={handleSubmit}
                  isSubmitting={isSubmitting}
                  isValid={!!description && !!selectedTask}
                  colors={colors}
                />
              </View>

              <View style={isDesktop && styles.desktopColumn}>
                <TaskSelector
                  selectedTask={selectedTask}
                  onTaskSelect={setSelectedTask}
                  onAddTaskPress={() => setShowAddTask(true)}
                  colors={colors}
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </View>

      <HabitInfoModal
        visible={showInfo}
        onClose={() => setShowInfo(false)}
        colors={colors}
      />

      <AddTask
        visible={showAddTask}
        onClose={() => setShowAddTask(false)}
        type="habit"
        onTaskAdded={handleTaskAdded}
      />
    </Modal>
  );
} 