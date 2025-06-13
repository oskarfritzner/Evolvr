import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Chip, Text } from "react-native-paper";
import { useTheme } from "@/context/ThemeContext";

const prompts = [
  "What's on your mind today?",
  "What are you grateful for?",
  "What's your biggest challenge right now?",
  "What are you looking forward to?",
  "What did you learn today?",
  "What made you smile today?",
  "What's your biggest win today?",
  "What could you have done better today?",
  "What are your goals for tomorrow?",
  "What's something you want to improve?",
];

interface PromptSuggestionsProps {
  onSelect: (prompt: string) => void;
  selected: string[];
}

const PromptSuggestions = ({ onSelect, selected }: PromptSuggestionsProps) => {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        Suggested Prompts
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
      >
        {prompts.map((prompt) => (
          <Chip
            key={prompt}
            onPress={() => onSelect(prompt)}
            style={[
              styles.chip,
              selected.includes(prompt) && {
                backgroundColor: colors.secondary,
              },
            ]}
            textStyle={{
              color: selected.includes(prompt)
                ? colors.primary
                : colors.textSecondary,
            }}
          >
            {prompt}
          </Chip>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
  },
  scrollView: {
    flexDirection: "row",
  },
  chip: {
    marginRight: 8,
    marginBottom: 8,
  },
});

export default PromptSuggestions;
