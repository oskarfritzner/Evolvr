import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FontAwesome5 } from "@expo/vector-icons";
import { CategoryLevel } from '@/backend/types/Level';
import { useTheme } from '@/context/ThemeContext';
import { levelService } from '@/backend/services/levelService';
import ProgressCircle from '../../ProgressCircle';

interface CategoryProgressCardProps {
  category: string;
  data: CategoryLevel;
  onPress?: () => void;
}

export default function CategoryProgressCard({ category, data, onPress }: CategoryProgressCardProps) {
  const { colors } = useTheme();

  // Calculate XP and progress
  const currentLevelXP = data.xp - ((data.level - 1) * levelService.getXPNeededForNextLevel(1));
  const progress = levelService.getCategoryLevelProgress(
    data.xp,
    data.level
  );

  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: string } = {
      physical: "dumbbell",
      mental: "brain",
      intellectual: "book",
      spiritual: "pray",
      financial: "coins",
      career: "briefcase",
      relationships: "users",
    };
    return icons[category.toLowerCase()] || "star";
  };

  const getCategoryColor = (category: string) => {
    const categoryColors: { [key: string]: string } = {
      physical: "#FF6B6B",
      intellectual: "#7B68EE",
      spiritual: "#FFD93D",
      relationships: "#FF9999",
      career: "#96CEB4",
      mental: "#9B59B6",     // Distinct purple
      financial: "#45B7D1"   // Bright blue
    };
    return categoryColors[category.toLowerCase()] || "#4A90E2";
  };

  return (
    <TouchableOpacity 
      style={[styles.card, { backgroundColor: colors.surface }]}
      onPress={onPress}
    >
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: getCategoryColor(category) + '20' }]}>
          <FontAwesome5 
            name={getCategoryIcon(category)} 
            size={20} 
            color={getCategoryColor(category)} 
          />
        </View>
        <Text 
          style={[styles.title, { color: colors.textPrimary }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {category.charAt(0).toUpperCase() + category.slice(1)}
        </Text>
      </View>

      <View style={styles.progressContainer}>
        <ProgressCircle
          progress={progress}
          size={80}
          strokeWidth={8}
          color={getCategoryColor(category)}
          showPercentage={true}
          label={`Level ${data.level}`}
        />
        <Text style={[styles.xpText, { color: colors.textSecondary }]}>
          {Math.max(0, currentLevelXP)} / {levelService.getXPNeededForNextLevel(1)} XP
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 12,
    marginRight: 16,
    width: 180,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  progressContainer: {
    alignItems: 'center',
  },
  xpText: {
    fontSize: 12,
    marginTop: 8,
    fontWeight: '500',
  },
});
