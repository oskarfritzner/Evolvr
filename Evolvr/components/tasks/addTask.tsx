import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView, Animated, ScrollView, Modal, Dimensions, PanResponder } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import Task from '@/backend/types/Task';
import { taskService } from '@/backend/services/taskService';
import { FontAwesome5 } from '@expo/vector-icons';
import LittleTask from '@/components/tasks/littleTask';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import SuccessMessage from '@/components/errorHandlingMessages/successMessage';
import ErrorMessage from '@/components/errorHandlingMessages/errorMessage';
import { useRoutine } from '@/context/RoutineContext';
import { TextInput } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { RoutineTask } from '@/backend/types/Routine';
import { useQueryClient } from '@tanstack/react-query';
import { SafeAreaView as SafeAreaViewRN } from 'react-native-safe-area-context';
import { ChatModal } from '@/components/chat';

interface Props {
  visible: boolean;
  onClose: () => void;
  type: 'active' | 'routine';
  mode?: 'create' | 'edit';
  onTaskAdded?: (task?: Task) => void;
}

// Static styles outside component
const staticStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    width: '100%',
    height: '85%',
    maxHeight: '95%',
    minHeight: 300,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    elevation: 5,
  },
  dragIndicatorContainer: {
    width: '100%',
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dragIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 16,
    zIndex: 1,
    padding: 8,
  },
  safeArea: {
    flex: 1,
  },
  searchInput: {
    margin: 16,
    marginTop: 36,
    borderRadius: 8,
  },
  filtersContainer: {
    marginBottom: 8,
  },
  categoryFilters: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  listContainer: {
    padding: 16,
    paddingTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
  },
  createTaskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  createTaskButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 2,
  },
  myTasksChip: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
});

