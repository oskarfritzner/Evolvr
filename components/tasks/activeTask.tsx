import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Pressable, Animated, Alert } from 'react-native';
import type Task from '@/backend/types/Task';
import { FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { UserData } from '@/backend/types/UserData';
import { TaskType } from '@/backend/types/Task';
import { RoutineTaskWithMeta, RoutineTask } from '@/backend/types/Routine';
import { ParticipantData } from '@/backend/types/Participant';
import { Avatar } from '@/components/Avatar';
import { MotiView } from 'moti';
import { MotiPressable } from 'moti/interactions';
import { Easing } from 'react-native-reanimated';
import { levelService } from '@/backend/services/levelService';
import { useAuth } from '@/context/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';

interface ActiveTaskProps {
  task: ((Task & { type: TaskType }) | RoutineTaskWithMeta) & {
    streak?: number;
  };
  onComplete?: (taskId: string) => void;
  participants?: ParticipantData[];
}

const ActiveTask: React.FC<ActiveTaskProps> = ({ task, onComplete, participants }) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [isCompleting, setIsCompleting] = useState(false);
  const queryClient = useQueryClient();

  // Get participants either from props or from task
  const taskParticipants = participants || ('participants' in task ? task.participants : []);

  // Get today's date string for checking completions
  const today = new Date().toISOString().split('T')[0];

  // Check if task is a routine task and has completions
  const routineTask = task as RoutineTaskWithMeta;
  const todayCompletions = routineTask.routineId ? 
    routineTask.completions?.[today] || [] : [];

  const handleComplete = async () => {
    if (isCompleting || !user?.uid) return;
    
    try {
      setIsCompleting(true);
      
      if (onComplete) {
        await onComplete(task.id);
      }
    } catch (error) {
      console.error('Error completing task:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error instanceof Error ? error.message : 'Failed to complete task',
      });
    } finally {
      setIsCompleting(false);
    }
  };

  // Disable the button if task is already completing or user has already completed it
  const isDisabled = isCompleting || (user?.uid && todayCompletions.some(c => c.completedBy === user.uid));

  const renderParticipants = (taskParticipants: ParticipantData[]) => {
    if (!taskParticipants?.length) return null;

    return (
      <View style={styles.participantsContainer}>
        {taskParticipants.slice(0, 3).map((participant, index) => (
          <View 
            key={`${participant.id}-${index}`}
            style={[
              styles.participantWrapper,
              { 
                marginLeft: index > 0 ? -10 : 0,
                borderColor: colors.surface 
              }
            ]}
          >
            <Avatar 
              size={24}
              uri={participant.photoURL}
            />
            {todayCompletions.some(c => c.completedBy === participant.id) ? (
              <View style={[styles.completedOverlay, { backgroundColor: colors.surface + '99' }]}>
                <FontAwesome5 name="check" size={12} color={colors.secondary} />
              </View>
            ) : (
              <View style={[styles.incompleteMask, { backgroundColor: colors.surface + '40' }]} />
            )}
          </View>
        ))}
        {taskParticipants.length > 3 && (
          <View style={[
            styles.moreParticipants, 
            { 
              backgroundColor: colors.primary,
              marginLeft: -10,
              borderColor: colors.surface 
            }
          ]}>
            <Text style={[styles.moreParticipantsText, { color: colors.surface }]}>
              +{taskParticipants.length - 3}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const getTaskSource = () => {
    const sourceIcon = {
      routine: 'calendar-check',
      habit: 'bolt',
      challenge: 'trophy',
      normal: 'tasks',
    }[task.type || 'normal'];

    let sourceName = '';
    
    if ('routineTitle' in task) {
      sourceName = task.routineTitle;
    } else if ('challengeTitle' in task) {
      sourceName = task.challengeTitle as string;
    } else if (task.context?.name) {
      sourceName = task.context.name;
    }

    const taskType = task.type || 'normal';
    const displayName = sourceName || taskType.charAt(0).toUpperCase() + taskType.slice(1);

    return (
      <View style={styles.sourceRow}>
        <FontAwesome5 name={sourceIcon} size={12} color={colors.textSecondary} />
        <Text style={[styles.sourceText, { color: colors.textSecondary }]}>
          {displayName}
        </Text>
      </View>
    );
  };

  const renderHabitInfo = () => {
    if (task.type !== 'habit' || !task.streak) return null;
    
    return (
      <View style={styles.habitInfo}>
        <Text style={[styles.habitStreak, { color: colors.secondary }]}>
          {task.streak}d streak
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.content}>
        <View style={styles.leftContent}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={2}>
              {('taskName' in task ? task.taskName : task.title) || 'Untitled Task'}
            </Text>
            {getTaskSource()}
          </View>
          
          {/* XP badges */}
          <View style={styles.xpRow}>
            {Object.entries(task.categoryXp || {}).map(([category, xp]) => (
              <View 
                key={`${task.id}-${category}`}
                style={[styles.xpBadge, { backgroundColor: colors.secondary + '20' }]}
              >
                <Text style={[styles.xpText, { color: colors.secondary }]}>
                  {category}: {xp}XP
                </Text>
              </View>
            ))}
          </View>

          {renderHabitInfo()}
        </View>

        <View style={styles.participantsContainer}>
          {taskParticipants.map((participant, index) => (
            <View 
              key={`${participant.id}-${index}`}
              style={[
                styles.participantWrapper,
                { 
                  marginLeft: index > 0 ? -10 : 0,
                  borderColor: colors.surface 
                }
              ]}
            >
              <Avatar 
                size={24}
                uri={participant.photoURL}
              />
              {todayCompletions.some(c => c.completedBy === participant.id) && (
                <View style={[styles.completedOverlay, { backgroundColor: colors.surface + '99' }]}>
                  <FontAwesome5 name="check" size={12} color={colors.secondary} />
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Show completion overlay if all participants completed */}
        {task.allCompleted && (
          <View style={[styles.allCompletedOverlay, { backgroundColor: colors.surface + 'CC' }]}>
            <FontAwesome5 name="check-circle" size={24} color={colors.secondary} />
            <Text style={[styles.allCompletedText, { color: colors.textPrimary }]}>
              Completed by everyone
            </Text>
          </View>
        )}
      </View>

      {/* Complete button - disabled if user already completed */}
      <MotiPressable 
        onPress={handleComplete}
        disabled={isDisabled}
        style={[
          styles.completeButton,
          { 
            backgroundColor: isDisabled ? colors.disabled : colors.secondary,
            opacity: isDisabled ? 0.5 : 1
          }
        ]}
      >
        <FontAwesome5 
          name={isDisabled ? "check" : "check"}
          size={16} 
          color={colors.surface} 
        />
        <Text style={[styles.buttonText, { color: colors.surface }]}>
          {isDisabled ? "Completed" : "Complete"}
        </Text>
      </MotiPressable>
    </View>
  );
};

export default ActiveTask;

// Styles for the component
const styles = StyleSheet.create({
  container: {
    width: '100%',
    padding: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  leftContent: {
    flex: 1,
  },
  titleRow: {
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 6,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  sourceText: {
    fontSize: 13,
    opacity: 0.8,
  },
  xpRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
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
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  participantsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  participantWrapper: {
    position: 'relative', // For overlay positioning
    borderWidth: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  completedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  incompleteMask: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
  },
  moreParticipants: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  moreParticipantsText: {
    fontSize: 10,
    fontWeight: '600',
  },
  habitInfo: {
    marginTop: 8,
  },
  habitStreak: {
    fontSize: 12,
    fontWeight: '500',
  },
  allCompletedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  allCompletedText: {
    fontSize: 16,
    fontWeight: '600',
  },
});