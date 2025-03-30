import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Text, Pressable, TouchableOpacity } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, IconButton, Surface } from 'react-native-paper';
import { Stack, router } from 'expo-router';
import { Goal, GoalTimeframe } from '@/backend/types/Goal';
import { goalService } from '@/backend/services/goalService';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { GoalModal } from '@/components/goals/GoalModal';
import { GoalSection } from '@/components/goals/GoalSection';
import { FontAwesome5 } from '@expo/vector-icons';

export default function GoalsPage() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [expandedSections, setExpandedSections] = useState({
    monthly: false,
    yearly: false
  });

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState<GoalTimeframe>(GoalTimeframe.DAILY);
  const [selectedGoal, setSelectedGoal] = useState<Goal | undefined>(undefined);

  // Fetch goals data
  const { data: dailyGoals, isLoading: loadingDaily } = useQuery({
    queryKey: ['goals', user?.uid, 'daily'],
    queryFn: () => goalService.getGoalsByTimeframe(user?.uid || '', GoalTimeframe.DAILY),
    enabled: !!user?.uid
  });

  const { data: monthlyGoals, isLoading: loadingMonthly } = useQuery({
    queryKey: ['goals', user?.uid, 'monthly'],
    queryFn: () => goalService.getGoalsByTimeframe(user?.uid || '', GoalTimeframe.MONTHLY),
    enabled: !!user?.uid
  });

  const { data: yearlyGoals, isLoading: loadingYearly } = useQuery({
    queryKey: ['goals', user?.uid, 'yearly'],
    queryFn: () => goalService.getGoalsByTimeframe(user?.uid || '', GoalTimeframe.YEARLY),
    enabled: !!user?.uid
  });

  const isLoading = loadingDaily || loadingMonthly || loadingYearly;

  const handleCreateGoal = (timeframe: GoalTimeframe) => {
    setSelectedTimeframe(timeframe);
    setSelectedGoal(undefined);
    setModalVisible(true);
  };

  const handleEditGoal = (goal: Goal) => {
    setSelectedTimeframe(goal.timeframe);
    setSelectedGoal(goal);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedGoal(undefined);
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Stack.Screen
        options={{
          headerTitle: "Goals",
          headerTitleStyle: { 
            color: colors.textPrimary,
            fontSize: 20,
            fontWeight: '600',
          },
          headerStyle: { 
            backgroundColor: colors.background 
          },
          headerShadowVisible: false,
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => router.back()}
              style={[styles.headerButton, { backgroundColor: colors.surface }]}
            >
              <FontAwesome5 name="arrow-left" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView style={styles.scrollView}>
        <GoalSection
          title="Daily Goals"
          goals={dailyGoals || []}
          timeframe={GoalTimeframe.DAILY}
          onEditGoal={(goal) => {
            setSelectedGoal(goal);
            setSelectedTimeframe(GoalTimeframe.DAILY);
            setModalVisible(true);
          }}
        />

        <GoalSection
          title="Monthly Goals"
          goals={monthlyGoals || []}
          timeframe={GoalTimeframe.MONTHLY}
          isExpanded={expandedSections.monthly}
          onToggleExpand={() => setExpandedSections(prev => ({ 
            ...prev, 
            monthly: !prev.monthly 
          }))}
          onEditGoal={(goal) => {
            setSelectedGoal(goal);
            setSelectedTimeframe(GoalTimeframe.MONTHLY);
            setModalVisible(true);
          }}
        />

        <GoalSection
          title="Yearly Goals"
          goals={yearlyGoals || []}
          timeframe={GoalTimeframe.YEARLY}
          isExpanded={expandedSections.yearly}
          onToggleExpand={() => setExpandedSections(prev => ({ 
            ...prev, 
            yearly: !prev.yearly 
          }))}
          onEditGoal={(goal) => {
            setSelectedGoal(goal);
            setSelectedTimeframe(GoalTimeframe.YEARLY);
            setModalVisible(true);
          }}
        />
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
  scrollView: {
    flex: 1,
    padding: 16,
  },
  headerButton: {
    padding: 12,
    borderRadius: 24,
    marginLeft: 16,
  },
}); 