const AddTask: React.FC<Props> = ({ visible, onClose, type, mode, onTaskAdded }) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const fadeAnim = useState(new Animated.Value(0))[0];
  const [errorMessage, setErrorMessage] = useState('');
  const errorAnim = useState(new Animated.Value(0))[0];
  const { addTaskToRoutine } = useRoutine();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const panY = useRef(new Animated.Value(0)).current;
  const screenHeight = Dimensions.get('screen').height;
  const queryClient = useQueryClient();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showUserTasks, setShowUserTasks] = useState(false);

  const resetPositionAnim = Animated.timing(panY, {
    toValue: 0,
    duration: 300,
    useNativeDriver: true,
  });

  const closeAnim = Animated.timing(panY, {
    toValue: screenHeight,
    duration: 500,
    useNativeDriver: true,
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => false,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100) {
          closeAnim.start(onClose);
        } else {
          resetPositionAnim.start();
        }
      },
    })
  ).current;

  useEffect(() => {
    loadTasks();
  }, [selectedCategory]);

  useEffect(() => {
    if (visible) {
      panY.setValue(screenHeight); // Start from bottom
      Animated.spring(panY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        mass: 0.8,
      }).start();
    }
  }, [visible]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const fetchedTasks = selectedCategory 
        ? await taskService.getTasksByCategory(selectedCategory)
        : await taskService.getAllTasks(); 
      setTasks(fetchedTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const showSuccessMessage = (message: string) => {
    setSuccessMessage(message);
    fadeAnim.setValue(0);
    
    // Slide down
    Animated.spring(fadeAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start(() => {
      // Slide back up after delay
      setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => setSuccessMessage(''));
      }, 1500);
    });
  };

  const showErrorMessage = (message: string) => {
    setErrorMessage(message);
    errorAnim.setValue(0);
    Animated.spring(errorAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
    }).start(() => {
      setTimeout(() => {
        Animated.timing(errorAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => setErrorMessage(''));
      }, 2000);
    });
  };

  const handleAddTask = async (taskId: string) => {
    if (!user?.uid) return;
    
    try {
      await taskService.addTaskToActive(user.uid, taskId);
      queryClient.invalidateQueries({ queryKey: ["activeTasks", user.uid] });
      showSuccessMessage('Task added to your active tasks!');
      
      setTimeout(() => {
        onClose();
        if (onTaskAdded) {
          onTaskAdded();
        }
      }, 1000);
    } catch (error) {
      console.error('Error adding task:', error);
      showErrorMessage(error instanceof Error ? error.message : 'Failed to add task');
    }
  };

  const handleAddToRoutine = (task: Task) => {
    try {
      if (onTaskAdded) {
        onTaskAdded(task);
      }
      showSuccessMessage('Task added to routine!');
      if (mode === 'edit') {
        setTimeout(() => {
          onClose();
        }, 300);
      }
    } catch (error) {
      if (error instanceof Error) {
        showErrorMessage(error.message);
      } else {
        showErrorMessage('Failed to add task to routine');
      }
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = 
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = !categoryFilter || 
      Object.entries(task.categoryXp)
        .some(([category, xp]) => category === categoryFilter && xp > 0);

    const matchesUserFilter = showUserTasks ? task.type === 'user-generated' : !showUserTasks;
    
    return matchesSearch && matchesCategory && matchesUserFilter;
  });

  const renderTaskItem = ({ item }: { item: Task }) => (
    <LittleTask 
      task={item}
      type={type}
      selectedDays={type === 'routine' ? [0,1,2,3,4,5,6] : undefined}
      onAddPress={async (taskId) => {
        if (type === 'routine') {
          handleAddToRoutine(item);
        } else {
          handleAddTask(taskId);
        }
      }}
    />
  );

  // Dynamic styles that depend on colors
  const dynamicStyles = StyleSheet.create({
    successContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      alignItems: 'center',
      paddingTop: 16,
      zIndex: 1000,
    },
    successMessage: {
      backgroundColor: colors.success || '#4CAF50',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.15,
      shadowRadius: 3,
      elevation: 4,
    },
    successText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '500',
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      presentationStyle="overFullScreen"
    >
      <SafeAreaViewRN style={staticStyles.overlay}>
        <View style={[staticStyles.modalContainer, { backgroundColor: colors.background }]}>
          <View {...panResponder.panHandlers} style={staticStyles.dragIndicatorContainer}>
            <View style={[staticStyles.dragIndicator, { backgroundColor: colors.border }]} />
          </View>

          <View style={staticStyles.headerContainer}>
            <TouchableOpacity
              style={[staticStyles.createTaskButton, { backgroundColor: colors.secondary }]}
              onPress={() => setIsChatOpen(true)}
            >
              <FontAwesome5 name="magic" size={14} color={colors.primary} style={staticStyles.buttonIcon} />
              <Text style={[staticStyles.createTaskButtonText, { color: colors.primary }]}>
                Create Custom Task
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={staticStyles.closeButton} 
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <SafeAreaView style={staticStyles.safeArea}>
            <TextInput
              placeholder="Search tasks..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={[staticStyles.searchInput, { backgroundColor: colors.surface }]}
              placeholderTextColor={colors.textSecondary}
              textColor={colors.textPrimary}
              theme={{
                colors: {
                  primary: colors.primary,
                  text: colors.textPrimary,
                  placeholder: colors.textSecondary,
                  background: colors.surface,
                }
              }}
              left={<TextInput.Icon icon="magnify" color={colors.textSecondary} />}
              mode="outlined"
            />

            <View style={staticStyles.filtersContainer}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={staticStyles.categoryFilters}
              >
                <TouchableOpacity
                  style={[
                    staticStyles.categoryChip,
                    { 
                      backgroundColor: !categoryFilter && !showUserTasks ? colors.secondary : 'transparent',
                      borderWidth: 1,
                      borderColor: colors.primary
                    }
                  ]}
                  onPress={() => {
                    setCategoryFilter(null);
                    setShowUserTasks(false);
                  }}
                >
                  <Text style={[staticStyles.categoryChipText, { 
                    color: !categoryFilter && !showUserTasks ? colors.primary : colors.secondary
                  }]}>
                    All
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    staticStyles.categoryChip,
                    { 
                      backgroundColor: showUserTasks ? colors.secondary : 'transparent',
                      borderWidth: 1,
                      borderColor: colors.primary
                    }
                  ]}
                  onPress={() => {
                    setShowUserTasks(!showUserTasks);
                    setCategoryFilter(null);
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <FontAwesome5 
                      name="user-edit" 
                      size={12} 
                      color={showUserTasks ? colors.primary : colors.secondary} 
                    />
                    <Text style={[staticStyles.categoryChipText, { 
                      color: showUserTasks ? colors.primary : colors.secondary
                    }]}>
                      My Created Tasks
                    </Text>
                  </View>
                </TouchableOpacity>

                {['physical', 'mental', 'intellectual', 'spiritual', 'career', 'relationships', 'financial'].map(category => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      staticStyles.categoryChip,
                      { 
                        backgroundColor: categoryFilter === category ? colors.secondary : 'transparent',
                        borderWidth: 1,
                        borderColor: colors.primary
                      }
                    ]}
                    onPress={() => setCategoryFilter(category === categoryFilter ? null : category)}
                  >
                    <Text style={[staticStyles.categoryChipText, { 
                      color: categoryFilter === category ? colors.primary : colors.secondary
                    }]}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {loading ? (
              <View style={staticStyles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : filteredTasks.length === 0 ? (
              <View style={staticStyles.emptyContainer}>
                <Text style={[staticStyles.emptyText, { color: colors.textPrimary }]}>
                  {searchQuery ? 'No tasks found' : 'No tasks available'}
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredTasks}
                renderItem={renderTaskItem}
                keyExtractor={item => item.id}
                contentContainerStyle={staticStyles.listContainer}
                showsVerticalScrollIndicator={false}
              />
            )}
            {successMessage && (
              <Animated.View
                style={[
                  dynamicStyles.successContainer,
                  {
                    transform: [{
                      translateY: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-50, 0], // Slides down from above
                      })
                    }]
                  }
                ]}
              >
                <View style={dynamicStyles.successMessage}>
                  <FontAwesome5 name="check-circle" size={16} color="#fff" />
                  <Text style={dynamicStyles.successText}>{successMessage}</Text>
                </View>
              </Animated.View>
            )}
            {errorMessage && <ErrorMessage message={errorMessage} fadeAnim={errorAnim} />}
          </SafeAreaView>
        </View>

        <ChatModal
          visible={isChatOpen}
          onClose={() => {
            setIsChatOpen(false);
            loadTasks(); // Reload tasks to show any new ones
          }}
          mode="taskCreator"
        />
      </SafeAreaViewRN>
    </Modal>
  );
};

export default AddTask;
