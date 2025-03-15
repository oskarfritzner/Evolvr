import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import ProgressBar from './ProgressBar';
import { FontAwesome5 } from '@expo/vector-icons';
import { levelService } from '@/backend/services/levelService';
import { CategoryLevel } from '@/backend/types/Level';

interface Category extends CategoryLevel {
  id: string;
  name: string;
  icon: string;
}

interface LevelProgressProps {
  category?: Category;
  categories?: Record<string, CategoryLevel>;
  style?: object;
}

export default function LevelProgress({ category, categories, style }: LevelProgressProps) {
  const { colors } = useTheme();

  console.log(levelService);

  let levelInfo;
  let levelType = 'Overall Level';
  let formattedXP = '';

  if (category) {
    // Handle category-specific progress
    levelInfo = levelService.getLevelInfo(category.xp);
    levelType = `${category.name} Level`;
    formattedXP = `${levelInfo.currentLevelXP}/${levelInfo.nextLevelXP} XP`;
  } else if (categories) {
    // Handle overall progress
    levelInfo = levelService.getOverallLevelInfo(categories);
    formattedXP = `${(levelInfo.currentLevelXP / 1000).toFixed(1)}k / ${(levelInfo.nextLevelXP / 1000).toFixed(1)}k XP`;
  } else {
    // Fallback to default values
    const currentLevel = 1;
    levelInfo = {
      level: currentLevel,
      currentLevelXP: 0,
      nextLevelXP: levelService.getXPNeededForNextLevel(currentLevel),
      progress: 0,
    };
  }

  return (
    <View style={[
      styles.container, 
      { backgroundColor: colors.surface },
      style
    ]}>
      <View style={styles.header}>
        {category && (
          <FontAwesome5
            name={category.icon}
            size={24}
            color={colors.secondary}
            style={styles.icon}
          />
        )}
        <View style={styles.titleContainer}>
          <Text style={[styles.levelType, { color: colors.textSecondary }]}>{levelType}</Text>
          <Text style={[styles.levelText, { color: colors.textPrimary }]}>Level {levelInfo.level}</Text>
        </View>
      </View>

      <View style={styles.progressContainer}>
        <ProgressBar
          progress={levelInfo.progress}
          color={colors.secondary}
          style={styles.progressBar}
        />
        <Text style={[styles.xpText, { color: colors.textSecondary }]}>{formattedXP}</Text>
      </View>

      <View style={styles.levelInfo}>
        <Text style={styles.xpProgress}>
          {`${levelInfo.currentLevelXP} / ${levelInfo.nextLevelXP} XP`}
        </Text>
        <ProgressBar 
          progress={levelInfo.progress}
          color={colors.secondary}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  icon: {
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  levelType: {
    fontSize: 12,
    marginBottom: 4,
  },
  levelText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  xpText: {
    fontSize: 10,
    marginTop: 8,
    textAlign: 'right',
  },
  levelInfo: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  xpProgress: {
    fontSize: 10,
    marginRight: 8,
  },
});