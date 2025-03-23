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
  Keyboard,
  KeyboardEvent,
} from 'react-native';
import { TextInput } from 'react-native-paper';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { userGeneratedTaskService } from '@/backend/openAi/userGeneratedTasks/userGeneratedTaskService';
import { FontAwesome5 } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';
import { useCoachingChat } from '@/hooks/useCoachingChat';

interface Message {
  id: string;
  type: 'system' | 'user' | 'assistant';
  content: string | React.ReactNode;
  timestamp?: number;
  role?: string;
}

interface ChatUIProps {
  mode: 'taskCreator' | 'goalDivider' | 'mindsetCoach';
  onClose?: () => void;
  onModeChange?: (mode: 'taskCreator' | 'goalDivider' | 'mindsetCoach') => void;
}

export function ChatUI({ mode, onClose, onModeChange }: ChatUIProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
  // Add coaching chat hook
  const { 
    messages: coachingMessages, 
    isTyping, 
    sendMessage: sendCoachingMessage,
    clearChat,
    isSending 
  } = useCoachingChat();

  useEffect(() => {
    // Initialize chat based on mode
    if (mode === 'mindsetCoach') {
      setMessages([
        {
          id: '1',
          type: 'system',
          content: "Hi! I'm Evolve, your personal mindset coach. 🌱 I'm here to support your growth journey, provide insights, and help you develop positive habits. What's on your mind today?"
        },
      ]);
    } else if (mode === 'taskCreator') {
      setMessages([
        {
          id: '1',
          type: 'system',
          content: 'Welcome to the Task Creator! Please provide a task title and description.',
        },
      ]);
    }
  }, [mode]);

  useEffect(() => {
    const keyboardWillShow = (event: KeyboardEvent) => {
      setKeyboardHeight(event.endCoordinates.height);
    };

    const keyboardWillHide = () => {
      setKeyboardHeight(0);
    };

    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      keyboardWillShow
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      keyboardWillHide
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const handleSubmit = async () => {
    if (!user?.uid) return;

    if (mode === 'mindsetCoach') {
      if (!message.trim()) return;
      
      // Add message to local state immediately for instant feedback
      const timestamp = Date.now();
      const userMessage = {
        id: timestamp.toString(),
        type: 'user' as const,
        content: message,
        timestamp,
        role: 'user'
      };
      setMessages(prev => [...prev, userMessage]);
      
      // Clear the input first
      setMessage('');
      
      try {
        setIsEvaluating(true);
        await sendCoachingMessage(message);
      } catch (error) {
        console.error('Error sending message:', error);
      } finally {
        setIsEvaluating(false);
        // Scroll to bottom after all updates
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } else if (mode === 'taskCreator') {
      if (!title.trim() || !description.trim()) return;

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
    if (selectedMode === 'goalDivider') {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          type: 'system',
          content: `✨ Goal Divider is coming soon! This exciting feature is currently under development. Stay tuned for updates!`,
        },
      ]);
    } else if (selectedMode === 'mindsetCoach') {
      // Reset state for mindset coach
      setTitle('');
      setDescription('');
      setMessage('');
      setIsComplete(false);
      setMessages([
        {
          id: '1',
          type: 'system',
          content: "Hi! I'm Evolve, your personal mindset coach. 🌱 I'm here to support your growth journey, provide insights, and help you develop positive habits. What's on your mind today?"
        },
      ]);
      // Notify parent of mode change
      onModeChange?.(selectedMode);
    } else if (selectedMode === 'taskCreator') {
      // Reset for task creator
      resetChat();
      // Notify parent of mode change
      onModeChange?.(selectedMode);
    }
    setShowModeSelector(false);
  };

  // Update the input section based on mode
  const renderInputSection = () => {
    if (mode === 'mindsetCoach') {
      return (
        <View style={[styles.inputContainer, { backgroundColor: colors.surface }]}>
          <View style={styles.inputRow}>
            <TextInput
              label="Message"
              value={message}
              onChangeText={setMessage}
              style={[styles.input, { backgroundColor: colors.surface }]}
              mode="outlined"
              multiline
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
                styles.sendButton,
                {
                  backgroundColor: colors.secondary,
                  opacity: isEvaluating || !message.trim() ? 0.5 : 1,
                },
              ]}
              onPress={handleSubmit}
              disabled={isEvaluating || !message.trim()}
            >
              <Ionicons name="send" size={20} color={colors.background} />
            </TouchableOpacity>
          </View>
        </View>
      );
    } else if (mode === 'taskCreator') {
      return (
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
      );
    }
    return null;
  };

  // Update the messages section to handle both modes
  const renderMessages = () => {
    if (mode === 'mindsetCoach') {
      // Combine local messages and coaching messages
      const allMessages = [...messages, ...coachingMessages].sort((a, b) => {
        const getTime = (msg: any) => {
          if (msg.timestamp?.toMillis) return msg.timestamp.toMillis();
          if (msg.timestamp) return msg.timestamp;
          if (msg.id) return parseInt(msg.id);
          return 0;
        };
        return getTime(a) - getTime(b);
      });

      return allMessages.map((message, index) => {
        const isCoachingMessage = 'role' in message;
        const messageRole = isCoachingMessage ? message.role : message.type;
        const messageContent = isCoachingMessage ? message.content : message.content;
        const getMessageTime = (msg: any) => {
          if (msg.timestamp?.toMillis) return msg.timestamp.toMillis();
          if (msg.timestamp) return msg.timestamp;
          return Date.now();
        };
        const messageKey = isCoachingMessage 
          ? `coaching_${getMessageTime(message)}_${index}`
          : `local_${message.id}_${index}`;
        
        return (
          <View
            key={messageKey}
            style={[
              styles.message,
              {
                backgroundColor:
                  messageRole === 'assistant'
                    ? colors.secondary + '20'
                    : colors.primary + '20',
                alignSelf:
                  messageRole === 'user' ? 'flex-end' : 'flex-start',
                marginVertical: 4,
                marginLeft: messageRole === 'user' ? 'auto' : 8,
                marginRight: messageRole === 'user' ? 8 : 'auto',
                maxWidth: '80%',
              },
            ]}
          >
            <Text style={[
              styles.messageText, 
              { 
                color: colors.textPrimary,
                textAlign: messageRole === 'user' ? 'right' : 'left',
              }
            ]}>
              {messageContent}
            </Text>
          </View>
        );
      });
    } else {
      // Use local messages for other modes
      return messages.map((message, index) => (
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
      ));
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.headerContainer}>
        <View style={styles.headerLeft}>
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
          
          {mode === 'mindsetCoach' && (
            <TouchableOpacity
              onPress={() => clearChat()}
              style={[styles.clearButton, { backgroundColor: colors.surfaceContainer }]}
            >
              <Ionicons name="refresh" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          onPress={onClose}
          style={[styles.closeButton, { backgroundColor: colors.surfaceContainer }]}
        >
          <Ionicons name="close" size={24} color={colors.textSecondary} />
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

      <View style={styles.contentContainer}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={true}
          bounces={true}
          overScrollMode="always"
          onScrollBeginDrag={() => Keyboard.dismiss()}
        >
          {renderMessages()}
          {(isEvaluating || isTyping) && (
            <View style={[styles.loadingContainer, { backgroundColor: colors.surfaceContainer }]}>
              <ActivityIndicator color={colors.primary} />
            </View>
          )}
        </ScrollView>
      </View>

      {renderInputSection()}
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
    zIndex: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
  },
  contentContainer: {
    flex: 1,
    position: 'relative',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 24,
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
  loader: {
    marginBottom: 8,
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    padding: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
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
  clearButton: {
    padding: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 