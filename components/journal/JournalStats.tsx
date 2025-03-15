import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

interface JournalStatsProps {
  wordCount: number;
  xpPotential: number;
}

export const JournalStats = ({ wordCount, xpPotential }: JournalStatsProps) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Text style={[styles.stat, { color: colors.labelSecondary }]}>Words: {wordCount}</Text>
      <Text style={[styles.stat, { color: colors.labelSecondary }]}>Potential XP: {Math.floor(xpPotential)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 8,
    marginVertical: 10,
  },
  stat: {
    fontSize: 14,
  },
}); 