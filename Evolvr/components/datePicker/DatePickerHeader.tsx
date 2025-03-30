import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { DatePickerHeaderProps } from './types';

export const DatePickerHeader: React.FC<DatePickerHeaderProps> = ({
  onCancel,
  onConfirm,
  label,
  colors
}) => {
  const styles = StyleSheet.create({
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(0,0,0,0.1)',
    },
    headerButton: {
      paddingHorizontal: 8,
    },
    headerButtonText: {
      fontSize: 17,
      fontWeight: '600',
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: colors.textPrimary,
    },
  });

  return (
    <View style={styles.header}>
      <TouchableOpacity 
        style={styles.headerButton} 
        onPress={onCancel}
      >
        <Text style={[styles.headerButtonText, { color: colors.textSecondary }]}>
          Cancel
        </Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Select {label}</Text>
      <TouchableOpacity 
        style={styles.headerButton} 
        onPress={onConfirm}
      >
        <Text style={[styles.headerButtonText, { color: colors.secondary }]}>
          Done
        </Text>
      </TouchableOpacity>
    </View>
  );
}; 