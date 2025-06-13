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
import MoodSelector from "./MoodSelector";
import { router } from "expo-router";
import { Button, Switch } from "react-native-paper";

interface Props {
  onClose: () => void;
}

export default function ReflectionEditor({ onClose }: Props) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [mood, setMood] = useState(3);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEncrypted, setIsEncrypted] = useState(false);

  const extractKeywords = (text: string): string[] => {
    // Basic keyword extraction
    const words = text.toLowerCase().split(/\W+/);
    const commonWords = new Set([
      "the",
      "be",
      "to",
      "of",
      "and",
      "a",
      "in",
      "that",
      "have",
      "i",
      "it",
      "for",
      "not",
      "on",
      "with",
      "he",
      "as",
      "you",
      "do",
      "at",
      "this",
      "but",
      "his",
      "by",
      "from",
      "they",
      "we",
      "say",
      "her",
      "she",
      "or",
      "an",
      "will",
      "my",
      "one",
      "all",
      "would",
      "there",
      "their",
      "what",
      "so",
      "up",
      "out",
      "if",
      "about",
      "who",
      "get",
      "which",
      "go",
      "me",
    ]);

    // Filter out short or common words, then deduplicate & limit
    return [
      ...new Set(
        words.filter((word) => word.length > 3 && !commonWords.has(word))
      ),
    ].slice(0, 5);
  };

  const handleSubmit = async () => {
    Keyboard.dismiss();
    if (!user?.uid) return;
    const trimmedContent = content.trim();

    if (!trimmedContent) {
      Toast.show({
        type: "error",
        text1: "Please write something in your reflection",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await journalService.saveEntry(
        user.uid,
        {
          type: JournalType.REFLECTION,
          content: {
            content: trimmedContent,
            mood,
            keywords: extractKeywords(trimmedContent),
          },
        },
        isEncrypted
      );

      Toast.show({
        type: "success",
        text1: "Reflection saved!",
      });
      onClose();
    } catch (error) {
      console.error("Error saving reflection:", error);
      Toast.show({
        type: "error",
        text1: "Failed to save reflection",
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
      style={[
        styles.keyboardAvoidingView,
        { backgroundColor: colors.background },
      ]}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
    >
      <ScrollView
        style={[styles.scrollView, { backgroundColor: colors.background }]}
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
          How are you feeling today?
        </Text>

        <MoodSelector value={mood} onChange={setMood} />

        <View
          style={[styles.encryptionToggle, { backgroundColor: colors.surface }]}
        >
          <Text style={[styles.encryptionLabel, { color: colors.textPrimary }]}>
            Encrypt Entry
          </Text>
          <Switch
            value={isEncrypted}
            onValueChange={setIsEncrypted}
            color={colors.secondary}
            trackColor={{ false: colors.border, true: colors.secondary }}
            thumbColor={colors.surface}
          />
        </View>

        <TextInput
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
          value={content}
          onChangeText={setContent}
          placeholder="Share your thoughts, feelings, or experiences..."
          placeholderTextColor={colors.textSecondary}
          multiline
          textAlignVertical="top"
          onSubmitEditing={Keyboard.dismiss}
        />

        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={isSubmitting}
          disabled={isSubmitting}
          style={[styles.submitButton, { backgroundColor: colors.secondary }]}
          textColor={colors.surface}
        >
          Save Reflection
        </Button>
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
    padding: 16,
  },
  historyButton: {
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 16,
  },
  input: {
    minHeight: 200,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
    marginBottom: 24,
    fontSize: 16,
  },
  submitButton: {
    marginTop: 8,
  },
  encryptionToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  encryptionLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
});
