import React, { useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Text, KeyboardAvoidingView, ScrollView, Platform, Keyboard } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { journalService } from '@/backend/services/journalService';
import { JournalType } from '@/backend/types/JournalEntry';
import { useAuth } from '@/context/AuthContext';
import Toast from 'react-native-toast-message';
import { MoodSelector } from './MoodSelector';
import { router } from 'expo-router';
import { Button } from 'react-native-paper';

interface Props {
  onClose: () => void;
}

export default function ReflectionEditor({ onClose }: Props) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [mood, setMood] = useState(3);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const extractKeywords = (text: string): string[] => {
    // Basic keyword extraction
    const words = text.toLowerCase().split(/\W+/);
    const commonWords = new Set([
      "the", "be", "to", "of", "and", "a", "in", "that", "have", "i", "it",
      "for", "not", "on", "with", "he", "as", "you", "do", "at", "this",
      "but", "his", "by", "from", "they", "we", "say", "her", "she", "or",
      "an", "will", "my", "one", "all", "would", "there", "their", "what",
      "so", "up", "out", "if", "about", "who", "get", "which", "go", "me"
    ]);

    // Filter out short or common words, then deduplicate & limit
    return [...new Set(
      words.filter(word => word.length > 3 && !commonWords.has(word))
    )].slice(0, 5);
  };

  const handleSubmit = async () => {
    Keyboard.dismiss();
    if (!user?.uid) return;
    const trimmedContent = content.trim();
    
    if (!trimmedContent) {
      Toast.show({
        type: 'error',
        text1: 'Please write something in your reflection',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await journalService.saveEntry(user.uid, {
        type: JournalType.REFLECTION,
        content: {
          content: trimmedContent,
          mood,
          keywords: extractKeywords(trimmedContent),
        },
      });

      Toast.show({
        type: 'success',
        text1: 'Reflection saved!',
      });
      onClose();
    } catch (error) {
      console.error('Error saving reflection:', error);
      Toast.show({
        type: 'error',
        text1: 'Failed to save reflection',
        text2: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardAvoidingView}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Button
          mode="text"
          onPress={() => router.push('/journal-history')}
          icon="history"
          textColor={colors.textSecondary}
          style={styles.historyButton}
        >
          See journal history
        </Button>

        <Text style={[styles.title, { color: colors.textPrimary }]}>
          How are you feeling today?
        </Text>

        <MoodSelector value={mood} onChange={setMood} />
        
        <TextInput
          style={[
            styles.input,
            { 
              backgroundColor: colors.surface,
              color: colors.textPrimary,
              borderColor: colors.border,
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.1,
              shadowRadius: 2,
              elevation: 2,
            }
          ]}
          value={content}
          onChangeText={setContent}
          placeholder="Share your thoughts, feelings, or experiences..."
          placeholderTextColor={colors.textSecondary}
          multiline
          textAlignVertical="top"
          onSubmitEditing={Keyboard.dismiss}
        />

        <TouchableOpacity
          style={[
            styles.submitButton,
            { 
              backgroundColor: colors.secondary,
              opacity: isSubmitting ? 0.7 : 1,
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
              elevation: 5,
            }
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Text style={[styles.submitText, { color: colors.surface }]}>
            {isSubmitting ? 'Saving...' : 'Save Reflection'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: 32,
    paddingBottom: Platform.OS === 'ios' ? 120 : 80,
  },
  historyButton: {
    alignSelf: 'flex-end',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 32,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 20,
    minHeight: 250,
    fontSize: 16,
    lineHeight: 24,
    marginTop: 24,
  },
  submitButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  submitText: {
    fontSize: 18,
    fontWeight: '600',
  },
}); 