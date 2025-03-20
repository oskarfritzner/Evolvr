import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { Theme } from '@react-navigation/native';

interface Task {
  id: string;
  name: string;
  completed: boolean;
  createdAt: string;
}

type ExtendedColors = Theme['colors'] & {
  textSecondary: string;
  error: string;
}

interface TaskListProps {
  tasks: Task[];
  onTasksChange: (tasks: Task[]) => void;
  colors: ExtendedColors;
}

export function TaskList({ tasks, onTasksChange, colors }: TaskListProps) {
  const [newTaskName, setNewTaskName] = useState('');

  const addTask = () => {
    if (newTaskName.trim()) {
      onTasksChange([
        ...tasks,
        {
          id: Date.now().toString(),
          name: newTaskName.trim(),
          completed: false,
          createdAt: new Date().toISOString(),
        },
      ]);
      setNewTaskName('');
    }
  };

  const removeTask = (taskId: string) => {
    onTasksChange(tasks.filter(task => task.id !== taskId));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Tasks</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Add tasks to your routine
        </Text>
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, { color: colors.text, borderColor: colors.border }]}
          value={newTaskName}
          onChangeText={setNewTaskName}
          placeholder="Enter task name"
          placeholderTextColor={colors.textSecondary}
          onSubmitEditing={addTask}
        />
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={addTask}
          disabled={!newTaskName.trim()}
        >
          <FontAwesome5 name="plus" size={16} color={colors.background} />
        </TouchableOpacity>
      </View>

      <View style={styles.taskList}>
        {tasks.map((task, index) => (
          <View
            key={task.id}
            style={[
              styles.taskItem,
              { borderColor: colors.border },
              index === 0 && styles.firstTask,
            ]}
          >
            <View style={styles.taskContent}>
              <Text style={[styles.taskText, { color: colors.text }]} numberOfLines={2}>
                {task.name}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => removeTask(task.id)}
            >
              <FontAwesome5 name="trash-alt" size={16} color={colors.error} />
            </TouchableOpacity>
          </View>
        ))}
        
        {tasks.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
              No tasks added yet
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginRight: 8,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskList: {
    flex: 1,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  firstTask: {
    borderTopWidth: 1,
  },
  taskContent: {
    flex: 1,
    marginRight: 16,
  },
  taskText: {
    fontSize: 16,
  },
  deleteButton: {
    padding: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 16,
  },
}); 