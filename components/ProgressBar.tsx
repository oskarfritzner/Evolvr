import React from "react";
import { View, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { levelService } from "@/backend/services/levelService";

interface ProgressBarProps {
  progress: number; // Progress between 0 and 1
  color?: string;   // Optional override for progress bar color
  style?: StyleProp<ViewStyle>; // Custom styles for the container
  barStyle?: StyleProp<ViewStyle>; // New prop for bar styling
  showBackground?: boolean;
  isXPBar?: boolean;
  currentXP?: number;
  category?: string; // Add category prop
  compact?: boolean;  // Add this line
}

const ProgressBar: React.FC<ProgressBarProps> = ({ 
  progress, 
  color, 
  style, 
  barStyle,
  showBackground = true, 
  isXPBar = false, 
  currentXP,
  category,
  compact
}) => {
  const { colors } = useTheme();
  
  // Calculate progress based on XP and category
  const progressValue = isXPBar && currentXP !== undefined
    ? category 
      ? levelService.getLevelInfo(currentXP).progress
      : levelService.getOverallLevelInfo({ [category || 'overall']: { xp: currentXP, level: 1 } }).progress
    : progress;

  // Ensure progress is between 0 and 1
  const clampedProgressValue = Math.min(Math.max(progressValue, 0), 1);

  return (
    <View
      style={[
        styles.container,
        { height: compact ? 4 : 8 },
        showBackground && { backgroundColor: colors.background },
        style,
      ]}
    >
      <View
        style={[
          styles.bar,
          {
            width: `${Math.min(clampedProgressValue * 100, 100)}%`,
            backgroundColor: color || colors.secondary,
            height: '100%',
          },
          barStyle,
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    borderRadius: 4,
    width: '100%',
    backgroundColor: '#E0E0E0', // Light gray background
  },
  bar: {
    borderRadius: 4,
    height: '100%',
  },
});

export default ProgressBar;