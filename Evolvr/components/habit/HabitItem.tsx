import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { Habit } from "@/backend/types/Habit";
import { habitService } from "@/backend/services/habitService";
import { MotiView } from "moti";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import Toast from "react-native-toast-message";
import { FontAwesome5 } from "@expo/vector-icons";
import { Platform } from "react-native";

interface HabitItemProps {
  habit: Habit;
  onRefresh?: () => void;
  onDelete: () => void;
  onComplete?: () => void;
}

export default function HabitItem({
  habit,
  onRefresh,
  onDelete,
  onComplete,
}: HabitItemProps) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  if (!habit?.id) return null;

  useEffect(() => {
    if (!habit?.id || !habit.userId) return;
    const unsubscribe = habitService.onHabitUpdated(
      habit.userId,
      habit.id,
      () => {
        if (onRefresh) onRefresh();
      }
    );
    return () => unsubscribe();
  }, [habit?.id, habit?.userId, onRefresh]);

  const progressDays = Array(66)
    .fill(null)
    .map((_, index) => {
      return (
        habit.completedDays[index] || {
          date: new Date(),
          completed: false,
        }
      );
    });

  const handleComplete = async () => {
    if (!user?.uid || !habit.id || habit.completedToday) return;

    try {
      await habitService.completeHabitTask(user.uid, habit.task.id);

      // Call the onComplete callback if provided
      if (onComplete) {
        onComplete();
      }

      // Show success message
      Toast.show({
        type: "success",
        text1: "Habit completed",
        text2: `Keep up the great work! ${habit.streak + 1} day streak!`,
        position: "bottom",
      });
    } catch (error) {
      console.error("Error completing habit:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2:
          error instanceof Error ? error.message : "Failed to complete habit",
        position: "bottom",
      });
    }
  };

  const handleDelete = async () => {
    if (!user?.uid || !habit.id) return;
    onDelete();
  };

  return (
    <MotiView
      from={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "timing", duration: 300 }}
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <TouchableOpacity
        onPress={() => setExpanded(!expanded)}
        style={styles.header}
        activeOpacity={0.7}
      >
        <View style={styles.mainContent}>
          <View style={styles.titleSection}>
            <Text
              style={[styles.title, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {habit.title}
            </Text>
            <Text
              style={[styles.subtitle, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {habit.reason}
            </Text>
          </View>

          <View style={styles.rightSection}>
            <View
              style={[
                styles.streakBadge,
                { backgroundColor: colors.primary + "20" },
              ]}
            >
              <Text style={[styles.streakText, { color: colors.secondary }]}>
                {habit.streak}d
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleComplete}
              disabled={habit.completedToday}
              style={styles.statusDotContainer}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: habit.completedToday
                      ? colors.success
                      : "transparent",
                    borderColor: habit.completedToday
                      ? colors.success
                      : colors.border,
                  },
                ]}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleDelete}
              style={styles.deleteButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <FontAwesome5 name="trash" size={14} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.expandSection}>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={16}
            color={colors.textSecondary}
          />
        </View>
      </TouchableOpacity>

      {expanded && (
        <MotiView
          from={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          transition={{ type: "timing", duration: 200 }}
          style={styles.details}
        >
          <View style={styles.reasonContainer}>
            <Text style={[styles.reasonLabel, { color: colors.textSecondary }]}>
              Motivation
            </Text>
            <Text style={[styles.reasonText, { color: colors.textPrimary }]}>
              {habit.reason}
            </Text>
          </View>

          <View style={styles.progressContainer}>
            <Text
              style={[styles.progressLabel, { color: colors.textSecondary }]}
            >
              66-Day Progress
            </Text>
            <View style={styles.completionGrid}>
              {progressDays.map((day, index) => (
                <View
                  key={index}
                  style={[
                    styles.dayBox,
                    {
                      backgroundColor: day.completed
                        ? colors.secondary
                        : "transparent",
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      {
                        color: day.completed
                          ? colors.surface
                          : colors.textSecondary,
                        opacity: day.completed ? 1 : 0.5,
                      },
                    ]}
                  >
                    {index + 1}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </MotiView>
      )}
    </MotiView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 8,
  },
  header: {
    padding: Platform.OS === "ios" ? 12 : 10,
  },
  mainContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  titleSection: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: Platform.OS === "ios" ? 15 : 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: Platform.OS === "ios" ? 13 : 12,
    opacity: 0.7,
  },
  rightSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  streakBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    minWidth: 32,
    alignItems: "center",
  },
  streakText: {
    fontSize: 12,
    fontWeight: "600",
  },
  statusDotContainer: {
    padding: 4,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  deleteButton: {
    padding: 4,
  },
  expandSection: {
    alignItems: "center",
    marginTop: 8,
  },
  details: {
    padding: 12,
    paddingTop: 0,
  },
  reasonContainer: {
    marginBottom: 12,
  },
  reasonLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  reasonText: {
    fontSize: Platform.OS === "ios" ? 14 : 13,
    lineHeight: Platform.OS === "ios" ? 20 : 18,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  completionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  dayBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  dayText: {
    fontSize: 9,
    fontWeight: "500",
  },
});
