import React, { useState, useCallback, memo } from 'react';
import { View, StyleSheet, Pressable, ScrollView, Platform, Keyboard, KeyboardAvoidingView, Animated } from 'react-native';
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

// Memoized goal card component
const GoalCard = memo(({ 
  goal, 
  onComplete, 
  onEdit, 
  onDelete, 
  timeframe, 
  colors 
}: { 
  goal: Goal; 
  onComplete: (goal: Goal) => void;
  onEdit?: (goal: Goal) => void;
  onDelete: (goalId: string) => void;
  timeframe: GoalTimeframe;
  colors: any;
}) => (
  <Surface
    style={[
      styles.goalCard, 
      { 
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
      }
    ]}
  >
    <View style={styles.goalCardContent}>
      <View style={styles.goalInfo}>
        <Text style={[styles.goalText, { 
          color: colors.labelPrimary,
          textDecorationLine: goal.status === GoalStatus.COMPLETED ? 'line-through' : 'none',
        }]}>
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
            onPress={() => onComplete(goal)}
          />
        )}
        {timeframe !== GoalTimeframe.DAILY && goal.status !== GoalStatus.COMPLETED && (
          <IconButton
            icon="pencil-circle"
            iconColor={colors.labelSecondary}
            size={24}
            onPress={() => onEdit?.(goal)}
          />
        )}
        <IconButton
          icon="delete"
          iconColor={colors.error}
          size={20}
          onPress={() => onDelete(goal.id)}
        />
      </View>
    </View>
    <View style={[styles.progressContainer, { backgroundColor: colors.surfaceContainerLow }]}>
      <View
        style={[
          styles.progressBar,
          {
            backgroundColor: colors.surfaceContainerLow,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.progressFill,
            {
              backgroundColor: goal.status === GoalStatus.COMPLETED ? colors.secondary : colors.primary,
              width: `${goal.progress}%`,
            },
          ]}
        />
      </View>
      <Text style={[styles.progressText, { color: colors.labelSecondary }]}>
        {goal.progress}%
      </Text>
    </View>
  </Surface>
));

// Memoized section header
const SectionHeader = memo(({ 
  title, 
  timeframeInfo, 
  isExpanded, 
  onToggleExpand, 
  goalsCount,
  colors 
}: {
  title: string;
  timeframeInfo: string;
  isExpanded: boolean;
  onToggleExpand?: () => void;
  goalsCount: number;
  colors: any;
}) => (
  <Pressable 
    style={[
      styles.sectionHeader, 
      { borderBottomColor: isExpanded ? colors.border : 'transparent' }
    ]}
    onPress={onToggleExpand}
  >
    <View style={styles.sectionHeaderLeft}>
      <View style={styles.titleContainer}>
        <Text style={[styles.sectionTitle, { color: colors.labelPrimary }]}>
          {title}
        </Text>
        <Text style={[styles.timeframeInfo, { color: colors.labelSecondary }]}>
          {timeframeInfo}
        </Text>
      </View>
      {onToggleExpand && (
        <IconButton
          icon={isExpanded ? "chevron-up" : "chevron-down"}
          iconColor={colors.labelSecondary}
          size={24}
          style={styles.expandIcon}
        />
      )}
    </View>
    <Text style={[styles.goalCount, { color: colors.labelSecondary }]}>
      {goalsCount} {goalsCount === 1 ? 'goal' : 'goals'}
    </Text>
  </Pressable>
));

const GoalSection: React.FC<GoalSectionProps> = memo(({ 
  title, 
  goals = [], 
  timeframe,
  isExpanded = true,
  onToggleExpand,
  onEditGoal
}) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [description, setDescription] = useState('');
  const [measurable, setMeasurable] = useState('');
  const [adjustingGoalId, setAdjustingGoalId] = useState<string | null>(null);

  // Add animation state
  const [animation] = useState(new Animated.Value(isExpanded ? 1 : 0));

  // Update animation when expanded state changes
  React.useEffect(() => {
    Animated.timing(animation, {
      toValue: isExpanded ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isExpanded]);

  const maxHeight = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

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

  // Memoize handlers
  const handleCompleteGoal = useCallback(async (goal: Goal) => {
    if (!user?.uid) return;
    try {
      await goalService.updateGoalProgress(user.uid, goal.id, 100);
      queryClient.invalidateQueries({ queryKey: ['goals', user.uid] });
      
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
  }, [user?.uid]);

  const handleDeleteGoal = useCallback(async (goalId: string) => {
    if (!user?.uid) return;
    try {
      await goalService.deleteGoal(user.uid, goalId);
      queryClient.invalidateQueries({ queryKey: ['goals', user.uid] });
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
  }, [user?.uid]);

  const handleSubmit = useCallback(async () => {
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
      await queryClient.invalidateQueries({ queryKey: ['goals', user.uid] });
      
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
  }, [description, measurable, timeframe, user?.uid]);

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
    <Surface 
      style={[
        styles.section, 
        { 
          backgroundColor: colors.surfaceContainer,
          borderWidth: 1,
          borderColor: colors.border,
        }
      ]}
    >
      <SectionHeader
        title={title}
        timeframeInfo={getTimeframeInfo()}
        isExpanded={isExpanded}
        onToggleExpand={onToggleExpand}
        goalsCount={goals.length}
        colors={colors}
      />

      <Animated.View style={[styles.content, { maxHeight }]}>
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
            {!isAdding ? (
              <Button
                mode="contained"
                onPress={() => {
                  setDescription('');
                  setMeasurable('');
                  setIsAdding(true);
                }}
                style={[styles.addButton, { backgroundColor: colors.secondary }]}
                labelStyle={[styles.addButtonLabel, { color: colors.primary }]}
                icon="plus"
              >
                Add {title.split(' ')[0]} Goal
              </Button>
            ) : (
              <Surface style={[styles.addForm, { 
                backgroundColor: colors.surfaceContainer,
                borderWidth: 1,
                borderColor: colors.border,
              }]}>
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
              <GoalCard
                key={goal.id}
                goal={goal}
                onComplete={handleCompleteGoal}
                onEdit={onEditGoal}
                onDelete={handleDeleteGoal}
                timeframe={timeframe}
                colors={colors}
              />
            ))}

            {goals.length === 0 && !isAdding && (
              <View style={styles.emptyStateContainer}>
                <Text style={[styles.emptyText, { color: colors.labelSecondary }]}>
                  No {title.toLowerCase()} yet
                </Text>
                <Text style={[styles.emptySubtext, { color: colors.labelSecondary }]}>
                  Add one to get started!
                </Text>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Animated.View>
    </Surface>
  );
});

export default GoalSection;

const styles = StyleSheet.create({
  section: {
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
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
    alignItems: 'center',
    flex: 1,
  },
  titleContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 0.15,
  },
  expandIcon: {
    marginLeft: 8,
  },
  goalCount: {
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    overflow: 'hidden',
  },
  addButton: {
    marginVertical: 16,
    borderRadius: 12,
    height: 48,
  },
  addButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  goalCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  goalCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  goalInfo: {
    flex: 1,
    marginRight: 16,
  },
  goalText: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 24,
  },
  measurableText: {
    fontSize: 14,
    marginTop: 4,
    fontWeight: '400',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 8,
    padding: 8,
  },
  progressBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 45,
    textAlign: 'right',
  },
  emptyStateContainer: {
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 4,
  },
  timeframeInfo: {
    fontSize: 13,
    marginTop: 4,
    fontStyle: 'italic',
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
  keyboardAvoidingView: {
    flex: 1,
  },
  goalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
}); 