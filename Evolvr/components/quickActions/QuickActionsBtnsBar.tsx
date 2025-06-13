import React from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { JournalType } from "@/backend/types/JournalEntry";
import { router } from "expo-router";
import { Button } from "react-native-paper";

export default function QuickActionsBtnsBar() {
  const { colors } = useTheme();

  return (
    <View style={[styles(colors).quickActions]}>
      <Button
        mode="contained"
        onPress={() => {
          router.push({
            pathname: "/(modals)/journal",
            params: { initialType: JournalType.REFLECTION },
          });
        }}
        style={[
          styles(colors).quickActionButton,
          { backgroundColor: colors.secondary },
        ]}
        contentStyle={{ paddingHorizontal: 2 }}
        icon="book"
        labelStyle={{ color: colors.primary, fontSize: 12 }}
        compact
      >
        Journal
      </Button>
      <Button
        mode="contained"
        onPress={() => {
          router.push("/goals");
        }}
        style={[
          styles(colors).quickActionButton,
          { backgroundColor: colors.secondary },
        ]}
        contentStyle={{ paddingHorizontal: 2 }}
        icon="bullseye"
        labelStyle={{ color: colors.primary, fontSize: 12 }}
        compact
      >
        Set Goals
      </Button>
    </View>
  );
}

const styles = (colors: any) =>
  StyleSheet.create({
    quickActions: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-start",
      gap: 8,
      marginLeft: 16,
      marginBottom: 16,
    },
    quickActionButton: {
      marginHorizontal: 4,
    },
  });
