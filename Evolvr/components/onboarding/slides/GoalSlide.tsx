import React from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { MotiView } from 'moti';

interface GoalSlideProps {
  value: string;
  onChange: (value: string) => void;
}

export function GoalSlide({ value, onChange }: GoalSlideProps) {
  const { colors } = useTheme();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <MotiView
            style={styles.container}
            from={{ opacity: 0, translateY: 50 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 500 }}
          >
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Set Your Main Goal
            </Text>
            
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              What's the one thing you want to achieve most?
            </Text>

            <View style={styles.inputContainer}>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.surface, color: colors.textPrimary }
                ]}
                value={value}
                onChangeText={onChange}
                placeholder="My main goal is to..."
                placeholderTextColor={colors.textSecondary}
                multiline
                textAlignVertical="top"
                returnKeyType="done"
                blurOnSubmit={true}
                autoCorrect={true}
              />
            </View>
          </MotiView>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 32,
    textAlign: 'center',
  },
  inputContainer: {
    flex: 1,
    marginTop: 20,
  },
  input: {
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    minHeight: 150,
  },
}); 