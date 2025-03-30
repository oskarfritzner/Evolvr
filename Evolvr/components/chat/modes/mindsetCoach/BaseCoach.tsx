import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { TextInput } from 'react-native-paper';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { CoachingMessage } from '@/backend/services/coachingService';

export interface Message {
  id: string;
  type: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: number;
  role?: string;
}

interface BaseCoachProps {
  onClose: () => void;
  personality: string;
  initialMessage: string;
  thinkingMessage: string;
  typingMessage: string;
  onSendMessage: (message: string) => Promise<void>;
  messages?: CoachingMessage[];
  isTyping?: boolean;
  isSending?: boolean;
}

export function BaseCoach({ 
  onClose, 
  personality,
  initialMessage,
  thinkingMessage,
  typingMessage,
  onSendMessage,
  messages: externalMessages,
  isTyping: externalIsTyping,
  isSending: externalIsSending
}: BaseCoachProps) {
  const { colors } = useTheme();
  const [localMessages, setLocalMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'system',
      content: initialMessage,
    },
  ]);
  const [message, setMessage] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Update local messages when external messages change
  useEffect(() => {
    if (externalMessages) {
      const formattedMessages = externalMessages.map(msg => ({
        id: msg.id,
        type: msg.role as 'system' | 'user' | 'assistant',
        content: msg.content,
        timestamp: msg.timestamp?.toMillis(),
        role: msg.role
      }));
      
      // Check if the initial message is already in the formatted messages
      const hasInitialMessage = formattedMessages.some(msg => 
        msg.type === 'system' && msg.content === initialMessage
      );
      
      // If initial message is not present, add it at the beginning
      if (!hasInitialMessage) {
        formattedMessages.unshift({
          id: '1',
          type: 'system',
          content: initialMessage,
          timestamp: Date.now(),
          role: 'system'
        });
      }
      
      setLocalMessages(formattedMessages);
    }
  }, [externalMessages, initialMessage]);

  // Update typing state when external state changes
  useEffect(() => {
    if (externalIsTyping !== undefined) {
      setIsTyping(externalIsTyping);
    }
  }, [externalIsTyping]);

  useEffect(() => {
    if (externalIsSending !== undefined) {
      setIsEvaluating(externalIsSending);
    }
  }, [externalIsSending]);

  const handleSubmit = async () => {
    if (!message.trim()) return;
    
    const userMessage = {
      id: `temp-${Date.now()}`,
      type: 'user' as const,
      content: message,
      timestamp: Date.now(),
      role: 'user'
    };
    
    // Add user message to local state immediately
    setLocalMessages(prev => [...prev, userMessage]);
    
    // Clear the input
    setMessage('');
    
    try {
      setIsEvaluating(true);
      setIsTyping(true);
      await onSendMessage(message);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsEvaluating(false);
      setIsTyping(false);
      // Scroll to bottom after all updates
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const clearChat = () => {
    setLocalMessages([
      {
        id: '1',
        type: 'system',
        content: initialMessage,
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
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={clearChat}
            style={[styles.clearButton, { backgroundColor: colors.surfaceContainer }]}
          >
            <Ionicons name="refresh" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onClose}
            style={[styles.closeButton, { backgroundColor: colors.surfaceContainer }]}
          >
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

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
          {localMessages.map((message, index) => (
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
              <Text style={[
                styles.messageText, 
                { 
                  color: colors.textPrimary,
                  textAlign: message.type === 'user' ? 'right' : 'left',
                }
              ]}>
                {message.content}
              </Text>
            </View>
          ))}
          {(isEvaluating || isTyping) && (
            <View style={[styles.loadingContainer, { backgroundColor: colors.surfaceContainer }]}>
              <View style={styles.thinkingContainer}>
                <Text style={[styles.thinkingText, { color: colors.textSecondary }]}>
                  {isTyping ? typingMessage : thinkingMessage}
                </Text>
                <ActivityIndicator color={colors.primary} size="small" style={{ marginLeft: 8 }} />
              </View>
            </View>
          )}
        </ScrollView>
      </View>

      <View style={[styles.inputContainer, { backgroundColor: colors.surface }]}>
        <View style={styles.inputRow}>
          <View style={styles.inputWrapper}>
            <TextInput
              label="Message"
              value={message}
              onChangeText={setMessage}
              style={[styles.input, { backgroundColor: colors.surface, paddingRight: 48 }]}
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
  clearButton: {
    padding: 8,
    borderRadius: 8,
  },
  contentContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  inputWrapper: {
    flex: 1,
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 'auto',
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