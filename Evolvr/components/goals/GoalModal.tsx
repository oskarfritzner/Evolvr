import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import {
  Modal,
  Portal,
  TextInput,
  Button,
  Text,
  Surface,
  IconButton,
} from "react-native-paper";
import { useTheme } from "@/context/ThemeContext";
import {
  Goal,
  GoalTimeframe,
  GoalStatus,
  GoalStep,
} from "@/backend/types/Goal";
import { goalService } from "@/backend/services/goalService";
import { useAuth } from "@/context/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import Toast from "react-native-toast-message";
import { Timestamp } from "firebase/firestore";
import { SafeAreaView } from "react-native-safe-area-context";
import { calculateProgressFromSteps } from "@/utils/goalUtils";

interface GoalModalProps {
  visible: boolean;
  onClose: () => void;
  timeframe: GoalTimeframe;
  goalToEdit?: Goal;
}

function generateId(prefix: string = "step"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function GoalModal({
  visible,
  onClose,
  timeframe,
  goalToEdit,
}: GoalModalProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [description, setDescription] = useState(goalToEdit?.description || "");
  const [measurable, setMeasurable] = useState(goalToEdit?.measurable || "");
  const [steps, setSteps] = useState<GoalStep[]>(goalToEdit?.steps || []);
  const [newStepText, setNewStepText] = useState("");

  // Reset form when modal closes
  useEffect(() => {
    if (!visible) {
      setDescription(goalToEdit?.description || "");
      setMeasurable(goalToEdit?.measurable || "");
      setSteps(goalToEdit?.steps || []);
      setNewStepText("");
    }
  }, [visible, goalToEdit]);

  const handleAddStep = () => {
    if (!newStepText.trim()) return;

    const newStep: GoalStep = {
      id: generateId("step"),
      description: newStepText.trim(),
      isCompleted: false,
    };

    setSteps([...steps, newStep]);
    setNewStepText("");
  };

  const handleRemoveStep = (stepId: string) => {
    setSteps(steps.filter((step) => step.id !== stepId));
  };

  const handleUpdateStep = (stepId: string, newDescription: string) => {
    setSteps(
      steps.map((step) =>
        step.id === stepId ? { ...step, description: newDescription } : step
      )
    );
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Please enter a goal description",
      });
      return;
    }

    if (!user?.uid) return;

    setIsSubmitting(true);
    try {
      const progress = calculateProgressFromSteps(steps);
      const goalData = {
        description: description.trim(),
        measurable: measurable.trim(),
        steps,
        progress,
        status: progress > 0 ? GoalStatus.IN_PROGRESS : GoalStatus.NOT_STARTED,
        updatedAt: Timestamp.now(),
      };

      if (goalToEdit) {
        await goalService.updateGoal(user.uid, goalToEdit.id, goalData);
      } else {
        await goalService.createGoal(user.uid, {
          ...goalData,
          timeframe,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["goals", user.uid] });

      Toast.show({
        type: "success",
        text1: "Success",
        text2: goalToEdit
          ? "Goal updated successfully"
          : "Goal created successfully",
      });

      onClose();
    } catch (error) {
      console.error("Error saving goal:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to save goal. Please try again.",
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
          { backgroundColor: colors.background },
        ]}
      >
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.labelPrimary }]}>
              {goalToEdit ? "Edit Goal" : "New Goal"}
            </Text>
            <IconButton icon="close" onPress={onClose} />
          </View>

          <ScrollView style={styles.content}>
            <TextInput
              label="What do you want to achieve?"
              value={description}
              onChangeText={setDescription}
              style={[
                styles.input,
                { backgroundColor: colors.surfaceContainerLow },
              ]}
              multiline
            />

            <TextInput
              label="How will you measure success?"
              value={measurable}
              onChangeText={setMeasurable}
              style={[
                styles.input,
                { backgroundColor: colors.surfaceContainerLow },
              ]}
              placeholder="e.g., Complete 5 tasks, Read 2 books"
            />

            {/* Steps Section */}
            <Surface
              style={[
                styles.stepsSection,
                { backgroundColor: colors.surfaceContainer },
              ]}
            >
              <Text
                style={[styles.sectionTitle, { color: colors.labelPrimary }]}
              >
                Break Down Your Goal into Steps
              </Text>

              <View style={styles.addStepContainer}>
                <TextInput
                  label="Add a step"
                  value={newStepText}
                  onChangeText={setNewStepText}
                  style={[
                    styles.stepInput,
                    { backgroundColor: colors.surfaceContainerLow },
                  ]}
                  right={
                    <TextInput.Icon
                      icon="plus"
                      onPress={handleAddStep}
                      disabled={!newStepText.trim()}
                    />
                  }
                  onSubmitEditing={handleAddStep}
                />
              </View>

              {steps.map((step, index) => (
                <View key={step.id} style={styles.stepItem}>
                  <Text
                    style={[
                      styles.stepNumber,
                      { color: colors.labelSecondary },
                    ]}
                  >
                    {index + 1}.
                  </Text>
                  <TextInput
                    value={step.description}
                    onChangeText={(text) => handleUpdateStep(step.id, text)}
                    style={[
                      styles.stepInput,
                      { backgroundColor: colors.surfaceContainerLow },
                    ]}
                    right={
                      <TextInput.Icon
                        icon="minus"
                        onPress={() => handleRemoveStep(step.id)}
                        color={colors.error}
                      />
                    }
                  />
                </View>
              ))}

              {steps.length === 0 && (
                <Text
                  style={[styles.emptySteps, { color: colors.labelSecondary }]}
                >
                  Add steps to track progress towards your goal
                </Text>
              )}
            </Surface>
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: colors.border }]}>
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
              {goalToEdit ? "Update" : "Create"}
            </Button>
          </View>
        </SafeAreaView>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    margin: 20,
    borderRadius: 12,
    overflow: "hidden",
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  input: {
    marginBottom: 16,
    borderRadius: 8,
  },
  stepsSection: {
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  addStepContainer: {
    marginBottom: 16,
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: "500",
    width: 24,
  },
  stepInput: {
    flex: 1,
    borderRadius: 8,
  },
  emptySteps: {
    textAlign: "center",
    fontStyle: "italic",
    marginTop: 8,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  footerButton: {
    minWidth: 100,
  },
});
