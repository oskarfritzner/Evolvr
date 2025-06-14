import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Pressable,
  Animated,
  Alert,
} from "react-native";
import type Task from "@/backend/types/Task";
import { FontAwesome5 } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { UserData } from "@/backend/types/UserData";
import { TaskType } from "@/backend/types/Task";
import { RoutineTaskWithMeta, RoutineTask } from "@/backend/types/Routine";
import { ParticipantData } from "@/backend/types/Participant";
import { Avatar } from "@/components/ui/Avatar";
import { MotiView } from "moti";
import { MotiPressable } from "moti/interactions";
import { Easing } from "react-native-reanimated";
import { levelService } from "@/backend/services/levelService";
import { useAuth } from "@/context/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import Toast from "react-native-toast-message";
import { router } from "expo-router";
import { TaskCompletionModal } from "./modals/TaskCompletionModal";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Constants from levelService
const CHALLENGE_BONUS = 0.15; // 15% bonus for challenge tasks

interface ActiveTaskProps {
  task: ((Task & { type: TaskType }) | RoutineTaskWithMeta) & {
    streak?: number;
  };
  onComplete?: (
    taskId: string,
    completionData?: { duration: number; feedback: string }
  ) => void;
  participants?: ParticipantData[];
}

const ActiveTask: React.FC<ActiveTaskProps> = ({
  task,
  onComplete,
  participants,
}) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [isCompleting, setIsCompleting] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [hasShownCompletionTip, setHasShownCompletionTip] = useState(false);
  const queryClient = useQueryClient();

  // Get participants either from props or from task
  const taskParticipants =
    participants || ("participants" in task ? task.participants : []);

  // Get today's date string for checking completions
  const today = new Date().toISOString().split("T")[0];

  // Check if task is a routine task and has completions
  const routineTask = task as RoutineTaskWithMeta;
  const todayCompletions = routineTask.routineId
    ? routineTask.completions?.[today] || []
    : [];

  // Get task title based on type
  const taskTitle =
    "type" in task && task.type === "routine"
      ? (task as RoutineTaskWithMeta).taskName
      : (task as Task).title;

  const handleComplete = async (completionData?: {
    duration: number;
    feedback: string;
  }) => {
    if (isCompleting || !user?.uid) return;

    try {
      setIsCompleting(true);

      if (onComplete) {
        await onComplete(task.id, completionData);
      }

      // Show completion tip if it's the first time and no notes/time were added
      if (!completionData && !hasShownCompletionTip) {
        const hasShownTip = await AsyncStorage.getItem("hasShownCompletionTip");
        if (!hasShownTip) {
          Toast.show({
            type: "info",
            text1: "Tip",
            text2:
              "You can add notes and time spent to your tasks when completing them!",
            position: "bottom",
            visibilityTime: 4000,
          });
          await AsyncStorage.setItem("hasShownCompletionTip", "true");
          setHasShownCompletionTip(true);
        }
      }

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["routineTasks"] });
      queryClient.invalidateQueries({ queryKey: ["userData"] });

      // Show success message
      Toast.show({
        type: "success",
        text1: "Task Completed!",
        text2: completionData?.feedback
          ? "Notes saved successfully"
          : "Great job!",
        position: "bottom",
      });
    } catch (error) {
      console.error("Error completing task:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2:
          error instanceof Error ? error.message : "Failed to complete task",
      });
    } finally {
      setIsCompleting(false);
    }
  };

  // Disable the button if task is already completing or user has already completed it
  const isDisabled = Boolean(
    isCompleting ||
      (user?.uid && todayCompletions.some((c) => c.completedBy === user.uid))
  );

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
                borderColor: colors.surface,
              },
            ]}
          >
            <Avatar size={24} uri={participant.photoURL} />
            {todayCompletions.some((c) => c.completedBy === participant.id) ? (
              <View
                style={[
                  styles.completedOverlay,
                  { backgroundColor: colors.surface + "99" },
                ]}
              >
                <FontAwesome5 name="check" size={12} color={colors.secondary} />
              </View>
            ) : (
              <View
                style={[
                  styles.incompleteMask,
                  { backgroundColor: colors.surface + "40" },
                ]}
              />
            )}
          </View>
        ))}
        {taskParticipants.length > 3 && (
          <View
            style={[
              styles.moreParticipants,
              {
                backgroundColor: colors.primary,
                marginLeft: -10,
                borderColor: colors.surface,
              },
            ]}
          >
            <Text
              style={[styles.moreParticipantsText, { color: colors.surface }]}
            >
              +{taskParticipants.length - 3}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const getTaskSource = () => {
    const sourceIcon = {
      routine: "calendar-check",
      habit: "bolt",
      challenge: "trophy",
      normal: "tasks",
      "user-generated": "user",
    }[task.type || "normal"];

    let sourceName = "";
    let challengeId = "";

    if ("routineTitle" in task) {
      sourceName = task.routineTitle;
    } else if ("challengeTitle" in task && "challengeId" in task) {
      sourceName = task.challengeTitle as string;
      challengeId = task.challengeId as string;
    } else if (task.context?.name) {
      sourceName = task.context.name;
    }

    const taskType = task.type || "normal";
    const displayName =
      sourceName || taskType.charAt(0).toUpperCase() + taskType.slice(1);

    return (
      <View style={styles.sourceRow}>
        <FontAwesome5
          name={sourceIcon}
          size={12}
          color={colors.textSecondary}
        />
        {task.type === "challenge" && challengeId ? (
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/(modals)/challenge",
                params: { id: challengeId },
              })
            }
          >
            <Text
              style={[
                styles.sourceText,
                {
                  color: colors.textSecondary,
                  textDecorationLine: "underline",
                },
              ]}
            >
              {displayName}
            </Text>
          </TouchableOpacity>
        ) : (
          <Text style={[styles.sourceText, { color: colors.textSecondary }]}>
            {displayName}
          </Text>
        )}
      </View>
    );
  };

  const renderHabitInfo = () => {
    if (task.type !== "habit" || !task.streak) return null;

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
      <TaskCompletionModal
        visible={showCompletionModal}
        onClose={() => setShowCompletionModal(false)}
        onComplete={(data) => {
          setShowCompletionModal(false);
          handleComplete(data);
        }}
        taskTitle={taskTitle}
      />

      <View style={styles.content}>
        <View style={styles.leftContent}>
          <View style={styles.titleRow}>
            <Text
              style={[styles.title, { color: colors.textPrimary }]}
              numberOfLines={2}
            >
              {("taskName" in task ? task.taskName : task.title) ||
                "Untitled Task"}
            </Text>
            {getTaskSource()}
          </View>

          {/* Challenge Type */}
          {task.type === "challenge" && (
            <Text
              style={[styles.challengeType, { color: colors.textSecondary }]}
            >
              {task.context?.name}
            </Text>
          )}

          {renderHabitInfo()}
        </View>

        <View style={styles.rightContent}>
          <View style={styles.actionRow}>
            {renderParticipants(taskParticipants)}
            <TouchableOpacity
              style={[
                styles.completeButton,
                {
                  backgroundColor: isDisabled
                    ? colors.labelDisabled
                    : colors.secondary,
                  opacity: isDisabled ? 0.5 : 1,
                },
              ]}
              onPress={() => setShowCompletionModal(true)}
              disabled={isDisabled}
            >
              <Text
                style={[
                  styles.completeButtonText,
                  { color: colors.background },
                ]}
              >
                Complete
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* XP badges moved to bottom */}
      <View style={styles.xpRow}>
        {Object.entries(task.categoryXp || {}).map(([category, xp]) => {
          // Calculate bonus XP for challenge tasks
          const baseXP = xp || 0;
          const isChallenge = task.type === "challenge";
          const bonusXP = isChallenge
            ? Math.floor(baseXP * CHALLENGE_BONUS)
            : 0;
          const totalXP = baseXP + bonusXP;

          return (
            <View
              key={`${task.id}-${category}`}
              style={[
                styles.xpBadge,
                { backgroundColor: colors.secondary + "20" },
              ]}
            >
              <Text style={[styles.xpText, { color: colors.secondary }]}>
                {category}: {baseXP}XP{" "}
                {isChallenge && bonusXP > 0 && `(+${bonusXP})`}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

export default ActiveTask;

// Styles for the component
const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  content: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  leftContent: {
    flex: 1,
    marginRight: 16,
  },
  rightContent: {
    alignItems: "flex-end",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  challengeType: {
    fontSize: 14,
    marginBottom: 8,
  },
  xpRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  xpBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  xpText: {
    fontSize: 12,
    fontWeight: "500",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  completeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 22,
    minWidth: 100,
    alignItems: "center",
  },
  completeButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  participantsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },
  participantWrapper: {
    position: "relative", // For overlay positioning
    borderWidth: 2,
    borderRadius: 12,
    overflow: "hidden",
  },
  completedOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  incompleteMask: {
    position: "absolute",
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
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
  },
  moreParticipantsText: {
    fontSize: 10,
    fontWeight: "600",
  },
  habitInfo: {
    marginTop: 8,
  },
  habitStreak: {
    fontSize: 12,
    fontWeight: "500",
  },
  sourceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  sourceText: {
    fontSize: 13,
    opacity: 0.8,
  },
});
