import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { FontAwesome5 } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { habitService } from '@/backend/services/habitService';
import { useAuth } from '@/context/AuthContext';
import Toast from 'react-native-toast-message';

interface MissedHabit {
  habitId: string;
  title: string;
  daysMissed: number;
  lastStreak: number;
  timestamp: any; // Timestamp from Firebase
}

interface MissedHabitsAlertProps {
  missedHabits: MissedHabit[];
  onDismiss: () => void;
}

export default function MissedHabitsAlert({ missedHabits, onDismiss }: MissedHabitsAlertProps) {
  const { colors } = useTheme();
  const { user } = useAuth();

  const handleRestart = async (habitId: string) => {
    if (!user?.uid) return;
    
    try {
      await habitService.resetHabitProgress(habitId, true);
      Toast.show({
        type: 'success',
        text1: 'Habit Restarted',
        text2: 'Good luck with your fresh start! 💪',
        position: 'bottom',
      });
    } catch (error) {
      console.error('Error restarting habit:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to restart habit',
        position: 'bottom',
      });
    }
  };

  const handleContinue = async (habitId: string) => {
    if (!user?.uid) return;
    
    try {
      await habitService.resetHabitProgress(habitId, false);
      Toast.show({
        type: 'success',
        text1: 'Continuing Habit',
        text2: 'Keep going! Every day is a new opportunity.',
        position: 'bottom',
      });
    } catch (error) {
      console.error('Error continuing habit:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update habit',
        position: 'bottom',
      });
    }
  };

  if (!missedHabits.length) return null;

  return (
    <MotiView
      from={{ opacity: 0, translateY: -20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 300 }}
      style={[styles.container, { backgroundColor: colors.surface }]}
    >
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <FontAwesome5 name="exclamation-circle" size={20} color={colors.warning} />
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Missed Habits
          </Text>
        </View>
        <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <FontAwesome5 name="times" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {missedHabits.map((habit) => (
        <View key={habit.habitId} style={styles.habitItem}>
          <View style={styles.habitInfo}>
            <Text style={[styles.habitTitle, { color: colors.textPrimary }]}>
              {habit.title}
            </Text>
            <Text style={[styles.habitMeta, { color: colors.textSecondary }]}>
              Missed {habit.daysMissed} day{habit.daysMissed > 1 ? 's' : ''} • Previous streak: {habit.lastStreak} days
            </Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.warning + '20' }]}
              onPress={() => handleRestart(habit.habitId)}
            >
              <Text style={[styles.actionText, { color: colors.warning }]}>
                Restart
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.secondary + '20' }]}
              onPress={() => handleContinue(habit.habitId)}
            >
              <Text style={[styles.actionText, { color: colors.secondary }]}>
                Continue
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      <Text style={[styles.footer, { color: colors.textSecondary }]}>
        Tip: Missing a day doesn't mean failure. Choose to restart for a fresh start, or continue your progress!
      </Text>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  habitItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  habitInfo: {
    marginBottom: 12,
  },
  habitTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  habitMeta: {
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
}); 