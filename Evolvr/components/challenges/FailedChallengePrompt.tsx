import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';
import { useTheme } from '@/context/ThemeContext';
import { Challenge } from '@/backend/types/Challenge';

interface Props {
  challenge: Challenge;
  onRestart: () => void;
  onQuit: () => void;
}

export default function FailedChallengePrompt({ challenge, onRestart, onQuit }: Props) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Text style={[styles.title, { color: colors.labelPrimary }]}>Challenge Failed</Text>
      <Text style={[styles.message, { color: colors.labelSecondary }]}>
        You missed a day in {challenge.title}. Would you like to restart or quit the challenge?
      </Text>
      <View style={styles.buttons}>
        <Button
          mode="contained"
          onPress={onRestart}
          style={[styles.button, { backgroundColor: colors.warning }]}
        >
          Restart Challenge
        </Button>
        <Button
          mode="contained"
          onPress={onQuit}
          style={[styles.button, { backgroundColor: colors.error }]}
        >
          Quit Challenge
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    margin: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    marginBottom: 16,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    marginHorizontal: 8,
  },
}); 