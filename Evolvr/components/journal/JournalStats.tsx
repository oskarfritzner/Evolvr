import React from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "react-native-paper";
import { useTheme } from "@/context/ThemeContext";
import { FontAwesome5 } from "@expo/vector-icons";

interface JournalStatsProps {
  wordCount: number;
  xpPotential: number;
}

const JournalStats = ({ wordCount, xpPotential }: JournalStatsProps) => {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.stat}>
        <FontAwesome5
          name="pen"
          size={16}
          color={colors.textSecondary}
          style={styles.icon}
        />
        <Text style={{ color: colors.textSecondary }}>{wordCount} words</Text>
      </View>
      <View style={styles.stat}>
        <FontAwesome5
          name="star"
          size={16}
          color={colors.textSecondary}
          style={styles.icon}
        />
        <Text style={{ color: colors.textSecondary }}>{xpPotential} XP</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    marginRight: 8,
  },
});

export default JournalStats;
