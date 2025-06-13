import {
  JournalEntry,
  JournalType,
  ReflectionEntry,
} from "@/backend/types/JournalEntry";
import { useState } from "react";
import { View, TextInput, StyleSheet } from "react-native";
import { journalService } from "@/backend/services/journalService";
import MoodSelector from "./MoodSelector";
import PromptSuggestions from "./PromptSuggestions";
import JournalStats from "./JournalStats";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { Switch, Text, Button } from "react-native-paper";

const styles = StyleSheet.create({
  container: {
    padding: 15,
    borderRadius: 8,
  },
  input: {
    padding: 15,
    minHeight: 150,
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: 10,
    textAlignVertical: "top",
  },
  encryptionToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  encryptionLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
});

const JournalEditor = ({ onClose }: { onClose?: () => void }) => {
  const { colors } = useTheme();
  const [entry, setEntry] = useState("");
  const [mood, setMood] = useState(3);
  const [selectedPrompts, setSelectedPrompts] = useState<string[]>([]);
  const { user } = useAuth();
  const [currentPrompt, setCurrentPrompt] = useState<string>(
    "How are you feeling today?"
  );
  const [isEncrypted, setIsEncrypted] = useState(false);

  const handleSave = async () => {
    if (!user?.uid) return;

    // Calculate keywords manually since the service doesn't have extractKeywords
    const keywords = entry
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 3)
      .slice(0, 10);

    const newEntry: Omit<
      JournalEntry,
      "id" | "userId" | "timestamp" | "xpAwarded"
    > = {
      type: JournalType.REFLECTION,
      content: {
        content: entry,
        mood,
        keywords,
      } as ReflectionEntry,
    };

    await journalService.saveEntry(user.uid, newEntry, isEncrypted);
    // Clear form and close modal
    setEntry("");
    setSelectedPrompts([]);
    onClose?.();
  };

  const addPrompt = (prompt: string) => {
    setSelectedPrompts((prev) => [...prev, prompt]);
    setCurrentPrompt(prompt);
    setEntry((prev) => prev + (prev ? "\n\n" : "") + prompt + "\n");
  };

  const wordCount = entry.split(/\s+/).filter(Boolean).length;
  const xpPotential = Math.min(wordCount * 2, 100); // Simple XP calculation

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Text style={[styles.encryptionLabel, { color: colors.textPrimary }]}>
        Encrypt Entry
      </Text>
      <Switch
        value={isEncrypted}
        onValueChange={setIsEncrypted}
        color={colors.primary}
      />

      <MoodSelector value={mood} onChange={setMood} />
      <PromptSuggestions onSelect={addPrompt} selected={selectedPrompts} />

      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.surface,
            color: colors.textPrimary,
            borderColor: colors.border,
          },
        ]}
        value={entry}
        onChangeText={setEntry}
        placeholder="Write your journal entry..."
        placeholderTextColor={colors.textSecondary}
        multiline
        textAlignVertical="top"
      />

      <JournalStats wordCount={wordCount} xpPotential={xpPotential} />

      <Button
        mode="contained"
        onPress={handleSave}
        style={{ backgroundColor: colors.primary }}
      >
        Save Entry
      </Button>
    </View>
  );
};

export default JournalEditor;
