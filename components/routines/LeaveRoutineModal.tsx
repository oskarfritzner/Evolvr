import React from 'react';
import { Modal, View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Card } from 'react-native-paper';
import { FontAwesome5 } from '@expo/vector-icons';

interface LeaveRoutineModalProps {
  visible: boolean;
  onClose: () => void;
  onLeave: (keepPersonal: boolean) => Promise<void>;
  routineTitle: string;
}

export function LeaveRoutineModal({ 
  visible, 
  onClose, 
  onLeave, 
  routineTitle 
}: LeaveRoutineModalProps) {
  const { colors } = useTheme();
  const [isLoading, setIsLoading] = React.useState(false);

  const handleLeave = async (keepPersonal: boolean) => {
    try {
      setIsLoading(true);
      await onLeave(keepPersonal);
      onClose();
    } catch (error) {
      console.error('Error leaving routine:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background + 'F2' }]}>
        <Card style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Leave "{routineTitle}"?
          </Text>
          
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            Choose how you'd like to proceed:
          </Text>

          <View style={styles.options}>
            <Pressable
              style={[styles.option, { backgroundColor: colors.error + '20' }]}
              onPress={() => handleLeave(false)}
              disabled={isLoading}
            >
              <FontAwesome5 name="times-circle" size={24} color={colors.error} />
              <Text style={[styles.optionTitle, { color: colors.error }]}>
                Leave Completely
              </Text>
              <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                Remove this routine entirely
              </Text>
            </Pressable>

            <Pressable
              style={[styles.option, { backgroundColor: colors.success + '20' }]}
              onPress={() => handleLeave(true)}
              disabled={isLoading}
            >
              <FontAwesome5 name="copy" size={24} color={colors.success} />
              <Text style={[styles.optionTitle, { color: colors.success }]}>
                Keep Personal Copy
              </Text>
              <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                Continue with your own version
              </Text>
            </Pressable>
          </View>

          <Pressable
            style={[styles.cancelButton]}
            onPress={onClose}
            disabled={isLoading}
          >
            <Text style={[styles.cancelText, { color: colors.textSecondary }]}>
              Cancel
            </Text>
          </Pressable>
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    padding: 20,
    borderRadius: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  options: {
    gap: 12,
  },
  option: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },
  optionDesc: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  cancelButton: {
    marginTop: 16,
    padding: 12,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
  },
}); 