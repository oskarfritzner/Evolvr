import React, { useState } from "react";
import { View, StyleSheet, TouchableOpacity, Text } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { FontAwesome5 } from "@expo/vector-icons";
import { TaskCreator } from "./modes/taskCreator/TaskCreator";
import { GoalDivider } from "./modes/goalDivider/GoalDivider";

interface ChatUIProps {
  mode: "taskCreator" | "goalDivider";
  onClose?: () => void;
  onModeChange?: (mode: "taskCreator" | "goalDivider") => void;
}

const MODE_DISPLAY_NAMES: Record<"taskCreator" | "goalDivider", string> = {
  taskCreator: "Task Creator",
  goalDivider: "Goal Divider",
};

export function ChatUI({ mode, onClose, onModeChange }: ChatUIProps) {
  const { colors } = useTheme();
  const [showModeSelector, setShowModeSelector] = useState(false);

  const handleModeSelect = (selectedMode: "taskCreator" | "goalDivider") => {
    onModeChange?.(selectedMode);
    setShowModeSelector(false);
  };

  const renderMode = () => {
    switch (mode) {
      case "taskCreator":
        return <TaskCreator onClose={onClose || (() => {})} />;
      case "goalDivider":
        return <GoalDivider onClose={onClose || (() => {})} />;
      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {showModeSelector && (
        <View
          style={[
            styles.modeMenu,
            {
              backgroundColor: colors.surfaceContainer,
              borderColor: colors.border,
            },
          ]}
        >
          {Object.entries(MODE_DISPLAY_NAMES).map(([key, name]) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.modeMenuItem,
                { borderBottomColor: colors.border },
              ]}
              onPress={() =>
                handleModeSelect(key as "taskCreator" | "goalDivider")
              }
            >
              <Text
                style={[styles.modeMenuText, { color: colors.textPrimary }]}
              >
                {name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      {renderMode()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modeMenu: {
    position: "absolute",
    top: 64,
    left: 16,
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
    zIndex: 1000,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  modeMenuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  modeMenuText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
