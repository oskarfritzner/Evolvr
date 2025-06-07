import React, { useState } from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  Image,
  Platform,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { FontAwesome5 } from "@expo/vector-icons";
import { Routine } from "@/backend/types/Routine";
import { useAuth } from "@/context/AuthContext";
import { routineService } from "@/backend/services/routineServices";
import { ParticipantData } from "@/backend/types/Participant";
import { RoutineStatsModal } from "./RoutineStatsModal";
import { LeaveRoutineModal } from "./LeaveRoutineModal";

interface RoutineCardProps {
  routine: Routine;
  onPress: () => void;
  onDelete: () => void;
  compact?: boolean;
  sharedWithMe?: boolean;
}

export default function RoutineCard({
  routine,
  onPress,
  onDelete,
  compact,
  sharedWithMe,
}: RoutineCardProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [participants, setParticipants] = useState<ParticipantData[]>([]);
  const [showStats, setShowStats] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  const canDelete = routine.createdBy === user?.uid;
  const canLeave = !canDelete && routine.participants.includes(user?.uid || "");

  const handleLeave = async (keepPersonal: boolean) => {
    try {
      if (user) {
        await routineService.leaveRoutine(user.uid, routine.id, keepPersonal);
      }
    } catch (error) {
      console.error("Error leaving routine:", error);
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          shadowColor: colors.textPrimary,
          opacity: routine.active ? 1 : 0.6,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.mainContent}>
        <View style={styles.leftContent}>
          <View style={styles.header}>
            <Text
              style={[styles.title, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {routine.title || "Untitled Routine"}
            </Text>
            <View style={styles.actions}>
              <TouchableOpacity
                onPress={() => setShowStats(true)}
                style={styles.actionButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <FontAwesome5
                  name="chart-bar"
                  size={14}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>

              {canDelete ? (
                <TouchableOpacity
                  onPress={onDelete}
                  style={styles.actionButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <FontAwesome5 name="trash" size={14} color={colors.error} />
                </TouchableOpacity>
              ) : (
                canLeave && (
                  <TouchableOpacity
                    onPress={() => setShowLeaveModal(true)}
                    style={styles.actionButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <FontAwesome5
                      name="sign-out-alt"
                      size={14}
                      color={colors.warning}
                    />
                  </TouchableOpacity>
                )
              )}
            </View>
          </View>

          {routine.description && (
            <Text
              style={[styles.description, { color: colors.textSecondary }]}
              numberOfLines={2}
            >
              {routine.description}
            </Text>
          )}

          <View style={styles.footer}>
            <View style={styles.participants}>
              {routine.participants.slice(0, 3).map((participantId, index) => (
                <View
                  key={participantId}
                  style={[
                    styles.participantAvatar,
                    {
                      marginLeft: index > 0 ? -8 : 0,
                      borderColor: colors.surface,
                      backgroundColor: colors.surfaceContainerLow,
                    },
                  ]}
                >
                  <Image
                    source={{ uri: `https://via.placeholder.com/32` }}
                    style={styles.participantImage}
                  />
                </View>
              ))}
              {routine.participants.length > 3 && (
                <View
                  style={[
                    styles.moreParticipants,
                    {
                      backgroundColor: colors.secondary,
                      marginLeft: -8,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.moreParticipantsText,
                      { color: colors.surface },
                    ]}
                  >
                    +{routine.participants.length - 3}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.stats}>
              <Text style={[styles.statsText, { color: colors.textSecondary }]}>
                {routine.tasks.length} tasks
              </Text>
              {routine.metadata?.currentStreak ? (
                <View style={styles.streak}>
                  <FontAwesome5 name="fire" size={12} color={colors.warning} />
                  <Text style={[styles.streakText, { color: colors.warning }]}>
                    {routine.metadata.currentStreak}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </View>

      <RoutineStatsModal
        visible={showStats}
        onClose={() => setShowStats(false)}
        routine={routine}
        participants={participants}
      />

      <LeaveRoutineModal
        visible={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        onLeave={handleLeave}
        routineTitle={routine.title}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    height: "100%",
    ...Platform.select({
      web: {
        transition: "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
        cursor: "pointer",
        ":hover": {
          transform: "translateY(-2px)",
          boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
        },
      },
    }),
  },
  mainContent: {
    flex: 1,
    gap: 12,
  },
  leftContent: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    flex: 1,
    marginRight: 12,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
    opacity: 0.8,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  participants: {
    flexDirection: "row",
    alignItems: "center",
  },
  participantAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    overflow: "hidden",
    backgroundColor: "#f4f4f5",
  },
  participantImage: {
    width: "100%",
    height: "100%",
  },
  moreParticipants: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: -8,
  },
  moreParticipantsText: {
    fontSize: 12,
    fontWeight: "600",
  },
  stats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statsText: {
    fontSize: 14,
    opacity: 0.8,
  },
  streak: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  streakText: {
    fontSize: 14,
    fontWeight: "600",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    padding: 4,
  },
});
