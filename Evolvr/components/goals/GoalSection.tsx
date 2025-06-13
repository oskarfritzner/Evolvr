import React, { useState, useCallback, memo } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  Keyboard,
  KeyboardAvoidingView,
  Animated,
  useWindowDimensions,
} from "react-native";
import {
  Surface,
  Text,
  Button,
  TextInput,
  IconButton,
} from "react-native-paper";
import { useTheme } from "@/context/ThemeContext";
import {
  Goal,
  GoalTimeframe,
  GoalStatus,
  GoalStep,
} from "@/backend/types/Goal";
import { goalService } from "@/backend/services/goalService";
import { useAuth } from "@/context/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import Toast from "react-native-toast-message";
import { Timestamp } from "firebase/firestore";

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

function calculateProgressFromSteps(steps: GoalStep[] | undefined): number {
  if (!steps || steps.length === 0) return 0;
  const completedSteps = steps.filter((step) => step.isCompleted).length;
  return Math.round((completedSteps / steps.length) * 100);
}

// Memoized step item component
const StepItem = memo(
  ({
    step,
    onToggle,
    colors,
  }: {
    step: GoalStep;
    onToggle: () => void;
    colors: any;
  }) => (
    <View style={[styles.stepItem, { borderBottomColor: colors.border }]}>
      <IconButton
        icon={step.isCompleted ? "checkbox-marked" : "checkbox-blank-outline"}
        iconColor={step.isCompleted ? colors.secondary : colors.labelSecondary}
        size={20}
        onPress={onToggle}
      />
      <Text
        style={[
          styles.stepText,
          {
            color: colors.labelPrimary,
            textDecorationLine: step.isCompleted ? "line-through" : "none",
          },
        ]}
      >
        {step.description}
      </Text>
    </View>
  )
);

