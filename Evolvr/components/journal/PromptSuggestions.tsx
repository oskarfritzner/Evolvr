import React, { useMemo } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

interface PromptSuggestionsProps {
  onSelect: (prompt: string) => void;
  selected: string[];
}

export const PromptSuggestions = ({ onSelect, selected }: PromptSuggestionsProps) => {
  const { colors } = useTheme();
  const allPrompts = {
    gratitude: [
      "What are you grateful for today?",
      "What's something unexpected that made you smile?",
      "Who made a positive impact on your day?",
    ],
    reflection: [
      "What's your biggest challenge right now?",
      "How are you feeling different from yesterday?",
      "What's one thing you learned today?",
    ],
    growth: [
      "What's one step you took toward your goals?",
      "What would make tomorrow better than today?",
      "What's something you'd like to improve?",
    ]
  };

  // Randomly select prompts from each category
  const displayPrompts = useMemo(() => {
    const prompts: string[] = [];
    Object.values(allPrompts).forEach(category => {
      const availablePrompts = category.filter(p => !selected.includes(p));
      if (availablePrompts.length > 0) {
        prompts.push(availablePrompts[Math.floor(Math.random() * availablePrompts.length)]);
      }
    });
    return prompts;
  }, [selected]);

  return (
    <View style={styles.container}>
      {displayPrompts.map((prompt) => (
        <TouchableOpacity
          key={prompt}
          style={[
            styles.prompt,
            selected.includes(prompt) && styles.selected,
            { backgroundColor: colors.surface }
          ]}
          onPress={() => onSelect(prompt)}
        >
          <Text style={[styles.promptText, { color: colors.labelPrimary }]}>{prompt}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  prompt: {
    padding: 10,
    marginVertical: 5,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  selected: {
    backgroundColor: '#e0e0e0',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  promptText: {
    fontSize: 14,
  },
}); 