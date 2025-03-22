import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { useTheme } from "@/context/ThemeContext";
import { MotiView } from 'moti';
import { MaterialIcons } from '@expo/vector-icons';

type MaterialIconName = keyof typeof MaterialIcons.glyphMap;

export function WelcomeSlide() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(width - 40, 400); // Max width of 400

  return (
    <View style={styles.container}>
      <MotiView
        style={styles.header}
        from={{ opacity: 0, translateY: -20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 600 }}
      >
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Welcome to Evolvr
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Your journey to self-improvement starts here
        </Text>
      </MotiView>

      <MotiView
        style={[styles.card, { backgroundColor: colors.surface, width: cardWidth }]}
        animate={{ opacity: 1, scale: 1 }}
        from={{ opacity: 0, scale: 0.9 }}
        transition={{ type: 'spring', damping: 15, stiffness: 150 }}
      >
        <MotiView
          style={[styles.iconContainer, { backgroundColor: colors.secondary + '15' }]}
          from={{ rotate: '-45deg', scale: 0.5 }}
          animate={{ rotate: '0deg', scale: 1 }}
          transition={{ type: 'spring', damping: 10, stiffness: 100, delay: 300 }}
        >
          <MaterialIcons name="rocket" size={64} color={colors.secondary} />
        </MotiView>
        
        <View style={styles.features}>
          <Feature
            icon="trending-up"
            emoji="📈"
            text="Track your progress daily"
            colors={colors}
            delay={400}
          />
          <Feature
            icon="track-changes"
            emoji="🎯"
            text="Set and achieve meaningful goals"
            colors={colors}
            delay={500}
          />
          <Feature
            icon="group"
            emoji="🤝"
            text="Join a supportive community"
            colors={colors}
            delay={600}
          />
        </View>
      </MotiView>
    </View>
  );
}

interface FeatureProps {
  icon: MaterialIconName;
  text: string;
  emoji: string;
  colors: any;
  delay: number;
}

function Feature({ icon, emoji, text, colors, delay }: FeatureProps) {
  return (
    <MotiView 
      style={styles.feature}
      from={{ opacity: 0, translateX: -20 }}
      animate={{ opacity: 1, translateX: 0 }}
      transition={{ type: 'spring', damping: 15, stiffness: 150, delay }}
    >
      <View style={[styles.featureIcon, { backgroundColor: colors.secondary + '15' }]}>
        <MaterialIcons name={icon} size={24} color={colors.secondary} />
      </View>
      <Text style={[styles.featureText, { color: colors.textPrimary }]}>
        {text}
      </Text>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  header: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 44,
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 17,
    textAlign: 'center',
    opacity: 0.8,
    lineHeight: 24,
    maxWidth: 280,
  },
  card: {
    padding: 30,
    borderRadius: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 36,
  },
  features: {
    width: '100%',
    gap: 24,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    lineHeight: 22,
  },
}); 