// Memoized goal card component
const GoalCard = memo(
  ({
    goal,
    onComplete,
    onEdit,
    onDelete,
    timeframe,
    colors,
  }: {
    goal: Goal;
    onComplete: (goal: Goal) => void;
    onEdit?: (goal: Goal) => void;
    onDelete: (goalId: string) => void;
    timeframe: GoalTimeframe;
    colors: any;
  }) => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [isExpanded, setIsExpanded] = useState(false);

    const handleStepToggle = async (stepId: string) => {
      if (!user?.uid) return;
      try {
        const updatedSteps = goal.steps?.map((step) =>
          step.id === stepId
            ? {
                ...step,
                isCompleted: !step.isCompleted,
                completedAt: !step.isCompleted ? Timestamp.now() : undefined,
              }
            : step
        );

        if (updatedSteps) {
          const newProgress = calculateProgressFromSteps(updatedSteps);
          await goalService.updateGoal(user.uid, goal.id, {
            steps: updatedSteps,
            progress: newProgress,
            status:
              newProgress >= 100
                ? GoalStatus.COMPLETED
                : GoalStatus.IN_PROGRESS,
          });
          queryClient.invalidateQueries({ queryKey: ["goals", user.uid] });
        }
      } catch (error) {
        console.error("Error updating step:", error);
        Toast.show({
          type: "error",
          text1: "Failed to update step",
          text2: "Please try again",
        });
      }
    };

    const hasSteps = goal.steps && goal.steps.length > 0;
    const steps = goal.steps || [];
    const completedSteps = steps.filter((step) => step.isCompleted).length;

    return (
      <Surface
        style={[
          styles.goalCard,
          {
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.goalCardContent}>
          <View style={styles.goalInfo}>
            <Text
              style={[
                styles.goalText,
                {
                  color: colors.labelPrimary,
                  textDecorationLine:
                    goal.status === GoalStatus.COMPLETED
                      ? "line-through"
                      : "none",
                },
              ]}
            >
              {goal.description}
            </Text>
            {goal.measurable && (
              <Text
                style={[
                  styles.measurableText,
                  { color: colors.labelSecondary },
                ]}
              >
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
            {goal.status !== GoalStatus.COMPLETED && (
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

        {/* Steps Summary and Expand Button */}
        {hasSteps && (
          <>
            <View
              style={[styles.stepsSummary, { borderTopColor: colors.border }]}
            >
              <Text
                style={[
                  styles.stepsSummaryText,
                  { color: colors.labelSecondary },
                ]}
              >
                {completedSteps} of {steps.length} tasks completed
              </Text>
              <IconButton
                icon={isExpanded ? "chevron-up" : "chevron-down"}
                iconColor={colors.labelSecondary}
                size={20}
                onPress={() => setIsExpanded(!isExpanded)}
              />
            </View>

            {/* Expandable Steps Section */}
            {isExpanded && (
              <View style={styles.stepsContainer}>
                {steps.map((step) => (
                  <StepItem
                    key={step.id}
                    step={step}
                    onToggle={() => handleStepToggle(step.id)}
                    colors={colors}
                  />
                ))}
              </View>
            )}

            {/* Progress Bar */}
            <View
              style={[
                styles.progressContainer,
                { backgroundColor: colors.surfaceContainerLow },
              ]}
            >
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
                      backgroundColor:
                        goal.status === GoalStatus.COMPLETED
                          ? colors.secondary
                          : colors.primary,
                      width: `${goal.progress}%`,
                    },
                  ]}
                />
              </View>
              <Text
                style={[styles.progressText, { color: colors.labelSecondary }]}
              >
                {goal.progress}%
              </Text>
            </View>
          </>
        )}
      </Surface>
    );
  }
);

// Memoized section header
const SectionHeader = memo(
  ({
    title,
    timeframeInfo,
    isExpanded,
    onToggleExpand,
    goalsCount,
    colors,
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
        { borderBottomColor: isExpanded ? colors.border : "transparent" },
      ]}
      onPress={onToggleExpand}
    >
      <View style={styles.sectionHeaderLeft}>
        <View style={styles.titleContainer}>
          <Text style={[styles.sectionTitle, { color: colors.labelPrimary }]}>
            {title}
          </Text>
          <Text
            style={[styles.timeframeInfo, { color: colors.labelSecondary }]}
          >
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
        {goalsCount} {goalsCount === 1 ? "goal" : "goals"}
      </Text>
    </Pressable>
  )
);

const GoalSection: React.FC<GoalSectionProps> = memo(
  ({
    title,
    goals = [],
    timeframe,
    isExpanded = true,
    onToggleExpand,
    onEditGoal,
  }) => {
    const { colors } = useTheme();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const { width } = useWindowDimensions();
    const isLargeScreen = width >= 1024;
    const [isAdding, setIsAdding] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state
    const [description, setDescription] = useState("");
    const [measurable, setMeasurable] = useState("");
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
      outputRange: ["0%", "100%"],
    });

    function createEmptyGoal(): Goal {
      return {
        id: generateId(),
        userId: user?.uid || "",
        description: "",
        timeframe,
        status: GoalStatus.NOT_STARTED,
        progress: 0,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
    }

    // Memoize handlers
    const handleCompleteGoal = useCallback(
      async (goal: Goal) => {
        if (!user?.uid) return;
        try {
          await goalService.updateGoalProgress(user.uid, goal.id, 100);
          queryClient.invalidateQueries({ queryKey: ["goals", user.uid] });

          Toast.show({
            type: "success",
            text1: "Goal completed!",
            text2: "Great job on achieving your goal.",
          });
        } catch (error) {
          console.error("Error completing goal:", error);
          Toast.show({
            type: "error",
            text1: "Error",
            text2: "Failed to complete goal. Please try again.",
          });
        }
      },
      [user?.uid]
    );

    const handleDeleteGoal = useCallback(
      async (goalId: string) => {
        if (!user?.uid) return;
        try {
          await goalService.deleteGoal(user.uid, goalId);
          queryClient.invalidateQueries({ queryKey: ["goals", user.uid] });
          Toast.show({
            type: "success",
            text1: "Goal deleted",
            text2: "The goal has been removed.",
          });
        } catch (error) {
          console.error("Error deleting goal:", error);
          Toast.show({
            type: "error",
            text1: "Error",
            text2: "Failed to delete goal. Please try again.",
          });
        }
      },
      [user?.uid]
    );

    const handleSubmit = useCallback(async () => {
      if (!description.trim() || !user?.uid) return;

      try {
        setIsSubmitting(true);
        const goalData: Partial<Goal> = {
          description: description.trim(),
          timeframe,
          status: GoalStatus.NOT_STARTED,
          progress: 0,
        };

        if (measurable.trim()) {
          goalData.measurable = measurable.trim();
        }

        await goalService.createGoal(user.uid, goalData);
        await queryClient.invalidateQueries({ queryKey: ["goals", user.uid] });

        setDescription("");
        setMeasurable("");
        setIsAdding(false);
        Toast.show({
          type: "success",
          text1: "Goal created successfully",
        });
      } catch (error) {
        console.error("Error creating goal:", error);
        Toast.show({
          type: "error",
          text1: "Failed to create goal",
          text2: "Please try again",
        });
      } finally {
        setIsSubmitting(false);
      }
    }, [description, measurable, timeframe, user?.uid]);

    const handleAdjustGoal = (goal: Goal) => {
      setDescription(goal.description);
      setMeasurable(goal.measurable || "");
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
            width: isLargeScreen ? "32%" : "100%",
            marginBottom: isLargeScreen ? 0 : 20,
          },
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
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
            style={styles.keyboardAvoidingView}
          >
            <ScrollView
              style={styles.goalsList}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.goalsListContent,
                { paddingBottom: Platform.OS === "ios" ? 80 : 60 },
              ]}
            >
              {!isAdding ? (
                <Button
                  mode="contained"
                  onPress={() => {
                    setDescription("");
                    setMeasurable("");
                    setIsAdding(true);
                  }}
                  style={[
                    styles.addButton,
                    { backgroundColor: colors.secondary },
                  ]}
                  labelStyle={[
                    styles.addButtonLabel,
                    { color: colors.primary },
                  ]}
                  icon="plus"
                >
                  Add {title.split(" ")[0]} Goal
                </Button>
              ) : (
                <Surface
                  style={[
                    styles.addForm,
                    {
                      backgroundColor: colors.surfaceContainer,
                      borderWidth: 1,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <TextInput
                    label="What do you want to achieve?"
                    value={description}
                    onChangeText={setDescription}
                    style={[
                      styles.input,
                      { backgroundColor: colors.surfaceContainerLow },
                    ]}
                    contentStyle={{ paddingHorizontal: 12 }}
                    multiline
                    textColor={colors.textPrimary}
                    placeholderTextColor={colors.textSecondary}
                    theme={{
                      colors: {
                        onSurfaceVariant: colors.textSecondary,
                        primary: colors.secondary,
                        onSurfaceDisabled: colors.textSecondary,
                      },
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
                    style={[
                      styles.input,
                      { backgroundColor: colors.surfaceContainerLow },
                    ]}
                    contentStyle={{ paddingHorizontal: 12 }}
                    placeholder="e.g., Run 5km, Read 2 books"
                    textColor={colors.textPrimary}
                    placeholderTextColor={colors.textSecondary}
                    theme={{
                      colors: {
                        onSurfaceVariant: colors.textSecondary,
                        primary: colors.secondary,
                        onSurfaceDisabled: colors.textSecondary,
                      },
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
                  <Text
                    style={[styles.emptyText, { color: colors.labelSecondary }]}
                  >
                    No {title.toLowerCase()} yet
                  </Text>
                  <Text
                    style={[
                      styles.emptySubtext,
                      { color: colors.labelSecondary },
                    ]}
                  >
                    Add one to get started!
                  </Text>
                </View>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </Animated.View>
      </Surface>
    );
  }
);

export default GoalSection;

const styles = StyleSheet.create({
  section: {
    borderRadius: 16,
    overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  titleContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 0.15,
  },
  expandIcon: {
    marginLeft: 8,
  },
  goalCount: {
    fontSize: 14,
    fontWeight: "500",
  },
  content: {
    overflow: "hidden",
  },
  addButton: {
    marginVertical: 12,
    borderRadius: 12,
    height: 44,
  },
  addButtonLabel: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  goalCard: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  goalCardContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  goalInfo: {
    flex: 1,
    marginRight: 12,
  },
  goalText: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
  measurableText: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: "400",
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 6,
    padding: 6,
  },
  progressBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: "600",
    minWidth: 40,
    textAlign: "right",
  },
  emptyStateContainer: {
    alignItems: "center",
    padding: 16,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "500",
  },
  emptySubtext: {
    fontSize: 12,
    marginTop: 4,
  },
  timeframeInfo: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: "italic",
  },
  goalsList: {
    maxHeight: Platform.OS === "ios" ? "auto" : "auto",
  },
  goalsListContent: {
    padding: 12,
  },
  addForm: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  input: {
    marginBottom: 12,
    borderRadius: 8,
  },
  inputContent: {
    fontSize: 14,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  formActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    minWidth: 90,
    borderRadius: 8,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  goalActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  stepsSummary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderTopWidth: 1,
    marginTop: 6,
  },
  stepsSummaryText: {
    fontSize: 12,
    fontWeight: "500",
  },
  stepsContainer: {
    paddingHorizontal: 12,
    paddingTop: 6,
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    borderBottomWidth: 1,
    marginBottom: 4,
  },
  stepText: {
    flex: 1,
    fontSize: 12,
    marginLeft: 4,
  },
});
