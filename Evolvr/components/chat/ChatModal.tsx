import React from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { ChatUI } from './ChatUI';
import { Ionicons } from '@expo/vector-icons';

interface ChatModalProps {
  visible: boolean;
  onClose: () => void;
  mode: 'taskGenerator' | 'goalDivider';
}

export function ChatModal({ visible, onClose, mode }: ChatModalProps) {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          >
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <ChatUI mode={mode} onClose={onClose} />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 48,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    top: 12,
  },
}); 