import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Text } from "react-native-paper";
import { useTheme } from "@/context/ThemeContext";

interface MoodSelectorProps {
  value: number;
  onChange: (value: number) => void;
}

const moods = [
  { value: 1, emoji: "😢", label: "Sad" },
  { value: 2, emoji: "😕", label: "Meh" },
  { value: 3, emoji: "😐", label: "Neutral" },
  { value: 4, emoji: "🙂", label: "Good" },
  { value: 5, emoji: "😊", label: "Great" },
];

export default function MoodSelector({ value, onChange }: MoodSelectorProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.textPrimary }]}>Mood</Text>
      <View style={styles.moodContainer}>
        {moods.map((mood) => (
          <TouchableOpacity
            key={mood.value}
            style={[
              styles.moodButton,
              {
                backgroundColor:
                  value === mood.value ? colors.secondary : colors.surface,
                borderColor: colors.border,
              },
            ]}
            onPress={() => onChange(mood.value)}
          >
            <Text style={styles.emoji}>{mood.emoji}</Text>
            <Text
              style={[
                styles.moodLabel,
                {
                  color:
                    value === mood.value
                      ? colors.surface
                      : colors.textSecondary,
                },
              ]}
            >
              {mood.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  moodContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  moodButton: {
    flex: 1,
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  emoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  moodLabel: {
    fontSize: 12,
    textAlign: "center",
  },
});
