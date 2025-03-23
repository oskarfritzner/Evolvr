import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { TextInput } from 'react-native-paper';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { userGeneratedTaskService } from '@/backend/openAi/userGeneratedTasks/userGeneratedTaskService';
import { FontAwesome5 } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';

interface Message {
  id: string;
  type: 'system' | 'user' | 'assistant';
  content: string | React.ReactNode;
}

interface ChatUIProps {
  mode: 'taskCreator' | 'goalDivider' | 'mindsetCoach';
  onClose?: () => void;
}

export function ChatUI({ mode, onClose }: ChatUIProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const [showModeSelector, setShowModeSelector] = useState(false);

  useEffect(() => {
    // Initialize chat based on mode
    if (mode === 'taskCreator') {
      setMessages([
        {
          id: '1',
          type: 'system',
          content: 'Welcome to the Task Creator! Please provide a task title and description.',
        },
      ]);
    }
  }, [mode]);

  const handleSubmit = async () => {
    if (!user?.uid || !title.trim() || !description.trim()) return;

    // Add user's input to messages
    setMessages(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        type: 'user',
        content: (
          <View>
            <Text style={[styles.messageText, { color: colors.textPrimary }]}>
              Title: {title}
            </Text>
            <Text style={[styles.messageText, { color: colors.textPrimary }]}>
              Description: {description}
            </Text>
          </View>
        ),
      },
    ]);

    setIsEvaluating(true);
    try {
      const result = await userGeneratedTaskService.createTask({
        title,
        description,
        userId: user.uid,
      });

      if (!result.success) {
        setMessages(prev => [
          ...prev,
          {
            id: Date.now().toString(),
            type: 'assistant',
            content: (
              <View>
                <Text style={[styles.messageText, { color: colors.error }]}>
                  Task creation failed
                </Text>
                <Text style={[styles.messageText, { color: colors.textPrimary }]}>
                  {result.message || 'The task could not be created. Please try again.'}
                </Text>
              </View>
            ),
          },
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          {
            id: Date.now().toString(),
            type: 'assistant',
            content: (
              <View>
                <Text style={[styles.messageText, { color: colors.success }]}>
                  {result.message}
                </Text>
              </View>
            ),
          },
        ]);
        setIsComplete(true);
      }
    } catch (error) {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          type: 'assistant',
          content: (
            <Text style={[styles.messageText, { color: colors.error }]}>
              {error instanceof Error ? error.message : 'An error occurred while creating the task'}
            </Text>
          ),
        },
      ]);
    } finally {
      setIsEvaluating(false);
    }
  };

  const resetChat = () => {
    setTitle('');
    setDescription('');
    setIsComplete(false);
    setMessages([
      {
        id: '1',
        type: 'system',
        content: 'Welcome to the Task Creator! Please provide a task title and description.',
      },
    ]);
  };

  const getModeDisplayName = (mode: 'taskCreator' | 'goalDivider' | 'mindsetCoach') => {
    switch (mode) {
      case 'taskCreator':
        return 'Task Creator';
      case 'goalDivider':
        return 'Goal Divider';
      case 'mindsetCoach':
        return 'AI Mindset Coach';
      default:
        return 'Unknown Mode';
    }
  };

  const handleModeSelect = (selectedMode: 'taskCreator' | 'goalDivider' | 'mindsetCoach') => {
    if (selectedMode === 'goalDivider' || selectedMode === 'mindsetCoach') {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          type: 'system',
          content: `✨ ${getModeDisplayName(selectedMode)} is coming soon! This exciting feature is currently under development. Stay tuned for updates!`,
        },
      ]);
    } else {
      // Reset the chat for task creator
      resetChat();
    }
    setShowModeSelector(false);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.headerContainer}>
        <TouchableOpacity 
          style={[styles.modeSelector, { 
            backgroundColor: colors.surfaceContainer,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: colors.border,
          }]}
          onPress={() => setShowModeSelector(true)}
        >
          <Text style={[styles.modeSelectorText, { color: colors.textPrimary }]}>
            {getModeDisplayName(mode)}
          </Text>
          <FontAwesome5 name="chevron-down" size={12} color={colors.textSecondary} style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      </View>

      {showModeSelector && (
        <View style={[styles.modeMenu, { 
          backgroundColor: colors.surfaceContainer,
          borderColor: colors.border,
        }]}>
          <TouchableOpacity 
            style={[styles.modeMenuItem, { borderBottomColor: colors.border }]}
            onPress={() => handleModeSelect('taskCreator')}
          >
            <Text style={[styles.modeMenuText, { color: colors.textPrimary }]}>Task Creator</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.modeMenuItem, { borderBottomColor: colors.border }]}
            onPress={() => handleModeSelect('goalDivider')}
          >
            <Text style={[styles.modeMenuText, { color: colors.textPrimary }]}>Goal Divider</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.modeMenuItem}
            onPress={() => handleModeSelect('mindsetCoach')}
          >
            <Text style={[styles.modeMenuText, { color: colors.textPrimary }]}>AI Mindset Coach</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map(message => (
          <View
            key={message.id}
            style={[
              styles.message,
              {
                backgroundColor:
                  message.type === 'system'
                    ? colors.surfaceContainer
                    : message.type === 'user'
                    ? colors.primary + '20'
                    : colors.secondary + '20',
                alignSelf:
                  message.type === 'user' ? 'flex-end' : 'flex-start',
              },
            ]}
          >
            {typeof message.content === 'string' ? (
              <Text style={[styles.messageText, { color: colors.textPrimary }]}>
                {message.content}
              </Text>
            ) : (
              message.content
            )}
          </View>
        ))}
        {isEvaluating && (
          <View style={[styles.message, { backgroundColor: colors.surfaceContainer }]}>
            <ActivityIndicator color={colors.primary} style={styles.loader} />
            <Text style={[styles.messageText, { color: colors.textPrimary }]}>
              Evaluating your task...
            </Text>
          </View>
        )}
      </ScrollView>

      {mode === 'taskCreator' && !isComplete ? (
        <View style={[styles.inputContainer, { backgroundColor: colors.surface }]}>
          <TextInput
            label="Task Title"
            value={title}
            onChangeText={setTitle}
            style={[styles.input, { backgroundColor: colors.surface }]}
            mode="outlined"
            disabled={isEvaluating}
            theme={{
              colors: {
                primary: colors.secondary,
                text: colors.textPrimary,
                placeholder: colors.textSecondary,
                background: colors.surface,
                disabled: colors.labelDisabled,
                onSurfaceVariant: colors.textSecondary,
                onSurface: colors.textPrimary,
              }
            }}
          />
          <TextInput
            label="Task Description"
            value={description}
            onChangeText={setDescription}
            style={[styles.input, { backgroundColor: colors.surface }]}
            mode="outlined"
            multiline
            numberOfLines={3}
            disabled={isEvaluating}
            theme={{
              colors: {
                primary: colors.secondary,
                text: colors.textPrimary,
                placeholder: colors.textSecondary,
                background: colors.surface,
                disabled: colors.labelDisabled,
                onSurfaceVariant: colors.textSecondary,
                onSurface: colors.textPrimary,
              }
            }}
          />
          <TouchableOpacity
            style={[
              styles.submitButton,
              {
                backgroundColor: colors.secondary,
                opacity: isEvaluating || !title.trim() || !description.trim() ? 0.5 : 1,
              },
            ]}
            onPress={handleSubmit}
            disabled={isEvaluating || !title.trim() || !description.trim()}
          >
            <Text style={[styles.submitButtonText, { color: colors.background }]}>Create Task</Text>
          </TouchableOpacity>
        </View>
      ) : mode === 'taskCreator' && isComplete ? (
        <View style={[styles.completedContainer, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.secondary }]}
            onPress={resetChat}
          >
            <FontAwesome5 name="plus" size={16} color={colors.background} />
            <Text style={[styles.actionButtonText, { color: colors.background }]}>Create Another Task</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  modeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    height: 40,
  },
  modeSelectorText: {
    fontSize: 14,
    fontWeight: '500',
  },
  messagesContainer: {
    flex: 1,
    width: '100%',
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  message: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 12,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  loader: {
    marginBottom: 8,
  },
  inputContainer: {
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  input: {
    width: '100%',
  },
  submitButton: {
    width: '100%',
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  completedContainer: {
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  actionButton: {
    flexDirection: 'row',
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modeMenu: {
    position: 'absolute',
    top: 64,
    left: 16,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    zIndex: 1000,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  modeMenuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  modeMenuText: {
    fontSize: 14,
    fontWeight: '500',
  },
}); 