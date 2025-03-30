import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import type Task from '@/backend/types/Task';
import { TaskSelectorProps } from './types';
import { createStyles } from './styles';

export const TaskSelector: React.FC<TaskSelectorProps> = ({
  selectedTask,
  onTaskSelect,
  onAddTaskPress,
  colors
}) => {
  const styles = createStyles(colors, false);

  const renderSelectedTask = () => {
    if (!selectedTask) return null;

    return (
      <View style={[styles.selectedTaskContainer, { backgroundColor: colors.surface }]}>
        <View style={styles.taskHeader}>
          <View style={styles.taskTitleRow}>
            <Text style={[styles.selectedTaskTitle, { color: colors.textPrimary }]}>
              {selectedTask.title}
            </Text>
            <TouchableOpacity 
              style={[styles.changeTaskButton, { borderColor: colors.border }]}
              onPress={onAddTaskPress}
            >
              <Text style={[styles.changeTaskText, { color: colors.textSecondary }]}>
                Change Task
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.selectedTaskDescription, { color: colors.textSecondary }]}>
            {selectedTask.description}
          </Text>

          <View style={styles.taskMetadata}>
            {/* Task Type */}
            <View style={styles.metadataItem}>
              <FontAwesome5 
                name={selectedTask.type === 'user-generated' ? 'user-edit' : 'tasks'} 
                size={12} 
                color={colors.textSecondary} 
              />
              <Text style={[styles.metadataText, { color: colors.textSecondary }]}>
                {selectedTask.type === 'user-generated' ? 'Custom Task' : 'System Task'}
              </Text>
            </View>

            {/* XP Categories */}
            <View style={styles.xpContainer}>
              {Object.entries(selectedTask.categoryXp || {}).map(([category, xp]) => (
                <View 
                  key={category}
                  style={[styles.xpBadge, { backgroundColor: colors.secondary + '20' }]}
                >
                  <Text style={[styles.xpText, { color: colors.secondary }]}>
                    {category}: {xp}XP
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View>
      <Text style={[styles.subtitle, { color: colors.textPrimary }]}>
        Select a Task
      </Text>
      <View style={styles.inputContainer}>
        {selectedTask ? (
          renderSelectedTask()
        ) : (
          <TouchableOpacity
            style={[styles.selectTaskButton, { backgroundColor: colors.surface }]}
            onPress={onAddTaskPress}
          >
            <View style={styles.selectTaskContent}>
              <FontAwesome5 name="plus-circle" size={16} color={colors.textSecondary} />
              <Text style={[styles.selectTaskText, { color: colors.textSecondary }]}>
                Select a task for your habit
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}; 