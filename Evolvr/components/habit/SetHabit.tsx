import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Button, TextInput, RadioButton, Chip } from 'react-native-paper';
import { useAuth } from '@/context/AuthContext';
import { habitService } from '@/backend/services/habitService';
import { Habit } from '@/backend/types/Habit';
import { useHabits } from '@/hooks/queries/useHabits';
import { taskService } from '@/backend/services/taskService';
import type Task from '@/backend/types/Task';
import { categories } from '../../constants/categories';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { TaskStatus } from '@/backend/types/Task';
import { Timestamp } from "firebase/firestore";
import { generateId } from '@/utils/generateId';
import InfoModal from '@/components/shared/InfoModal';
import { INFO_CONTENT } from '@/constants/infoContent';
import Toast from 'react-native-toast-message';
import { useQueryClient } from '@tanstack/react-query';
import AddTask from '@/components/tasks/addTask';

interface SetHabitProps {
  visible: boolean;
  onClose: () => void;
  onHabitCreated: (habit: Habit) => void;
}

const COMMON_HABIT_TITLES = ["Quit Addiction", "Meditate", "Journal entry"];

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    width: '100%',
    maxWidth: 600,
    maxHeight: '85%',
    margin: 20,
    borderRadius: 15,
    overflow: 'visible',
    position: 'relative',
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
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
    padding: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1.6,
  },
  infoButton: {
    marginLeft: 8,
    padding: 4,
  },
  instructionText: {
    fontSize: 12,
    lineHeight: 20,
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    marginBottom: 12,
    fontSize: 14,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginVertical: 4,
  },
  taskText: {
    marginLeft: 12,
    flex: 1,
    fontSize: 14,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    borderTopWidth: 1,
    backgroundColor: 'transparent',
    marginTop: 20,
    zIndex: 1,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 8,
  },
  categoryScroll: {
    marginBottom: 8,
    flexGrow: 0,
  },
  categoryChip: {
    margin: 4,
    borderRadius: 20,
  },
  chipLabel: {
    fontSize: 12,
  },
  tasksContainer: {
    borderWidth: 1,
    borderRadius: 12,
    marginVertical: 8,
    maxHeight: 320,
  },
  tasksScroll: {
    padding: 8,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 16,
    opacity: 0.7,
  },
  inputContainer: {
    marginBottom: 16,
  },
  infoOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  infoContainer: {
    borderRadius: 12,
    padding: 20,
    maxHeight: '80%',
    width: '100%',
    maxWidth: 600,
  },
  infoScroll: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    paddingRight: 40,
  },
  infoButtonContainer: {
    padding: 16,
    borderTopWidth: 1,
    marginTop: 16,
  },
  infoSection: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 12,
  },
  scrollContent: {
    paddingBottom: Platform.OS === 'ios' ? 100 : 80,
  },
  selectedTaskContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  selectedTaskTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  changeTaskButton: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
  },
  changeTaskText: {
    fontSize: 14,
  },
  selectTaskButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  selectTaskText: {
    fontSize: 14,
  },
  selectedTaskDescription: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  taskHeader: {
    gap: 12,
  },
  taskTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskMetadata: {
    marginTop: 8,
    gap: 8,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metadataText: {
    fontSize: 12,
  },
  xpContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  xpBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  xpText: {
    fontSize: 12,
    fontWeight: '500',
  },
});

