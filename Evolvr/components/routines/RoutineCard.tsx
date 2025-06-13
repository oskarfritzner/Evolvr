import React, { useState, useCallback } from "react";
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
import { useQuery } from "@tanstack/react-query";

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
  const [showStats, setShowStats] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  const { data: participants = [] } = useQuery({
    queryKey: ["routineParticipants", routine.id],
    queryFn: () => routineService.getParticipants(routine.participants),
    enabled: showStats,
  });

  const canDelete = routine.createdBy === user?.uid;
  const canLeave = !canDelete && routine.participants.includes(user?.uid || "");

  const handleLeave = useCallback(
    async (keepPersonal: boolean) => {
      try {
        if (user) {
          await routineService.leaveRoutine(user.uid, routine.id, keepPersonal);
        }
      } catch (error) {
        console.error("Error leaving routine:", error);
      }
    },
    [user, routine.id]
  );

  const handleShowStats = useCallback(() => {
    setShowStats(true);
  }, []);

  const handleCloseStats = useCallback(() => {
    setShowStats(false);
  }, []);

  const handleShowLeaveModal = useCallback(() => {
    setShowLeaveModal(true);
  }, []);

  const handleCloseLeaveModal = useCallback(() => {
    setShowLeaveModal(false);
  }, []);

  const renderActionButtons = useCallback(
    () => (
      <View style={styles.actions}>
        <TouchableOpacity
          onPress={handleShowStats}
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
        ) : canLeave ? (
          <TouchableOpacity
            onPress={handleShowLeaveModal}
            style={styles.actionButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <FontAwesome5
              name="sign-out-alt"
              size={14}
              color={colors.warning}
            />
          </TouchableOpacity>
        ) : null}
      </View>
    ),
    [
      canDelete,
      canLeave,
      colors,
      onDelete,
      handleShowStats,
      handleShowLeaveModal,
    ]
  );

  return (
    <React.Fragment>
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
              <View style={styles.titleContainer}>
                <Text
                  style={[styles.title, { color: colors.textPrimary }]}
                  numberOfLines={1}
                >
                  {routine.title || "Untitled Routine"}
                </Text>
              </View>
              {renderActionButtons()}
            </View>
            {Boolean(routine.description) && (
              <Text
                style={[styles.description, { color: colors.textSecondary }]}
                numberOfLines={2}
              >
                {routine.description}
              </Text>
            )}
            <View style={styles.footer}>
              <View style={styles.participants}>
                {routine.participants
                  .slice(0, 3)
                  .map((participantId, index) => (
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
                      <FontAwesome5
                        name="user-circle"
                        size={24}
                        color={colors.textSecondary}
                      />
                    </View>
                  ))}
                {Boolean(routine.participants.length > 3) && (
                  <View
                    style={[
                      styles.moreParticipants,
                      { backgroundColor: colors.secondary, marginLeft: -8 },
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
              <View style={styles.metadata}>
                {Boolean(routine.metadata?.currentStreak) &&
                routine.metadata ? (
                  <View style={styles.metadataItem}>
                    <FontAwesome5
                      name="fire"
                      size={16}
                      color={colors.warning}
                    />
                    <Text
                      style={[styles.metadataText, { color: colors.warning }]}
                    >
                      {routine.metadata.currentStreak}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
      {showStats && (
        <RoutineStatsModal
          visible={showStats}
          onClose={handleCloseStats}
          routine={routine}
          participants={participants}
        />
      )}
      {showLeaveModal && (
        <LeaveRoutineModal
          visible={showLeaveModal}
          onClose={handleCloseLeaveModal}
          onLeave={handleLeave}
          routineTitle={routine.title}
        />
      )}
    </React.Fragment>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    ...Platform.select({
      web: {
        transition: "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
        cursor: "pointer",
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
    alignItems: "center",
    marginBottom: 12,
  },
  titleContainer: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
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
    justifyContent: "center",
    alignItems: "center",
  },
  moreParticipants: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  moreParticipantsText: {
    fontSize: 12,
    fontWeight: "600",
  },
  metadata: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 12,
  },
  metadataItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metadataText: {
    fontSize: 13,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    padding: 4,
  },
  menuButton: {
    padding: 8,
    borderRadius: 20,
  },
  menuIcon: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
