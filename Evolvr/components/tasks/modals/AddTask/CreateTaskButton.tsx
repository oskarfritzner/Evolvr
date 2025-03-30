import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { CreateTaskButtonProps } from './types';
import { createStyles } from './styles';

export const CreateTaskButton: React.FC<CreateTaskButtonProps> = ({ onPress, colors }) => {
  const styles = createStyles(colors, false);

  return (
    <TouchableOpacity
      style={[
        styles.createTaskButton,
        { backgroundColor: colors.surface }
      ]}
      onPress={onPress}
    >
      <FontAwesome5
        name="plus-circle"
        size={16}
        color={colors.textSecondary}
      />
      <Text style={[styles.createTaskText, { color: colors.textSecondary }]}>
        Create a new task
      </Text>
    </TouchableOpacity>
  );
}; 