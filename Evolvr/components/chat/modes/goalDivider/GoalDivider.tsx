import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';

interface GoalDividerProps {
  onClose: () => void;
}

export function GoalDivider({ onClose }: GoalDividerProps) {
  const { colors } = useTheme();

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.headerContainer}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerText, { color: colors.textPrimary }]}>Goal Divider</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={onClose}
            style={[styles.closeButton, { backgroundColor: colors.surfaceContainer }]}
          >
            <Text style={[styles.closeButtonText, { color: colors.textSecondary }]}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.contentContainer}>
        <View style={[styles.message, { backgroundColor: colors.surfaceContainer }]}>
          <Text style={[styles.messageText, { color: colors.textPrimary }]}>
            ✨ Goal Divider is coming soon! This exciting feature is currently under development. Stay tuned for updates!
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerText: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
  },
  closeButtonText: {
    fontSize: 16,
  },
  contentContainer: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  message: {
    padding: 16,
    borderRadius: 12,
    marginVertical: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
}); 