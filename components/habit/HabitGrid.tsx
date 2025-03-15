import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Habit } from '@/backend/types/Habit';
import HabitItem from './HabitItem';
import { MotiView } from 'moti';
import { useAuth } from '@/context/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import ConfirmationDialog from '@/components/common/ConfirmationDialog';
import { FontAwesome5 } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { habitService } from '@/backend/services/habitService';

interface HabitGridProps {
  habits: Habit[];
  onRefresh?: () => void;
}

export default function HabitGrid({ habits, onRefresh }: HabitGridProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [deleteHabitId, setDeleteHabitId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!user?.uid || !deleteHabitId) return;
    
    try {
      await habitService.deleteHabit(user.uid, deleteHabitId);
      queryClient.invalidateQueries({ queryKey: ['habits', user.uid] });
      Toast.show({
        type: 'success',
        text1: 'Habit deleted successfully'
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error instanceof Error ? error.message : 'Failed to delete habit'
      });
    } finally {
      setDeleteHabitId(null);
    }
  };

  return (
    <View style={styles.container}>
      {habits.map((habit, index) => (
        <MotiView
          key={habit.id}
          from={{ 
            translateY: 20,
          }}
          animate={{ 
            translateY: 0,
          }}
          transition={{ 
            type: 'spring',
            delay: index * 50,
            damping: 15,
            mass: 0.8,
          }}
        >
          <HabitItem 
            habit={habit}
            onRefresh={onRefresh}
            onDelete={() => setDeleteHabitId(habit.id)}
          />
        </MotiView>
      ))}
      
      <ConfirmationDialog
        visible={!!deleteHabitId}
        title="Delete Habit"
        message="Are you sure you want to delete this habit? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteHabitId(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 8,
    paddingHorizontal: 16,
  },
});
