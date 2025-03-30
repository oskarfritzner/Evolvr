import React, { useState, useCallback } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import HabitItem from './HabitItem';
import { MotiView } from 'moti';
import { useAuth } from '@/context/AuthContext';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { habitService } from '@/backend/services/habitService';
import Toast from 'react-native-toast-message';
import { Habit } from '@/backend/types/Habit';

interface HabitGridProps {
  habits: Habit[];
  onRefresh?: () => void;
}

export default function HabitGrid({ habits, onRefresh }: HabitGridProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['habits', user?.uid] });
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

  return (
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
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
});
