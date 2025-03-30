import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { TextInput } from 'react-native-paper';
import { HabitFormProps } from './types';
import { createStyles } from './styles';

export const HabitForm: React.FC<HabitFormProps> = ({
  description,
  onDescriptionChange,
  onSubmit,
  isSubmitting,
  isValid,
  colors
}) => {
  const styles = createStyles(colors, false);

  const textInputTheme = {
    colors: {
      onSurfaceVariant: colors.textSecondary,
      background: colors.background,
    }
  };

  return (
    <View>
      <View style={styles.inputContainer}>
        {!description && (
          <Text style={[{ 
            color: colors.error,
            fontSize: 12,
            marginBottom: 4,
            marginTop: -8,
          }]}>
            Please provide your motivation
          </Text>
        )}
        <TextInput
          label="What's your motivation?"
          placeholder="e.g., To improve my health and energy levels"
          value={description}
          onChangeText={onDescriptionChange}
          mode="outlined"
          multiline
          style={[
            styles.input,
            { 
              backgroundColor: colors.surface,
              minHeight: 80,
              flexGrow: 1,
            }
          ]}
          outlineColor={colors.border}
          activeOutlineColor={colors.secondary}
          textColor={colors.textPrimary}
          placeholderTextColor={colors.textSecondary}
          theme={textInputTheme}
        />
      </View>

      <View style={[styles.buttonContainer, { backgroundColor: colors.background }]}>
        <TouchableOpacity 
          style={[
            styles.button, 
            { 
              backgroundColor: colors.secondary,
              opacity: isValid ? 1 : 0.5 
            }
          ]}
          onPress={onSubmit}
          disabled={!isValid || isSubmitting}
        >
          <Text style={[styles.buttonText, { color: colors.primary }]}>
            {isSubmitting ? 'Creating Habit...' : 'Start 66-Day Challenge'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}; 