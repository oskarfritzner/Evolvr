import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import type Task from '@/backend/types/Task';
import { TaskListProps } from './types';
import { createStyles } from './styles';
import { TaskItem } from './TaskItem';

export const TaskList: React.FC<TaskListProps> = ({ tasks, onTaskSelect, colors }) => {
  const styles = createStyles(colors, false);

  if (tasks.length === 0) {
    return (
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        No tasks found
      </Text>
    );
  }

  return (
    <View style={[styles.tasksContainer, { borderColor: colors.border }]}>
      <ScrollView style={styles.tasksScroll}>
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onSelect={onTaskSelect}
            colors={colors}
          />
        ))}
      </ScrollView>
    </View>
  );
}; 