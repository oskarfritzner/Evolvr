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
import { Timestamp } from "firebase/firestore";

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
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dayDate = new Date(today.getTime() + index * 24 * 60 * 60 * 1000);

      // Find if this day exists in completedDays
      const existingDay = habit.completedDays.find((day) => {
        const dayDateObj =
          day.date instanceof Timestamp ? day.date.toDate() : day.date;
        return dayDateObj.toDateString() === dayDate.toDateString();
      });

      return (
        existingDay || {
          date: dayDate,
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
          from={{
            height: 0,
            opacity: 0,
            scale: 0.95,
          }}
          animate={{
            height: "auto",
            opacity: 1,
            scale: 1,
          }}
          transition={{
            height: {
              type: "timing",
              duration: 300,
            },
            opacity: {
              type: "timing",
              duration: 200,
            },
            scale: {
              type: "spring",
              delay: 50,
              damping: 12,
            },
          }}
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
    marginBottom: 0,
    backgroundColor: "transparent",
    overflow: "hidden",
  },
  header: {
    padding: Platform.OS === "ios" ? 12 : 10,
  },
  mainContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  details: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  expandSection: {
    alignItems: "center",
    marginTop: 8,
  },
  titleSection: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    opacity: 0.8,
  },
  rightSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  streakBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  streakText: {
    fontSize: 12,
    fontWeight: "500",
  },
  statusDotContainer: {
    padding: 4,
  },
  statusDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  deleteButton: {
    padding: 4,
  },
  reasonContainer: {
    marginBottom: 16,
  },
  reasonLabel: {
    fontSize: 12,
    marginBottom: 4,
    opacity: 0.7,
  },
  reasonText: {
    fontSize: 14,
    lineHeight: 20,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressLabel: {
    fontSize: 12,
    marginBottom: 12,
    opacity: 0.7,
  },
  completionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    alignItems: "center",
  },
  dayBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  dayText: {
    fontSize: 10,
    fontWeight: "500",
  },
});
