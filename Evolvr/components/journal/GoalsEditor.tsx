import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity } from 'react-native';
import { TextInput, Button, IconButton, HelperText, Surface } from 'react-native-paper';
import { useTheme } from '@/context/ThemeContext';
import { journalService } from '@/backend/services/journalService';
import { JournalType, SmartGoal } from '@/backend/types/JournalEntry';
import { useAuth } from '@/context/AuthContext';
import Toast from 'react-native-toast-message';
import { v4 as uuidv4 } from 'uuid';

interface GoalInputProps {
  goal: SmartGoal;
  onUpdate: (updatedGoal: SmartGoal) => void;
  onDelete: () => void;
  type: 'daily' | 'monthly' | 'yearly';
}

const GoalInput = ({ goal, onUpdate, onDelete, type }: GoalInputProps) => {
  const { colors } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  const getPrompt = () => {
    switch (type) {
      case 'daily':
        return "What specific task do you want to accomplish today?";
      case 'monthly':
        return "What meaningful progress do you want to make this month?";
      case 'yearly':
        return "What significant goal do you want to achieve this year?";
    }
  };

  return (
    <View style={[styles.goalInput, { 
      backgroundColor: colors.surfaceContainer,
      borderColor: colors.border,
      borderWidth: 1,
    }]}>
      <View style={styles.goalHeader}>
        <TextInput
          value={goal.description}
          onChangeText={(text) => onUpdate({ ...goal, description: text })}
          placeholder={getPrompt()}
          placeholderTextColor={colors.labelTertiary}
          style={[styles.input, { 
            backgroundColor: colors.surfaceContainerLow,
            color: colors.textPrimary,
          }]}
          multiline
        />
        <IconButton
          icon={isExpanded ? "chevron-up" : "chevron-down"}
          iconColor={colors.labelSecondary}
          onPress={() => setIsExpanded(!isExpanded)}
        />
        <IconButton
          icon="delete"
          iconColor={colors.error}
          onPress={onDelete}
        />
      </View>

      {isExpanded && (
        <View style={[styles.smartDetails, { borderTopColor: colors.border }]}>
          <TextInput
            value={goal.measurable}
            onChangeText={(text) => onUpdate({ ...goal, measurable: text })}
            placeholder="How will you measure success?"
            placeholderTextColor={colors.labelTertiary}
            style={[styles.detailInput, { 
              backgroundColor: colors.surfaceContainerLow,
              color: colors.textPrimary,
            }]}
          />
          <TextInput
            value={goal.deadline}
            onChangeText={(text) => onUpdate({ ...goal, deadline: text })}
            placeholder={`Target completion date (${type})`}
            placeholderTextColor={colors.labelTertiary}
            style={[styles.detailInput, { 
              backgroundColor: colors.surfaceContainerLow,
              color: colors.textPrimary,
            }]}
          />
          {goal.steps?.map((step, index) => (
            <View key={index} style={styles.stepInput}>
              <TextInput
                value={step}
                onChangeText={(text) => {
                  const newSteps = [...(goal.steps || [])];
                  newSteps[index] = text;
                  onUpdate({ ...goal, steps: newSteps });
                }}
                placeholder={`Step ${index + 1}`}
                placeholderTextColor={colors.labelTertiary}
                style={[styles.input, { 
                  backgroundColor: colors.surfaceContainerLow,
                  color: colors.textPrimary,
                }]}
              />
              <IconButton
                icon="minus"
                iconColor={colors.error}
                onPress={() => {
                  const newSteps = goal.steps?.filter((_, i) => i !== index);
                  onUpdate({ ...goal, steps: newSteps });
                }}
              />
            </View>
          ))}
          <Button
            onPress={() => {
              const newSteps = [...(goal.steps || []), ''];
              onUpdate({ ...goal, steps: newSteps });
            }}
            mode="outlined"
            style={styles.addStepButton}
            textColor={colors.secondary}
            buttonColor={colors.surfaceContainerHigh}
          >
            Add Step
          </Button>
        </View>
      )}
    </View>
  );
};

const CollapsibleSection = ({ 
  title, 
  isExpanded, 
  onToggle,
  onSave,
  isSubmitting,
  children 
}: { 
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  onSave: () => Promise<void>;
  isSubmitting: boolean;
  children: React.ReactNode;
}) => {
  const { colors } = useTheme();
  
  return (
    <Surface style={[styles.collapsibleSection, { backgroundColor: colors.surfaceContainerHigh }]}>
      <TouchableOpacity 
        onPress={onToggle}
        style={[styles.sectionHeader, { borderBottomColor: isExpanded ? colors.border : 'transparent' }]}
      >
        <Text style={[styles.sectionTitle, { color: colors.labelPrimary }]}>
          {title}
        </Text>
        <IconButton
          icon={isExpanded ? "chevron-up" : "chevron-down"}
          iconColor={colors.labelSecondary}
        />
      </TouchableOpacity>
      {isExpanded && (
        <View style={styles.sectionContent}>
          {children}
          <Button
            mode="contained"
            onPress={onSave}
            loading={isSubmitting}
            disabled={isSubmitting}
            style={styles.sectionSaveButton}
            buttonColor={colors.secondary}
            textColor={colors.primary}
          >
            Save {title}
          </Button>
        </View>
      )}
    </Surface>
  );
};

