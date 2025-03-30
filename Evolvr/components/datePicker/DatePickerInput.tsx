import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { DatePickerInputProps } from './types';
import { createStyles } from './styles';

export const DatePickerInput: React.FC<DatePickerInputProps> = ({
  value,
  onChange,
  onFocus,
  onBlur,
  error,
  customStyles,
  colors,
  isFocused,
  onPickerPress
}) => {
  const styles = createStyles(colors, isFocused);

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        {Platform.OS === 'web' ? (
          <input
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={styles.webDateInput}
            onFocus={onFocus}
            onBlur={onBlur}
          />
        ) : (
          <>
            <TextInput
              style={[
                styles.input, 
                customStyles?.dateInput,
                error && styles.inputError,
                { flex: 1 }
              ]}
              value={value}
              onChangeText={onChange}
              placeholder="MM/DD/YYYY"
              placeholderTextColor={colors.textSecondary}
              onFocus={onFocus}
              onBlur={onBlur}
            />
            
            <TouchableOpacity
              style={[
                styles.pickerButton,
                error && styles.inputError
              ]}
              onPress={onPickerPress}
              testID="datePickerButton"
            >
              <MaterialIcons name="calendar-today" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </>
        )}
      </View>
      
      {Platform.OS !== 'web' && (
        <View style={styles.hintContainer}>
          <Text style={styles.formatHint}>Format: MM/DD/YYYY</Text>
        </View>
      )}

      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
}; 