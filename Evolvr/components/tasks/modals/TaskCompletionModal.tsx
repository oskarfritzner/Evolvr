import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { FontAwesome5 } from "@expo/vector-icons";

interface TaskCompletionModalProps {
  visible: boolean;
  onClose: () => void;
  onComplete: (data: { duration: number; feedback: string }) => void;
  taskTitle: string;
}

export function TaskCompletionModal({
  visible,
  onClose,
  onComplete,
  taskTitle,
}: TaskCompletionModalProps) {
  const { colors } = useTheme();
  const [hours, setHours] = useState("0");
  const [minutes, setMinutes] = useState("0");
  const [feedback, setFeedback] = useState("");

  const handleComplete = () => {
    const totalMinutes = parseInt(hours) * 60 + parseInt(minutes);
    onComplete({
      duration: totalMinutes,
      feedback,
    });
  };

  const handleHoursChange = (text: string) => {
    // Only allow numbers
    if (/^\d*$/.test(text)) {
      setHours(text);
    }
  };

  const handleMinutesChange = (text: string) => {
    // Only allow numbers between 0-59
    if (/^\d*$/.test(text)) {
      const num = parseInt(text);
      if (num >= 0 && num <= 59) {
        setMinutes(text);
      }
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalContainer}
      >
        <View
          style={[styles.modalContent, { backgroundColor: colors.surface }]}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Complete Task
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.closeButton,
                { backgroundColor: colors.surfaceContainer },
              ]}
            >
              <FontAwesome5
                name="times"
                size={16}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <Text style={[styles.taskTitle, { color: colors.textSecondary }]}>
            {taskTitle}
          </Text>

          <View style={styles.timeContainer}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              Time Spent
            </Text>
            <View style={styles.timeInputs}>
              <View style={styles.timeInputWrapper}>
                <TextInput
                  style={[
                    styles.timeInput,
                    {
                      backgroundColor: colors.surfaceContainer,
                      color: colors.textPrimary,
                      borderColor: colors.border,
                    },
                  ]}
                  value={hours}
                  onChangeText={handleHoursChange}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                />
                <Text
                  style={[styles.timeLabel, { color: colors.textSecondary }]}
                >
                  Hours
                </Text>
              </View>

              <View style={styles.timeInputWrapper}>
                <TextInput
                  style={[
                    styles.timeInput,
                    {
                      backgroundColor: colors.surfaceContainer,
                      color: colors.textPrimary,
                      borderColor: colors.border,
                    },
                  ]}
                  value={minutes}
                  onChangeText={handleMinutesChange}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                />
                <Text
                  style={[styles.timeLabel, { color: colors.textSecondary }]}
                >
                  Minutes
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.feedbackContainer}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              Notes (Optional)
            </Text>
            <TextInput
              style={[
                styles.feedbackInput,
                {
                  backgroundColor: colors.surfaceContainer,
                  color: colors.textPrimary,
                  borderColor: colors.border,
                },
              ]}
              value={feedback}
              onChangeText={setFeedback}
              placeholder="Add any notes about this task..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.cancelButton,
                { borderColor: colors.border },
              ]}
              onPress={onClose}
            >
              <Text
                style={[styles.buttonText, { color: colors.textSecondary }]}
              >
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.completeButton,
                { backgroundColor: colors.secondary },
              ]}
              onPress={handleComplete}
            >
              <Text style={[styles.buttonText, { color: colors.surface }]}>
                Complete
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    width: "90%",
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
  },
  taskTitle: {
    fontSize: 16,
    marginBottom: 20,
  },
  timeContainer: {
    marginBottom: 20,
  },
  timeInputs: {
    flexDirection: "row",
    gap: 16,
    marginTop: 8,
  },
  timeInputWrapper: {
    flex: 1,
    alignItems: "center",
  },
  timeInput: {
    width: "100%",
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    textAlign: "center",
  },
  timeLabel: {
    marginTop: 4,
    fontSize: 14,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  feedbackContainer: {
    marginBottom: 20,
  },
  feedbackInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 100,
    alignItems: "center",
  },
  cancelButton: {
    borderWidth: 1,
  },
  completeButton: {
    borderWidth: 0,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
