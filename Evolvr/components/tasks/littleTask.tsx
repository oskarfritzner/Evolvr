import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import type Task from '@/backend/types/Task';
import { taskService } from '@/backend/services/taskService';
import { useAuth } from '@/context/AuthContext';
import { TaskType } from '@/backend/types/Task';

interface LittleTaskProps {
  task: Task;
  type: 'active' | 'routine';
  onAddPress?: (taskId: string, days?: number[]) => Promise<void>;
  selectedDays?: number[];  // Only needed for routine tasks
}

const getTaskIcon = (taskType?: TaskType) => {
  switch (taskType) {
    case 'routine':
      return 'calendar-check';
    case 'habit':
      return 'bolt';
    case 'challenge':
      return 'trophy';
    case 'user-generated':
      return 'user-edit';
    default:
      return 'tasks';
  }
};

export default function LittleTask({ task, type, onAddPress, selectedDays }: LittleTaskProps) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [animation] = useState(new Animated.Value(0));
  const [isAdding, setIsAdding] = useState(false);

  const toggleExpand = () => {
    const toValue = expanded ? 0 : 1;
    Animated.spring(animation, {
      toValue,
      useNativeDriver: false,
      friction: 8,
    }).start();
    setExpanded(!expanded);
  };

  const handleAddPress = async () => {
    if (!user?.uid || isAdding) return;
    
    setIsAdding(true);
    try {
      if (type === 'routine') {
        if (!selectedDays || !onAddPress) return;
        await onAddPress(task.id, selectedDays);
      } else {
        if (onAddPress) {
          await onAddPress(task.id);
        } else {
          await taskService.addTaskToActive(user.uid, task.id);
        }
      }
    } catch (error) {
      console.error('Error adding task:', error);
      // You might want to show an error message to the user here
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.mainContent}>
        <View style={styles.leftContent}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={expanded ? undefined : 1}>
              {task.title}
            </Text>
            <View style={styles.sourceRow}>
              <FontAwesome5 
                name={getTaskIcon(task.type)} 
                size={12} 
                color={colors.textSecondary} 
              />
              <Text style={[styles.sourceText, { color: colors.textSecondary }]}>
                {task.type === 'user-generated' || task.type === 'normal' ? '' : 
                 (task.type && task.type.charAt(0).toUpperCase() + task.type.slice(1))}
              </Text>
            </View>
            <TouchableOpacity onPress={toggleExpand}>
              <FontAwesome5 
                name={expanded ? 'chevron-up' : 'chevron-down'} 
                size={16} 
                color={colors.textPrimary} 
              />
            </TouchableOpacity>
          </View>
          <View style={styles.xpRow}>
            {Object.entries(task.categoryXp || {}).map(([category, xp]) => (
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

        <TouchableOpacity 
          style={[
            styles.addButton, 
            { 
              backgroundColor: colors.secondary,
              opacity: isAdding ? 0.5 : 1 
            }
          ]}
          onPress={handleAddPress}
          disabled={isAdding}
        >
          <FontAwesome5 
            name={isAdding ? "spinner" : "plus"} 
            size={16} 
            color={colors.primary} 
          />
        </TouchableOpacity>
      </View>

      <Animated.View style={[
        styles.expandedContent,
        {
          maxHeight: animation.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 500]
          }),
          opacity: animation,
          pointerEvents: expanded ? 'auto' : 'none'
        }
      ]}>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {task.description}
        </Text>
        <View style={styles.tagsContainer}>
          {task.tags?.map(tag => (
            <View 
              key={tag}
              style={[styles.tag, { backgroundColor: colors.background }]}
            >
              <Text style={[styles.tagText, { color: colors.textPrimary }]}>{tag}</Text>
            </View>
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    marginBottom: 12,
    padding: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  mainContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  leftContent: {
    flex: 1,
    marginRight: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sourceText: {
    fontSize: 13,
    opacity: 0.8,
  },
  xpRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  xpBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  xpText: {
    fontSize: 12,
    fontWeight: '500',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandedContent: {
    overflow: 'hidden',
    marginTop: 12,
  },
  description: {
    fontSize: 14,
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
  },
});
