import React, { useState, useCallback, useEffect } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import HabitItem from './HabitItem';
import MissedHabitsAlert from './MissedHabitsAlert';
import { MotiView } from 'moti';
import { useAuth } from '@/context/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { habitService } from '@/backend/services/habitService';
import Toast from 'react-native-toast-message';
import { Habit } from '@/backend/types/Habit';
import { UserData } from '@/backend/types/UserData';

interface HabitGridProps {
  habits: Habit[];
  onRefresh?: () => void;
  missedHabits?: UserData['missedHabits'];
}

export default function HabitGrid({ habits, onRefresh, missedHabits = [] }: HabitGridProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [showMissedAlert, setShowMissedAlert] = useState(true);
  const [lastCheckTimestamp, setLastCheckTimestamp] = useState<number>(0);
  
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['habits', user?.uid] });
    await queryClient.invalidateQueries({ queryKey: ['userData', user?.uid] });
    if (onRefresh) onRefresh();
    setRefreshing(false);
  }, [queryClient, user?.uid, onRefresh]);

  const handleHabitComplete = useCallback(async () => {
    if (!user?.uid) return;

    // Invalidate relevant queries
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['habits', user?.uid] }),
      queryClient.invalidateQueries({ queryKey: ['userData', user?.uid] }),
      queryClient.invalidateQueries({ queryKey: ['activeTasks', user?.uid] })
    ]);

    // Trigger a refresh after a short delay to ensure UI updates
    setTimeout(() => {
      handleRefresh();
    }, 100);
  }, [queryClient, user?.uid, handleRefresh]);

  const handleDelete = useCallback(async (habitId: string) => {
    if (!user?.uid) return;
    
    try {
      await habitService.deleteHabit(user.uid, habitId);
      await queryClient.invalidateQueries({ queryKey: ['habits', user?.uid] });
      Toast.show({
        type: 'success',
        text1: 'Habit deleted',
        position: 'bottom'
      });
    } catch (error) {
      console.error('Error deleting habit:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error instanceof Error ? error.message : 'Failed to delete habit',
        position: 'bottom'
      });
    }
  }, [queryClient, user?.uid]);

  // Check for missed habits only on mount and after long intervals
  useEffect(() => {
    const now = Date.now();
    // Only check if it's been more than 1 hour since last check
    if (user?.uid && (now - lastCheckTimestamp > 3600000)) {
      const checkMissedHabits = async () => {
        try {
          await habitService.checkAndHandleMissedDays(user.uid);
          setLastCheckTimestamp(now);
        } catch (error) {
          console.error('Error checking missed habits:', error);
        }
      };
      checkMissedHabits();
    }
  }, [user?.uid, lastCheckTimestamp]);

  const handleDismissMissedAlert = useCallback(() => {
    setShowMissedAlert(false);
  }, []);

  return (
    <>
      {/* Show missed habits alert if there are any and not dismissed */}
      {showMissedAlert && missedHabits && missedHabits.length > 0 ? (
        <MissedHabitsAlert
          missedHabits={missedHabits}
          onDismiss={handleDismissMissedAlert}
        />
      ) : null}

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        contentContainerStyle={styles.container}
      >
        {habits.map((habit) => (
          <MotiView
            key={habit.id}
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'timing', duration: 300 }}
          >
            <HabitItem
              habit={habit}
              onRefresh={handleRefresh}
              onDelete={() => handleDelete(habit.id)}
              onComplete={handleHabitComplete}
            />
          </MotiView>
        ))}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
});
