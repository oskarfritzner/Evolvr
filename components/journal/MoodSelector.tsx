import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

interface MoodSelectorProps {
  value: number;
  onChange: (mood: number) => void;
}

export const MoodSelector = ({ value, onChange }: MoodSelectorProps) => {
  const moods = [1, 2, 3, 4, 5];
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.labelPrimary }]}>How are you feeling?</Text>
      <View style={styles.moodRow}>
        {moods.map((mood) => (
          <TouchableOpacity
            key={mood}
            style={[
              styles.moodButton,
              value === mood && styles.selected,
              { borderColor: colors.border }
            ]}
            onPress={() => onChange(mood)}
          >
            <Text style={{ color: colors.labelPrimary }}>{getMoodEmoji(mood)}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const getMoodEmoji = (mood: number): string => {
  const emojis = ['😢', '😕', '😐', '🙂', '😄'];
  return emojis[mood - 1];
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  label: {
    marginBottom: 8,
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  moodButton: {
    padding: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selected: {
    backgroundColor: '#e3e3e3',
  },
}); 