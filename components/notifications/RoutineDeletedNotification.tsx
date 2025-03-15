import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { FontAwesome5 } from '@expo/vector-icons';
import { routineService } from '@/backend/services/routineServices';

interface RoutineDeletedNotificationProps {
  notification: any;
  onRespond: () => void;
}

export function RoutineDeletedNotification({ 
  notification, 
  onRespond 
}: RoutineDeletedNotificationProps) {
  const { colors } = useTheme();
  const [isLoading, setIsLoading] = React.useState(false);

  const handleContinue = async () => {
    try {
      setIsLoading(true);
      await routineService.continueDeletedRoutine(
        notification.userId,
        notification.routineId,
        notification
      );
      onRespond();
    } catch (error) {
      console.error('Error continuing routine:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <FontAwesome5 name="exclamation-circle" size={24} color={colors.warning} />
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Routine Deleted by Creator
        </Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          Would you like to continue "{notification.routineTitle}" on your own?
        </Text>
        <View style={styles.actions}>
          <Pressable
            style={[styles.button, { backgroundColor: colors.success + '20' }]}
            onPress={handleContinue}
            disabled={isLoading}
          >
            <Text style={[styles.buttonText, { color: colors.success }]}>
              Continue Routine
            </Text>
          </Pressable>
          <Pressable
            style={styles.button}
            onPress={onRespond}
            disabled={isLoading}
          >
            <Text style={[styles.buttonText, { color: colors.textSecondary }]}>
              Dismiss
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    alignItems: 'flex-start',
    gap: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    padding: 8,
    borderRadius: 8,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
  },
}); 