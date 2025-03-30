import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import type Task from '@/backend/types/Task';
import { TaskItemProps } from './types';
import { createStyles } from './styles';

export const TaskItem: React.FC<TaskItemProps> = ({ task, onSelect, colors }) => {
  const styles = createStyles(colors, false);

  return (
    <TouchableOpacity
      style={[
        styles.taskItem,
        { backgroundColor: colors.surface }
      ]}
      onPress={() => onSelect(task)}
    >
      <FontAwesome5
        name={task.type === 'user-generated' ? 'user-edit' : 'tasks'}
        size={16}
        color={colors.textSecondary}
      />
      <Text style={[styles.taskText, { color: colors.textPrimary }]}>
        {task.title}
      </Text>
    </TouchableOpacity>
  );
}; 