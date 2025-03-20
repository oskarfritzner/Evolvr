import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

interface LevelBadgeProps {
  level: number;
  backgroundColor?: string;
}

export default function LevelBadge({ level, backgroundColor }: LevelBadgeProps) {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.levelIndicator, { backgroundColor: backgroundColor || colors.primary }]}>
      <View style={[styles.levelLine, { backgroundColor: colors.textPrimary }]} />
      <View style={[styles.levelBadge, { backgroundColor: backgroundColor || colors.primary }]}>
        <Text style={[styles.levelNumber, { color: colors.textPrimary }]}>
          {level || 1}
        </Text>
        <Text style={[styles.levelLabel, { color: colors.textSecondary }]}>
          LEVEL
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  levelIndicator: {
    width: '100%',
    height: 40,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelLine: {
    height: 2,
    width: '100%',
    position: 'absolute',
    top: '50%',
  },
  levelBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelNumber: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  levelLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
}); 