const HabitInfoModal = ({ visible, onClose, colors }: { 
  visible: boolean; 
  onClose: () => void;
  colors: any;
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={onClose}
  >
    <View style={[styles.infoOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
      <View style={[
        styles.infoContainer, 
        { 
          backgroundColor: colors.surface,
          margin: 20,
        }
      ]}>
        <TouchableOpacity 
          style={styles.closeButton} 
          onPress={onClose}
        >
          <Ionicons 
            name="close" 
            size={24} 
            color={colors.textSecondary} 
          />
        </TouchableOpacity>

        <ScrollView style={styles.infoScroll}>
          <Text style={[styles.infoTitle, { color: colors.textPrimary }]}>
            The Truth About Habit Formation 🌱
          </Text>
          
          <Text style={[styles.infoSection, { color: colors.textPrimary }]}>
            The 21-Day Myth 🤔
          </Text>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Have you ever heard that it takes 21 days to form a habit? This common belief comes from a misinterpretation of research by Dr. Maxwell Maltz, a plastic surgeon who observed that patients took around 21 days to adjust to physical changes.
          </Text>

          <Text style={[styles.infoSection, { color: colors.textPrimary }]}>
            How Long Does It Really Take? ⏳
          </Text>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            A 2009 study by Dr. Phillippa Lally found that on average, it takes 66 days for a behavior to become automatic. The timeline varies:{'\n\n'}
            • Simple habits form faster 🚀{'\n'}
            • Complex habits can take 18 to 254 days 📈{'\n'}
          </Text>

          <Text style={[styles.infoSection, { color: colors.textPrimary }]}>
            The Science Behind Success 🧠
          </Text>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Why do some people see faster results?{'\n\n'}
            • Consistency matters more than time ⚡️{'\n'}
            • Existing routines help accelerate formation 📅{'\n'}
            • Emotional rewards strengthen habits 🎯{'\n\n'}
            The Neuroscience:{'\n\n'}
            • Repetition strengthens neural pathways 🔄{'\n'}
            • Consistency in context solidifies habits 🎯{'\n'}
            • Rewards trigger dopamine release ⭐️{'\n'}
            • Identity shifts enhance commitment 🦋
          </Text>

          <Text style={[styles.infoSection, { color: colors.textPrimary }]}>
            Bottom Line 💫
          </Text>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Focus on persistence and building a system that makes your habits effortless, rather than counting days. Your commitment to showing up daily matters more than any arbitrary timeline. 🌟
          </Text>
        </ScrollView>

        <View style={[styles.infoButtonContainer, { borderTopColor: colors.border }]}>
          <Button 
            mode="contained"
            onPress={onClose}
            style={{ backgroundColor: colors.secondary }}
            textColor={colors.primary}
          >
            Got it! Let's build some habits! 💪
          </Button>
        </View>
      </View>
    </View>
  </Modal>
);

const getValidationMessage = (description: string, taskId: string) => {
  if (!description) return 'Please provide your motivation';
  if (!taskId) return 'Please select a task';
  return '';
};

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
  const isDesktop = windowWidth >= 768; // Breakpoint for desktop

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

  const textInputTheme = {
    colors: {
      onSurfaceVariant: colors.textSecondary,
      background: colors.background,
    }
  };

  const renderSelectedTask = () => {
    if (!selectedTask) return null;

    return (
      <View style={[styles.selectedTaskContainer, { backgroundColor: colors.surface }]}>
        <View style={styles.taskHeader}>
          <View style={styles.taskTitleRow}>
            <Text style={[styles.selectedTaskTitle, { color: colors.textPrimary }]}>
              {selectedTask.title}
            </Text>
            <TouchableOpacity 
              style={[styles.changeTaskButton, { borderColor: colors.border }]}
              onPress={() => setShowAddTask(true)}
            >
              <Text style={[styles.changeTaskText, { color: colors.textSecondary }]}>
                Change Task
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.selectedTaskDescription, { color: colors.textSecondary }]}>
            {selectedTask.description}
          </Text>

          <View style={styles.taskMetadata}>
            {/* Task Type */}
            <View style={styles.metadataItem}>
              <FontAwesome5 
                name={selectedTask.type === 'user-generated' ? 'user-edit' : 'tasks'} 
                size={12} 
                color={colors.textSecondary} 
              />
              <Text style={[styles.metadataText, { color: colors.textSecondary }]}>
                {selectedTask.type === 'user-generated' ? 'Custom Task' : 'System Task'}
              </Text>
            </View>

            {/* XP Categories */}
            <View style={styles.xpContainer}>
              {Object.entries(selectedTask.categoryXp || {}).map(([category, xp]) => (
                <View 
                  key={category}
                  style={[styles.xpBadge, { backgroundColor: colors.secondary + '20' }]}
                >
                  <Text style={[styles.xpText, { color: colors.secondary }]}>
                    {category}: {xp}XP
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>
    );
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
                <View style={styles.inputContainer}>
                  {!description && getValidationMessage(description, selectedTask?.id || '') && (
                    <Text style={[{ 
                      color: colors.error,
                      fontSize: 12,
                      marginBottom: 4,
                      marginTop: -8,
                    }]}>
                      {getValidationMessage(description, selectedTask?.id || '')}
                    </Text>
                  )}
                  <TextInput
                    label="What's your motivation?"
                    placeholder="e.g., To improve my health and energy levels"
                    value={description}
                    onChangeText={setDescription}
                    mode="outlined"
                    multiline
                    style={[
                      styles.input,
                      { 
                        backgroundColor: colors.surface,
                        minHeight: 80,
                        flexGrow: 1,
                      }
                    ]}
                    outlineColor={colors.border}
                    activeOutlineColor={colors.secondary}
                    textColor={colors.textPrimary}
                    placeholderTextColor={colors.textSecondary}
                    theme={textInputTheme}
                  />
                </View>
              </View>

              <View style={isDesktop && styles.desktopColumn}>
                <Text style={[styles.subtitle, { color: colors.textPrimary }]}>
                  Select a Task
                </Text>
                <View style={styles.inputContainer}>
                  {selectedTask ? (
                    renderSelectedTask()
                  ) : (
                    <TouchableOpacity
                      style={[styles.selectTaskButton, { backgroundColor: colors.surface }]}
                      onPress={() => setShowAddTask(true)}
                    >
                      <Text style={[styles.selectTaskText, { color: colors.textSecondary }]}>
                        Select a task for your habit
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={[styles.buttonContainer, { backgroundColor: colors.background }]}>
            <Button 
              mode="contained"
              onPress={handleSubmit}
              loading={isSubmitting}
              disabled={!description || !selectedTask || isSubmitting}
              style={[styles.button, { backgroundColor: colors.secondary }]}
              textColor={colors.primary}
            >
              {isSubmitting ? 'Creating Habit...' : 'Start 66-Day Challenge'}
            </Button>
          </View>
        </View>
      </View>

      <InfoModal
        visible={showInfo}
        onClose={() => setShowInfo(false)}
        title={INFO_CONTENT.habit.title}
        content={INFO_CONTENT.habit.content}
      />

      <AddTask
        visible={showAddTask}
        onClose={() => setShowAddTask(false)}
        type="habit"
        onTaskAdded={(task) => {
          if (task) {
            setSelectedTask(task);
          }
          setShowAddTask(false);
        }}
      />
    </Modal>
  );
}

