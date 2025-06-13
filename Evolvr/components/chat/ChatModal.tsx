import React, { useState } from "react";
import { Modal, SafeAreaView, StyleSheet } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { ChatUI } from "./ChatUI";

interface ChatModalProps {
  visible: boolean;
  onClose: () => void;
  mode: "taskCreator" | "goalDivider";
}

export function ChatModal({
  visible,
  onClose,
  mode: initialMode,
}: ChatModalProps) {
  const { colors } = useTheme();
  const [currentMode, setCurrentMode] = useState(initialMode);

  // Reset mode when modal is closed
  const handleClose = () => {
    setCurrentMode(initialMode);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <ChatUI
          mode={currentMode}
          onClose={handleClose}
          onModeChange={setCurrentMode}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
