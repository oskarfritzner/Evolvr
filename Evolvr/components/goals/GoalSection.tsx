import React, { useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView, Platform, Keyboard, KeyboardAvoidingView } from 'react-native';
import { Surface, Text, Button, TextInput, IconButton } from 'react-native-paper';
import { useTheme } from '@/context/ThemeContext';
import { Goal, GoalTimeframe, GoalStatus, GoalStep } from '@/backend/types/Goal';
import { goalService } from '@/backend/services/goalService';
import { useAuth } from '@/context/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { Timestamp } from 'firebase/firestore';

interface GoalSectionProps {
  title: string;
  goals: Goal[];
  timeframe: GoalTimeframe;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onEditGoal?: (goal: Goal) => void;
}

function generateId(): string {
  return `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function GoalSection({ 
  title, 
  goals = [], 
  timeframe,
  isExpanded = true,
  onToggleExpand,
  onEditGoal
}: GoalSectionProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [description, setDescription] = useState('');
  const [measurable, setMeasurable] = useState('');
  const [adjustingGoalId, setAdjustingGoalId] = useState<string | null>(null);

  function createEmptyGoal(): Goal {
    return {
      id: generateId(),
      userId: user?.uid || '',
      description: '',
      timeframe,
      status: GoalStatus.NOT_STARTED,
      progress: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
  }

  const handleSubmit = async () => {
    if (!description.trim() || !user?.uid) return;

    try {
      setIsSubmitting(true);
      const goalData: Partial<Goal> = {
        description: description.trim(),
        timeframe,
        status: GoalStatus.NOT_STARTED,
        progress: 0
      };

      if (measurable.trim()) {
        goalData.measurable = measurable.trim();
      }

      await goalService.createGoal(user.uid, goalData);
      await queryClient.invalidateQueries({ queryKey: ['goals', user.uid, timeframe] });
      
      setDescription('');
      setMeasurable('');
      setIsAdding(false);
      Toast.show({
        type: 'success',
        text1: 'Goal created successfully',
      });
    } catch (error) {
      console.error('Error creating goal:', error);
      Toast.show({
        type: 'error',
        text1: 'Failed to create goal',
        text2: 'Please try again',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteGoal = async (goal: Goal) => {
    if (!user?.uid) return;

    try {
      await goalService.updateGoalProgress(user.uid, goal.id, 100);
      queryClient.invalidateQueries({ queryKey: ['goals', user.uid, timeframe] });
      
      Toast.show({
        type: 'success',
        text1: 'Goal completed!',
        text2: 'Great job on achieving your goal.'
      });
    } catch (error) {
      console.error('Error completing goal:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to complete goal. Please try again.'
      });
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!user?.uid) return;
    try {
      await goalService.deleteGoal(user.uid, goalId);
      queryClient.invalidateQueries({ queryKey: ['goals', user.uid, timeframe] });
      Toast.show({
        type: 'success',
        text1: 'Goal deleted',
        text2: 'The goal has been removed.'
      });
    } catch (error) {
      console.error('Error deleting goal:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to delete goal. Please try again.'
      });
    }
  };

  const handleAdjustGoal = (goal: Goal) => {
    setDescription(goal.description);
    setMeasurable(goal.measurable || '');
    setAdjustingGoalId(goal.id);
    setIsAdding(true);
  };

  const getTimeframeInfo = () => {
    switch (timeframe) {
      case GoalTimeframe.DAILY:
        return "Daily goals are automatically archived at the end of each day";
      case GoalTimeframe.MONTHLY:
        return "Monthly goals are automatically archived at the end of each month";
      case GoalTimeframe.YEARLY:
        return "Yearly goals are automatically archived at the end of each year";
      default:
        return "";
    }
  };

  return (
    <Surface style={[styles.section, { backgroundColor: colors.surfaceContainer }]}>
      <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
        <View style={styles.sectionHeaderLeft}>
          {onToggleExpand && (
            <IconButton
              icon={isExpanded ? "chevron-up" : "chevron-down"}
              iconColor={colors.labelSecondary}
              onPress={onToggleExpand}
            />
          )}
          <View>
            <Text style={[styles.sectionTitle, { color: colors.labelPrimary }]}>
              {title}
            </Text>
            <Text style={[styles.timeframeInfo, { color: colors.labelSecondary }]}>
              {getTimeframeInfo()}
            </Text>
          </View>
        </View>
      </View>

      {isExpanded && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
          style={styles.keyboardAvoidingView}
        >
          <ScrollView 
            style={styles.goalsList}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.goalsListContent}
          >
            {!isAdding && (
              <Button
                mode="contained"
                onPress={() => {
                  setDescription('');
                  setMeasurable('');
                  setIsAdding(true);
                }}
                style={styles.addButtonInSection}
                buttonColor={colors.secondary}
                textColor={colors.primary}
                icon="plus"
              >
                Add {title.split(' ')[0]} Goal
              </Button>
            )}

            {isAdding && (
              <Surface style={[styles.addForm, { backgroundColor: colors.surfaceContainer }]}>
                <TextInput
                  label="What do you want to achieve?"
                  value={description}
                  onChangeText={setDescription}
                  style={[styles.input, { backgroundColor: colors.surfaceContainerLow }]}
                  contentStyle={{ paddingHorizontal: 12 }}
                  multiline
                  textColor={colors.textPrimary}
                  placeholderTextColor={colors.textSecondary}
                  theme={{ 
                    colors: { 
                      onSurfaceVariant: colors.textSecondary,
                      primary: colors.secondary,
                      onSurfaceDisabled: colors.textSecondary,
                    }
                  }}
                  selectionColor={colors.secondary}
                  underlineColor={colors.border}
                  activeUnderlineColor={colors.secondary}
                  onSubmitEditing={Keyboard.dismiss}
                />
                
                <TextInput
                  label="How will you measure success?"
                  value={measurable}
                  onChangeText={setMeasurable}
                  style={[styles.input, { backgroundColor: colors.surfaceContainerLow }]}
                  contentStyle={{ paddingHorizontal: 12 }}
                  placeholder="e.g., Run 5km, Read 2 books"
                  textColor={colors.textPrimary}
                  placeholderTextColor={colors.textSecondary}
                  theme={{ 
                    colors: { 
                      onSurfaceVariant: colors.textSecondary,
                      primary: colors.secondary,
                      onSurfaceDisabled: colors.textSecondary,
                    }
                  }}
                  selectionColor={colors.secondary}
                  underlineColor={colors.border}
                  activeUnderlineColor={colors.secondary}
                  onSubmitEditing={Keyboard.dismiss}
                />

                <View style={styles.formActions}>
                  <Button
                    mode="outlined"
                    onPress={() => {
                      Keyboard.dismiss();
                      setIsAdding(false);
                    }}
                    style={styles.actionButton}
                    textColor={colors.labelSecondary}
                  >
                    Cancel
                  </Button>
                  <Button
                    mode="contained"
                    onPress={() => {
                      Keyboard.dismiss();
                      handleSubmit();
                    }}
                    loading={isSubmitting}
                    disabled={isSubmitting || !description.trim()}
                    style={styles.actionButton}
                    buttonColor={colors.secondary}
                    textColor={colors.primary}
                  >
                    Create
                  </Button>
                </View>
              </Surface>
            )}

            {goals.map((goal) => (
              <Surface
                key={goal.id}
                style={[styles.goalCard, { backgroundColor: colors.surface }]}
              >
                <View style={styles.goalCardContent}>
                  <View style={styles.goalInfo}>
                    <Text style={[styles.goalText, { color: colors.labelPrimary }]}>
                      {goal.description}
                    </Text>
                    {goal.measurable && (
                      <Text style={[styles.measurableText, { color: colors.labelSecondary }]}>
                        Target: {goal.measurable}
                      </Text>
                    )}
                  </View>
                  <View style={styles.goalActions}>
                    {goal.status !== GoalStatus.COMPLETED && (
                      <IconButton
                        icon="check-circle"
                        iconColor={colors.secondary}
                        size={24}
                        onPress={() => handleCompleteGoal(goal)}
                      />
                    )}
                    {timeframe !== GoalTimeframe.DAILY && goal.status !== GoalStatus.COMPLETED && (
                      <IconButton
                        icon="pencil-circle"
                        iconColor={colors.labelSecondary}
                        size={24}
                        onPress={() => handleAdjustGoal(goal)}
                      />
                    )}
                    <IconButton
                      icon="delete"
                      iconColor={colors.error}
                      size={20}
                      onPress={() => handleDeleteGoal(goal.id)}
                    />
                  </View>
                </View>
                <View style={[styles.progressBar, { backgroundColor: colors.surfaceContainerLow }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        backgroundColor: colors.primary,
                        width: `${goal.progress}%`,
                      },
                    ]}
                  />
                </View>
              </Surface>
            ))}

            {goals.length === 0 && !isAdding && (
              <Text style={[styles.emptyText, { color: colors.labelSecondary }]}>
                No {title.toLowerCase()} yet. Add one to get started!
              </Text>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </Surface>
  );
}

const styles = StyleSheet.create({
  section: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    flex: Platform.OS === 'ios' ? 0 : 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  addButtonInSection: {
    marginBottom: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  goalsList: {
    maxHeight: Platform.OS === 'ios' ? 'auto' : 'auto',
  },
  goalsListContent: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 120 : 80,
  },
  addForm: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  input: {
    marginBottom: 16,
    borderRadius: 8,
  },
  inputContent: {
    fontSize: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    minWidth: 100,
    borderRadius: 8,
  },
  goalCard: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  goalCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  goalInfo: {
    flex: 1,
    marginRight: 16,
  },
  goalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  measurableText: {
    fontSize: 14,
    marginTop: 4,
  },
  goalText: {
    fontSize: 16,
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    fontStyle: 'italic',
  },
  timeframeInfo: {
    fontSize: 12,
    marginTop: 2,
    fontStyle: 'italic',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
}); 