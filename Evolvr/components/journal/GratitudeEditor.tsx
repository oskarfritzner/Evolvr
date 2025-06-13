import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Text,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Keyboard,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { journalService } from "@/backend/services/journalService";
import { JournalType } from "@/backend/types/JournalEntry";
import { useAuth } from "@/context/AuthContext";
import Toast from "react-native-toast-message";
import { router } from "expo-router";
import { Button, Switch } from "react-native-paper";

interface Props {
  onClose: () => void;
}

export default function GratitudeEditor({ onClose }: Props) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [items, setItems] = useState(["", "", ""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEncrypted, setIsEncrypted] = useState(false);

  const handleSubmit = async () => {
    Keyboard.dismiss();
    if (!user?.uid) return;

    // Filter out empty items and check if we have at least one
    const cleanedItems = items.filter((item) => item.trim());

    if (cleanedItems.length === 0) {
      Toast.show({
        type: "error",
        text1: "Please add at least one gratitude item",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await journalService.saveEntry(
        user.uid,
        {
          type: JournalType.GRATITUDE,
          content: {
            items: cleanedItems,
          },
        },
        isEncrypted
      );

      Toast.show({
        type: "success",
        text1: "Gratitude saved!",
      });
      onClose();
    } catch (error) {
      console.error("Error saving gratitude:", error);
      Toast.show({
        type: "error",
        text1: "Failed to save gratitude",
        text2:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.keyboardAvoidingView}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Button
          mode="text"
          onPress={() => router.push("/journal-history")}
          icon="history"
          textColor={colors.textSecondary}
          style={styles.historyButton}
        >
          See journal history
        </Button>

        <Text style={[styles.title, { color: colors.textPrimary }]}>
          What are you grateful for today?
        </Text>

        {/* Add encryption toggle */}
        <View style={styles.encryptionToggle}>
          <Text style={[styles.encryptionLabel, { color: colors.textPrimary }]}>
            Encrypt Entry
          </Text>
          <Switch
            value={isEncrypted}
            onValueChange={setIsEncrypted}
            color={colors.primary}
          />
        </View>

        {items.map((item, index) => (
          <TextInput
            key={index}
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                color: colors.textPrimary,
                borderColor: colors.border,
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 2,
              },
            ]}
            value={item}
            onChangeText={(text) => {
              const newItems = [...items];
              newItems[index] = text;
              setItems(newItems);
            }}
            placeholder="I'm grateful for..."
            placeholderTextColor={colors.textSecondary}
            multiline
            maxLength={200}
            onSubmitEditing={Keyboard.dismiss}
          />
        ))}

        <TouchableOpacity
          style={[
            styles.submitButton,
            {
              backgroundColor: colors.secondary,
              opacity: isSubmitting ? 0.7 : 1,
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
              elevation: 5,
            },
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Text style={[styles.submitText, { color: colors.surface }]}>
            {isSubmitting ? "Saving..." : "Save Gratitude"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: 32,
    paddingBottom: Platform.OS === "ios" ? 120 : 80,
  },
  historyButton: {
    alignSelf: "flex-end",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 32,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 20,
    minHeight: 100,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  submitButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  submitText: {
    fontSize: 18,
    fontWeight: "600",
  },
  encryptionToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  encryptionLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
});