export default function GoalsEditor({ onClose }: { onClose: () => void }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [goals, setGoals] = useState({
    daily: [createEmptyGoal()],
    monthly: [createEmptyGoal()],
    yearly: [createEmptyGoal()]
  });
  const [submittingSections, setSubmittingSections] = useState({
    daily: false,
    monthly: false,
    yearly: false
  });
  const [expandedSections, setExpandedSections] = useState({
    monthly: false,
    yearly: false
  });

  function createEmptyGoal(): SmartGoal {
    return {
      id: uuidv4(),
      description: '',
      isCompleted: false,
      steps: []
    };
  }

  const handleSaveSection = async (type: 'daily' | 'monthly' | 'yearly') => {
    if (!user?.uid) return;

    // Filter out empty goals for this section
    const sectionGoals = goals[type].filter(g => g.description.trim());

    if (sectionGoals.length === 0) {
      Toast.show({
        type: 'error',
        text1: `Please add at least one ${type} goal`,
      });
      return;
    }

    setSubmittingSections(prev => ({ ...prev, [type]: true }));
    try {
      await journalService.saveEntry(user.uid, {
        type: JournalType.GOALS,
        content: {
          ...goals,
          [type]: sectionGoals
        },
      });

      Toast.show({
        type: 'success',
        text1: `${type.charAt(0).toUpperCase() + type.slice(1)} goals saved successfully!`,
      });
      
      // Only close modal if saving daily goals
      if (type === 'daily') {
        onClose();
      }
    } catch (error) {
      console.error('Error saving goals:', error);
      Toast.show({
        type: 'error',
        text1: `Failed to save ${type} goals`,
        text2: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setSubmittingSections(prev => ({ ...prev, [type]: false }));
    }
  };

  const renderGoalSection = (type: 'daily' | 'monthly' | 'yearly') => (
    <View style={styles.section}>
      {goals[type].map((goal, index) => (
        <GoalInput
          key={goal.id}
          goal={goal}
          type={type}
          onUpdate={(updatedGoal) => {
            const newGoals = [...goals[type]];
            newGoals[index] = updatedGoal;
            setGoals({ ...goals, [type]: newGoals });
          }}
          onDelete={() => {
            const newGoals = goals[type].filter((_, i) => i !== index);
            setGoals({ ...goals, [type]: newGoals });
          }}
        />
      ))}
      <Button
        onPress={() => {
          setGoals({
            ...goals,
            [type]: [...goals[type], createEmptyGoal()]
          });
        }}
        mode="outlined"
        style={styles.addButton}
        textColor={colors.secondary}
        buttonColor={colors.surfaceContainerHigh}
      >
        Add {type} goal
      </Button>
    </View>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.labelPrimary }]}>
        Set Your SMART Goals
      </Text>
      <HelperText type="info" style={[styles.helper, { color: colors.labelSecondary }]}>
        SMART goals are: Specific, Measurable, Achievable, Relevant, and Time-bound
      </HelperText>

      <View style={styles.dailySection}>
        <Text style={[styles.sectionTitle, { color: colors.labelPrimary }]}>
          Daily Goals
        </Text>
        {renderGoalSection('daily')}
        <Button
          mode="contained"
          onPress={() => handleSaveSection('daily')}
          loading={submittingSections.daily}
          disabled={submittingSections.daily}
          style={styles.sectionSaveButton}
          buttonColor={colors.secondary}
          textColor={colors.primary}
        >
          Save Daily Goals
        </Button>
      </View>

      <CollapsibleSection
        title="Monthly Goals"
        isExpanded={expandedSections.monthly}
        onToggle={() => setExpandedSections(prev => ({ 
          ...prev, 
          monthly: !prev.monthly 
        }))}
        onSave={() => handleSaveSection('monthly')}
        isSubmitting={submittingSections.monthly}
      >
        {renderGoalSection('monthly')}
      </CollapsibleSection>

      <CollapsibleSection
        title="Yearly Goals"
        isExpanded={expandedSections.yearly}
        onToggle={() => setExpandedSections(prev => ({ 
          ...prev, 
          yearly: !prev.yearly 
        }))}
        onSave={() => handleSaveSection('yearly')}
        isSubmitting={submittingSections.yearly}
      >
        {renderGoalSection('yearly')}
      </CollapsibleSection>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  helper: {
    marginBottom: 24,
    textAlign: 'center',
  },
  section: {
    marginBottom: 16,
  },
  dailySection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 16,
  },
  collapsibleSection: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  sectionContent: {
    padding: 16,
  },
  goalInput: {
    marginBottom: 12,
    borderRadius: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderRadius: 8,
  },
  smartDetails: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  detailInput: {
    marginBottom: 8,
    borderRadius: 8,
  },
  stepInput: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  addStepButton: {
    marginTop: 8,
    borderRadius: 8,
  },
  addButton: {
    marginTop: 8,
    borderRadius: 8,
  },
  sectionSaveButton: {
    marginTop: 16,
    borderRadius: 8,
  },
}); 