import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  FlatList,
  ActivityIndicator,
  Pressable,
  ListRenderItem
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { FontAwesome5 } from '@expo/vector-icons';
import { getCategoryTasks } from '@/backend/services/categoryService';
import type Task from '@/backend/types/Task';
import { useAuth } from '@/context/AuthContext';
import { taskService } from '@/backend/services/taskService';
import { showMessage } from '@/utils/showMessage';  

interface CategoryTasksProps {
  categoryId: string;
  ListHeaderComponent?: React.ComponentType<any> | React.ReactElement | null;
}

export default function CategoryTasks({ categoryId, ListHeaderComponent }: CategoryTasksProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTasks();
  }, [categoryId]);

  const loadTasks = async () => {
    if (!categoryId) return;
    setLoading(true);
    setError(null);
    try {
      const categoryTasks = await getCategoryTasks(categoryId);
      setTasks(categoryTasks);
    } catch (error) {
      console.error('Failed to load tasks:', error);
      setError('Failed to load tasks. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToActive = async (taskId: string) => {
    if (!user?.uid) return;
    try {
      await taskService.addTaskToActive(user.uid, taskId);
      showMessage('success', 'Task added to your active list!');
    } catch (error) {
      showMessage('error', 'Failed to add task');
    }
  };

  const filteredTasks = useMemo(() => 
    tasks.filter(task => 
      task.title.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [tasks, searchQuery]
  );

  const EmptyListMessage = () => (
    <View style={styles.emptyState}>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        {searchQuery 
          ? 'No tasks found matching your search'
          : 'No tasks available in this category'}
      </Text>
    </View>
  );

  const renderItem: ListRenderItem<Task> = ({ item }) => (
    <Pressable 
      style={({ pressed }) => [
        styles.taskItem,
        { 
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
          opacity: pressed ? 0.7 : 1 
        }
      ]}
      accessible={true}
      accessibilityLabel={`Add ${item.title} to active tasks`}
      accessibilityRole="button"
      onPress={() => handleAddToActive(item.id)}
    >
      <View style={styles.taskInfo}>
        <Text style={[styles.taskTitle, { color: colors.labelPrimary }]}>
          {item.title}
        </Text>
        <Text style={[styles.taskXP, { color: colors.labelSecondary }]}>
          {item.categoryXp[categoryId]} XP
        </Text>
      </View>
      <View style={[styles.addButton, { backgroundColor: colors.primary }]}>
        <FontAwesome5 name="plus" size={16} color={colors.highlight} />
      </View>
    </Pressable>
  );

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        <TouchableOpacity 
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={loadTasks}
        >
          <Text style={{ color: colors.highlight }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      data={filteredTasks}
      keyExtractor={item => item.id}
      renderItem={renderItem}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={EmptyListMessage}
      contentContainerStyle={styles.container}
      onRefresh={loadTasks}
      refreshing={loading}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 16,
    marginTop: 8,
    marginBottom: 24,
    borderRadius: 12,
    padding: 16,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    marginRight: 8,
    fontSize: 16,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  taskInfo: {
    flex: 1,
    marginRight: 12,
  },
  taskTitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  taskXP: {
    fontSize: 12,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loading: {
    padding: 20,
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  errorText: {
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
}); 