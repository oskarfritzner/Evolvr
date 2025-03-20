import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from 'react-native-paper';

interface PremiumButtonAccessProps {
  featureDescription: string;
  onUpgradePress?: () => void;
}

export default function PremiumButtonAccess({ 
  featureDescription,
  onUpgradePress 
}: PremiumButtonAccessProps) {
  const { colors } = useTheme();
  const { isPremium } = useSubscription();

  if (isPremium) return null;

  return (
    <Pressable 
      onPress={onUpgradePress}
      style={[styles.overlay, { backgroundColor: colors.surface + 'E6' }]}
    >
      <View style={styles.content}>
        <Text style={[styles.text, { color: colors.textPrimary }]}>
          {featureDescription}
        </Text>
        <Button
          mode="contained"
          onPress={onUpgradePress}
          style={[styles.button, { backgroundColor: colors.primary }]}
        >
          Upgrade to Premium
        </Button>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    zIndex: 1000,
  },
  content: {
    padding: 16,
    alignItems: 'center',
    maxWidth: 300,
  },
  text: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '500',
  },
  button: {
    borderRadius: 8,
    paddingHorizontal: 16,
  },
});
