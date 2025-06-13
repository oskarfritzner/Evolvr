import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, IconButton, Surface } from "react-native-paper";
import { Stack, router } from "expo-router";
import { Goal, GoalTimeframe } from "@/backend/types/Goal";
import { goalService } from "@/backend/services/goalService";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { GoalModal } from "@/components/goals/GoalModal";
import GoalSection from "@/components/goals/GoalSection";
import { FontAwesome5 } from "@expo/vector-icons";

export default function GoalsPage() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 1024;

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState<GoalTimeframe>(
    GoalTimeframe.DAILY
  );
  const [selectedGoal, setSelectedGoal] = useState<Goal | undefined>(undefined);

  // Fetch all goals in a single query
  const { data: allGoals, isLoading } = useQuery({
    queryKey: ["goals", user?.uid],
    queryFn: async () => {
      if (!user?.uid) return null;

      // Fetch all goals in parallel
      const [daily, monthly, yearly] = await Promise.all([
        goalService.getGoalsByTimeframe(user.uid, GoalTimeframe.DAILY),
        goalService.getGoalsByTimeframe(user.uid, GoalTimeframe.MONTHLY),
        goalService.getGoalsByTimeframe(user.uid, GoalTimeframe.YEARLY),
      ]);

      return {
        daily,
        monthly,
        yearly,
      };
    },
    enabled: !!user?.uid,
    staleTime: 30000, // Consider data fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Memoize sorted goals
  const { dailyGoals, monthlyGoals, yearlyGoals } = useMemo(
    () => ({
      dailyGoals: allGoals?.daily || [],
      monthlyGoals: allGoals?.monthly || [],
      yearlyGoals: allGoals?.yearly || [],
    }),
    [allGoals]
  );

  // Memoize handlers
  const handleEditGoal = useCallback((goal: Goal) => {
    setSelectedTimeframe(goal.timeframe);
    setSelectedGoal(goal);
    setModalVisible(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalVisible(false);
    setSelectedGoal(undefined);
  }, []);

  if (isLoading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <LoadingSpinner />
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <Stack.Screen
        options={{
          headerTitle: "Goals",
          headerTitleStyle: {
            color: colors.textPrimary,
            fontSize: 24,
            fontWeight: "700",
          },
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerShadowVisible: false,
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={[styles.headerButton, { backgroundColor: colors.surface }]}
            >
              <FontAwesome5
                name="arrow-left"
                size={16}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.header}>
        <Text style={[styles.subtitle, { color: colors.labelSecondary }]}>
          Track your progress and achieve your goals
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          isLargeScreen && styles.scrollContentLarge,
        ]}
        removeClippedSubviews={true}
      >
        <View
          style={[
            styles.goalsContainer,
            isLargeScreen && styles.goalsContainerLarge,
          ]}
        >
          <GoalSection
            title="Daily Goals"
            goals={dailyGoals}
            timeframe={GoalTimeframe.DAILY}
            onEditGoal={handleEditGoal}
          />

          <GoalSection
            title="Monthly Goals"
            goals={monthlyGoals}
            timeframe={GoalTimeframe.MONTHLY}
            onEditGoal={handleEditGoal}
          />

          <GoalSection
            title="Yearly Goals"
            goals={yearlyGoals}
            timeframe={GoalTimeframe.YEARLY}
            onEditGoal={handleEditGoal}
          />
        </View>
      </ScrollView>

      <GoalModal
        visible={modalVisible}
        onClose={handleCloseModal}
        timeframe={selectedTimeframe}
        goalToEdit={selectedGoal}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "400",
    letterSpacing: 0.15,
    opacity: 0.8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 8,
  },
  scrollContentLarge: {
    padding: 24,
    paddingTop: 12,
  },
  goalsContainer: {
    flex: 1,
  },
  goalsContainerLarge: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 24,
  },
  headerButton: {
    padding: 12,
    borderRadius: 24,
    marginLeft: 16,
  },
});
