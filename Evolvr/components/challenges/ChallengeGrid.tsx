import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  Platform,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";
import {
  ChallengeParticipation,
  UserChallenge,
} from "@/backend/types/Challenge";
import { useAuth } from "@/context/AuthContext";
import { router } from "expo-router";
import { FontAwesome5 } from "@expo/vector-icons";
import { challengeService } from "@/backend/services/challengeService";
import FailedChallengePrompt from "./FailedChallengePrompt";
import Toast from "react-native-toast-message";
import { useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";
import ChallengeCard from "./ChallengeCard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface Props {
  style?: ViewStyle;
  compact?: boolean;
}

// Helper function to convert ChallengeParticipation to UserChallenge
function participationToUserChallenge(
  participation: ChallengeParticipation
): UserChallenge {
  return {
    id: participation.id,
    title: participation.challengeData?.title || "",
    description: participation.challengeData?.description || "",
    duration: participation.challengeData?.duration || 0,
    tasks: participation.challengeData?.tasks || [],
    imageUrl: participation.challengeData?.imageUrl || "",
    category: participation.challengeData?.category || [],
    difficulty: participation.challengeData?.difficulty || "easy",
    participants: [],
    startDate: participation.startDate.toMillis(),
    active: participation.active,
    progress: participation.progress,
    taskProgress: [],
    taskCompletions: {},
  };
}

export default function ChallengeGrid({ style, compact = false }: Props) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [failedChallenge, setFailedChallenge] = useState<UserChallenge | null>(
    null
  );
  const queryClient = useQueryClient();
  const [leaveChallengeId, setLeaveChallengeId] = useState<string | null>(null);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      width: "100%",
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: Platform.OS === "ios" ? 16 : 12,
      paddingHorizontal: 16,
    },
    title: {
      fontSize: 16,
      fontWeight: "bold",
      letterSpacing: 1.6,
    },
    addButton: {
      padding: Platform.OS === "ios" ? 10 : 8,
      borderRadius: 20,
      width: Platform.OS === "ios" ? 40 : 36,
      height: Platform.OS === "ios" ? 40 : 36,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyState: {
      margin: 16,
      padding: Platform.OS === "ios" ? 24 : 20,
      borderRadius: 12,
      borderWidth: 2,
      borderStyle: "dashed",
      alignItems: "center",
      justifyContent: "center",
    },
    emptyStateText: {
      fontSize: Platform.OS === "ios" ? 15 : 14,
      textAlign: "center",
      lineHeight: Platform.OS === "ios" ? 22 : 20,
    },
    grid: Platform.select({
      web: {
        display: "flex",
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 16,
        padding: 16,
      },
      default: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        gap: 12,
      },
    }),
    challengeCard: {
      padding: 16,
      borderRadius: 12,
      ...Platform.select({
        web: {
          flex: 1,
          minWidth: 300,
          maxWidth: "100%",
        },
        default: {
          width: "100%",
        },
      }),
      elevation: 2,
      shadowColor: "#000",
      shadowOffset: { width: 2, height: 2 },
      shadowOpacity: 0.6,
      shadowRadius: 4,
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    challengeTitle: {
      fontSize: 14,
      fontWeight: "600",
      flex: 1,
      marginRight: 12,
    },
    progressContainer: {
      gap: 8,
    },
    progressInfo: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    metaItem: {
      flexDirection: "row",
      alignItems: "center",
    },
    metaIcon: {
      marginRight: 6,
    },
    metaText: {
      fontSize: 14,
    },
    progressBar: {
      height: 6,
      borderRadius: 3,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: 3,
    },
  });

  // Query user's challenges
  const { data: participations = [], isLoading } = useQuery<
    ChallengeParticipation[]
  >({
    queryKey: ["userChallenges", user?.uid],
    queryFn: async () => {
      if (!user?.uid) return [];
      return challengeService.getUserChallenges(user.uid);
    },
    enabled: !!user?.uid,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Convert participations to UserChallenge format
  const userChallenges = participations.map(participationToUserChallenge);

  useEffect(() => {
    if (user?.uid) {
      // Prefetch challenges data
      queryClient.prefetchQuery({
        queryKey: ["userChallenges", user.uid],
        queryFn: async () => challengeService.getUserChallenges(user.uid),
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
      });
    }
  }, [user?.uid]);

  useEffect(() => {
    checkFailedChallenges();
  }, []);

  const checkFailedChallenges = async () => {
    if (!user?.uid) return;
    const failedChallenges = await challengeService.checkFailedChallenges(
      user.uid
    );
    if (failedChallenges.length > 0) {
      setFailedChallenge(participationToUserChallenge(failedChallenges[0]));
    }
  };

  const handleRestart = async () => {
    if (!user?.uid || !failedChallenge) return;
    try {
      await challengeService.resetChallengeProgress(
        user.uid,
        failedChallenge.id
      );
      queryClient.invalidateQueries({ queryKey: ["userChallenges", user.uid] });
      Toast.show({
        type: "success",
        text1: "Challenge Reset",
        text2: "Your challenge has been reset. Good luck!",
      });
      setFailedChallenge(null);
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Failed to Reset",
        text2: "Please try again",
      });
    }
  };

  const handleQuit = async () => {
    if (!user?.uid || !failedChallenge) return;
    try {
      await challengeService.quitChallenge(user.uid, failedChallenge.id);
      queryClient.invalidateQueries({ queryKey: ["userChallenges", user.uid] });
      Toast.show({
        type: "success",
        text1: "Challenge Quit",
        text2: "Challenge has been removed from your active challenges",
      });
      setFailedChallenge(null);
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Failed to Quit",
        text2: "Please try again",
      });
    }
  };

  const handleLeaveChallenge = async () => {
    if (!user?.uid || !leaveChallengeId) return;

    try {
      await challengeService.quitChallenge(user.uid, leaveChallengeId);
      queryClient.invalidateQueries({ queryKey: ["userChallenges", user.uid] });
      Toast.show({
        type: "success",
        text1: "Left challenge successfully",
      });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to leave challenge",
      });
    } finally {
      setLeaveChallengeId(null);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.secondary }]}>
            Active Challenges
          </Text>
          <View
            style={[styles.addButton, { backgroundColor: colors.secondary }]}
          />
        </View>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <LoadingSpinner />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.secondary }]}>
          Active Challenges
        </Text>
        <TouchableOpacity
          onPress={() => router.push("/(modals)/challenge-list")}
          style={[styles.addButton, { backgroundColor: colors.secondary }]}
        >
          <FontAwesome5 name="plus" size={16} color={colors.surface} />
        </TouchableOpacity>
      </View>

      {userChallenges.length === 0 ? (
        <TouchableOpacity
          style={[styles.emptyState, { borderColor: colors.textSecondary }]}
          onPress={() => router.push("/(modals)/challenge-list")}
        >
          <Text
            style={[styles.emptyStateText, { color: colors.textSecondary }]}
          >
            No active challenges. Tap to browse available challenges!
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.grid}>
          {userChallenges.map((challenge) => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              onLeave={() => setLeaveChallengeId(challenge.id)}
            />
          ))}
        </View>
      )}

      {failedChallenge && (
        <FailedChallengePrompt
          challenge={failedChallenge}
          onRestart={handleRestart}
          onQuit={handleQuit}
        />
      )}

      <ConfirmationDialog
        visible={!!leaveChallengeId}
        title="Leave Challenge"
        message="Are you sure you want to leave this challenge? Your progress will be lost."
        onConfirm={handleLeaveChallenge}
        onCancel={() => setLeaveChallengeId(null)}
        confirmText="Leave"
      />
    </View>
  );
}
