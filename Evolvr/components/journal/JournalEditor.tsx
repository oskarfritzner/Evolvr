import {
  JournalEntry,
  JournalType,
  ReflectionEntry,
} from "@/backend/types/JournalEntry";
import { useState } from "react";
import { View, TextInput, Button, StyleSheet } from "react-native";
import { journalService } from "@/backend/services/journalService";
import { MoodSelector } from "./MoodSelector";
import { PromptSuggestions } from "./PromptSuggestions";
import { JournalStats } from "./JournalStats";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";

const styles = StyleSheet.create({
  container: {
    padding: 15,
    backgroundColor: "#fff",
    borderRadius: 8,
  },
  input: {
    padding: 15,
    minHeight: 150,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    marginVertical: 10,
    textAlignVertical: "top",
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

  const handleSave = async () => {
    if (!user?.uid) return;

    // Calculate keywords manually since the service doesn't have extractKeywords
    const keywords = entry
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 3)
      .slice(0, 10);

    const newEntry: Partial<JournalEntry> = {
      type: JournalType.REFLECTION,
      content: {
        content: entry,
        mood,
        keywords,
      } as ReflectionEntry,
    };

    await journalService.saveEntry(user.uid, newEntry);
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

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <MoodSelector value={mood} onChange={setMood} />

      <PromptSuggestions onSelect={addPrompt} selected={selectedPrompts} />

      <TextInput
        multiline
        value={entry}
        onChangeText={setEntry}
        placeholder={currentPrompt}
        style={[
          styles.input,
          {
            color: colors.textPrimary,
            backgroundColor: colors.surface,
          },
        ]}
      />

      <JournalStats
        wordCount={entry.split(/\s+/).filter(Boolean).length}
        xpPotential={100} // Use fixed XP since calculateXP doesn't exist
      />

      <Button title="Save Entry" onPress={handleSave} />
    </View>
  );
};

export default JournalEditor;
