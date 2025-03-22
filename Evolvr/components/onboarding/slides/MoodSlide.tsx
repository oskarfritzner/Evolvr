import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from "@/context/ThemeContext";
import Slider from "@react-native-community/slider";
import { MotiView } from 'moti';

interface MoodSlideProps {
  value: number;
  onChange: (value: number) => void;
}

const moods = {
  1: "😢",
  2: "😕",
  3: "😐",
  4: "😊",
  5: "🤩"
} as const;

const labels = {
  1: "Really Bad",
  2: "Not Great",
  3: "Okay",
  4: "Good",
  5: "Incredible"
} as const;

export function MoodSlide({ value, onChange }: MoodSlideProps) {
  const { colors } = useTheme();

  return (
    <MotiView
      style={styles.container}
      from={{ opacity: 0, translateY: 50 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 500 }}
    >
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        How Are You Feeling?
      </Text>
      
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Let us know your current mood
      </Text>

      <View style={styles.moodContainer}>
        <MotiView
          animate={{ scale: [1, 1.2, 1] }}
          transition={{
            type: 'timing',
            duration: 300,
            loop: false,
          }}
          key={value}
          style={styles.emojiContainer}
        >
          <Text style={styles.emoji}>{moods[value as keyof typeof moods]}</Text>
          <Text style={[styles.moodLabel, { color: colors.textPrimary }]}>
            {labels[value as keyof typeof labels]}
          </Text>
        </MotiView>

        <View style={styles.sliderContainer}>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={5}
            step={1}
            value={value}
            onValueChange={onChange}
            minimumTrackTintColor={colors.secondary}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.secondary}
          />
          
          <View style={styles.tickContainer}>
            {[1, 2, 3, 4, 5].map((tick) => (
              <View 
                key={tick} 
                style={[
                  styles.tick,
                  { backgroundColor: tick <= value ? colors.secondary : colors.border }
                ]} 
              />
            ))}
          </View>
        </View>
      </View>
    </MotiView>
  );
}

const styles = StyleSheet.create({
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
  moodContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 40,
  },
  emojiContainer: {
    alignItems: 'center',
    gap: 12,
  },
  emoji: {
    fontSize: 64,
  },
  moodLabel: {
    fontSize: 20,
    fontWeight: '600',
  },
  sliderContainer: {
    width: '100%',
    gap: 16,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  tickContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  tick: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
}); 