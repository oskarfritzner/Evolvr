import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { TextInput } from 'react-native-paper';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { userGeneratedTaskService } from '@/backend/openAi/userGeneratedTasks/userGeneratedTaskService';

interface TaskCreatorProps {
  onClose: () => void;
}

interface Message {
  id: string;
  type: 'system' | 'user' | 'assistant';
  content: string | React.ReactNode;
}

export function TaskCreator({ onClose }: TaskCreatorProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'system',
      content: 'Welcome to the Task Creator! Please provide a task title and description.',
    },
  ]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

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

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.headerContainer}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerText, { color: colors.textPrimary }]}>Task Creator</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={resetChat}
            style={[styles.clearButton, { backgroundColor: colors.surfaceContainer }]}
          >
            <Text style={[styles.clearButtonText, { color: colors.textSecondary }]}>Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onClose}
            style={[styles.closeButton, { backgroundColor: colors.surfaceContainer }]}
          >
            <Text style={[styles.closeButtonText, { color: colors.textSecondary }]}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.messagesContainer}>
          {messages.map((message, index) => (
            <View
              key={`${message.id}_${index}`}
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
                  marginVertical: 4,
                  marginLeft: message.type === 'user' ? 'auto' : 8,
                  marginRight: message.type === 'user' ? 8 : 'auto',
                  maxWidth: '80%',
                },
              ]}
            >
              {typeof message.content === 'string' ? (
                <Text style={[
                  styles.messageText, 
                  { 
                    color: colors.textPrimary,
                    textAlign: message.type === 'user' ? 'right' : 'left',
                  }
                ]}>
                  {message.content}
                </Text>
              ) : (
                message.content
              )}
            </View>
          ))}
          {isEvaluating && (
            <View style={[styles.loadingContainer, { backgroundColor: colors.surfaceContainer }]}>
              <View style={styles.thinkingContainer}>
                <Text style={[styles.thinkingText, { color: colors.textSecondary }]}>
                  Creating task...
                </Text>
                <ActivityIndicator color={colors.primary} size="small" style={{ marginLeft: 8 }} />
              </View>
            </View>
          )}
        </View>
      </View>

      <View style={[styles.inputContainer, { backgroundColor: colors.surface }]}>
        <View style={styles.inputFields}>
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
        </View>
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerText: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
  },
  closeButtonText: {
    fontSize: 16,
  },
  clearButton: {
    padding: 8,
    borderRadius: 8,
  },
  clearButtonText: {
    fontSize: 16,
  },
  contentContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
    padding: 16,
    paddingBottom: 24,
  },
  message: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 12,
    marginVertical: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
  },
  inputFields: {
    gap: 12,
    marginBottom: 16,
  },
  input: {
    flex: 1,
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
  loadingContainer: {
    padding: 12,
    borderRadius: 12,
    marginVertical: 4,
    alignSelf: 'flex-start',
    maxWidth: '80%',
  },
  thinkingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thinkingText: {
    fontSize: 14,
    fontWeight: '500',
  },
}); 