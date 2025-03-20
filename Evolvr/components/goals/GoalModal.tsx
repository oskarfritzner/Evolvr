import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Modal, Portal, TextInput, Button, Text, Surface, IconButton } from 'react-native-paper';
import { useTheme } from '@/context/ThemeContext';
import { Goal, GoalTimeframe, GoalStatus, GoalStep } from '@/backend/types/Goal';
import { goalService } from '@/backend/services/goalService';
import { useAuth } from '@/context/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { Timestamp } from 'firebase/firestore';
import { SafeAreaView } from 'react-native-safe-area-context';

interface GoalModalProps {
  visible: boolean;
  onClose: () => void;
  timeframe: GoalTimeframe;
  goalToEdit?: Goal;
}

function generateId(prefix: string = 'step'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function GoalModal({ visible, onClose, timeframe, goalToEdit }: GoalModalProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [description, setDescription] = useState(goalToEdit?.description || '');
  const [measurable, setMeasurable] = useState(goalToEdit?.measurable || '');
  const [steps, setSteps] = useState<GoalStep[]>(
    goalToEdit?.steps || []
  );
  const [newStep, setNewStep] = useState('');

  // Reset form when modal is opened
  React.useEffect(() => {
    if (visible) {
      setDescription(goalToEdit?.description || '');
      setMeasurable(goalToEdit?.measurable || '');
      setSteps(goalToEdit?.steps || []);
      setNewStep('');
    }
  }, [visible, goalToEdit]);

  const handleAddStep = () => {
    if (!newStep.trim()) return;
    
    setSteps([
      ...steps,
      {
        id: generateId('step'),
        description: newStep.trim(),
        isCompleted: false
      }
    ]);
    setNewStep('');
  };

  const handleRemoveStep = (stepId: string) => {
    setSteps(steps.filter(step => step.id !== stepId));
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please enter a goal description'
      });
      return;
    }

    if (!user?.uid) return;

    setIsSubmitting(true);
    try {
      if (goalToEdit) {
        await goalService.updateGoal(user.uid, goalToEdit.id, {
          description: description.trim(),
          measurable: measurable.trim(),
          steps,
          updatedAt: Timestamp.now()
        });
      } else {
        await goalService.createGoal(user.uid, {
          description: description.trim(),
          timeframe,
          measurable: measurable.trim(),
          steps,
          status: GoalStatus.NOT_STARTED,
          progress: 0
        });
      }

      // Invalidate and refetch goals
      queryClient.invalidateQueries({ queryKey: ['goals', user.uid, timeframe] });
      
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: goalToEdit ? 'Goal updated successfully' : 'Goal created successfully'
      });
      
      onClose();
    } catch (error) {
      console.error('Error saving goal:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to save goal. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onClose}
        contentContainerStyle={[
          styles.modalContainer,
          { backgroundColor: colors.background }
        ]}
      >
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.header}>
            <IconButton
              icon="close"
              iconColor={colors.textPrimary}
              size={24}
              onPress={onClose}
              style={styles.headerButton}
            />
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {goalToEdit ? 'Edit Goal' : `New ${timeframe} Goal`}
            </Text>
            <View style={{ width: 40 }} /> {/* Spacer for alignment */}
          </View>

          <ScrollView style={styles.content}>
            <Surface style={[styles.formSection, { backgroundColor: colors.surfaceContainer }]}>
              <TextInput
                label="Goal Description"
                value={description}
                onChangeText={setDescription}
                multiline
                style={[styles.input, { backgroundColor: colors.surfaceContainerLow }]}
                textColor={colors.textPrimary}
                placeholderTextColor={colors.textSecondary}
                theme={{ 
                  colors: { 
                    onSurfaceVariant: colors.textSecondary,
                    primary: colors.secondary,
                    onSurfaceDisabled: colors.textSecondary,
                  }
                }}
                selectionColor={colors.secondary}
                underlineColor={colors.border}
                activeUnderlineColor={colors.secondary}
              />

              <TextInput
                label="Measurable Outcome (optional)"
                value={measurable}
                onChangeText={setMeasurable}
                placeholder="e.g., Run 5km, Read 2 books"
                style={[styles.input, styles.measurableInput, { backgroundColor: colors.surfaceContainerLow }]}
                textColor={colors.textPrimary}
                placeholderTextColor={colors.textSecondary}
                theme={{ 
                  colors: { 
                    onSurfaceVariant: colors.textSecondary,
                    primary: colors.secondary,
                    onSurfaceDisabled: colors.textSecondary,
                  }
                }}
                selectionColor={colors.secondary}
                underlineColor={colors.border}
                activeUnderlineColor={colors.secondary}
              />
            </Surface>

            <Surface style={[styles.formSection, { backgroundColor: colors.surfaceContainer }]}>
              <Text style={[styles.sectionTitle, { color: colors.labelPrimary }]}>
                Steps
              </Text>
              
              <View style={styles.stepsContainer}>
                {steps.map((step, index) => (
                  <View key={step.id} style={styles.stepRow}>
                    <Text style={[styles.stepNumber, { color: colors.labelSecondary }]}>
                      {index + 1}.
                    </Text>
                    <Text style={[styles.stepText, { color: colors.labelPrimary }]}>
                      {step.description}
                    </Text>
                    <IconButton
                      icon="delete"
                      iconColor={colors.error}
                      size={20}
                      onPress={() => handleRemoveStep(step.id)}
                    />
                  </View>
                ))}
              </View>

              <View style={styles.addStepContainer}>
                <TextInput
                  label="Add Step"
                  value={newStep}
                  onChangeText={setNewStep}
                  style={[styles.stepInput, { backgroundColor: colors.surfaceContainerLow }]}
                  textColor={colors.textPrimary}
                  placeholderTextColor={colors.textSecondary}
                  theme={{ 
                    colors: { 
                      onSurfaceVariant: colors.textSecondary,
                      primary: colors.secondary,
                      onSurfaceDisabled: colors.textSecondary,
                    }
                  }}
                  selectionColor={colors.secondary}
                  underlineColor={colors.border}
                  activeUnderlineColor={colors.secondary}
                  right={
                    <TextInput.Icon
                      icon="plus"
                      onPress={handleAddStep}
                      disabled={!newStep.trim()}
                      color={colors.textSecondary}
                    />
                  }
                />
              </View>
            </Surface>
          </ScrollView>

          <Surface style={[styles.footer, { backgroundColor: colors.surfaceContainer }]}>
            <Button
              mode="outlined"
              onPress={onClose}
              style={styles.footerButton}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={isSubmitting}
              disabled={isSubmitting || !description.trim()}
              style={styles.footerButton}
            >
              {goalToEdit ? 'Update' : 'Create'}
            </Button>
          </Surface>
        </SafeAreaView>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerButton: {
    marginLeft: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  formSection: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
  },
  measurableInput: {
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  stepsContainer: {
    marginBottom: 16,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepNumber: {
    width: 24,
    fontSize: 14,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
  },
  addStepContainer: {
    marginTop: 8,
  },
  stepInput: {
    marginBottom: 0,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    gap: 8,
  },
  footerButton: {
    minWidth: 100,
  },
}); 