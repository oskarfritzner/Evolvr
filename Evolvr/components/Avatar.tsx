import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';

interface AvatarProps {
  uri?: string | null;
  size?: number;
  style?: any;
}

export const Avatar: React.FC<AvatarProps> = ({ uri, size = 60, style }) => {
  const { colors } = useTheme();

  if (!uri) {
    return (
      <View style={[styles.fallback, { width: size, height: size, backgroundColor: colors.surface }, style]}>
        <FontAwesome5 name="user" size={size * 0.5} color={colors.textSecondary} />
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={[{ width: size, height: size, borderRadius: size / 2 }, style]}
    />
  );
};

const styles = StyleSheet.create({
  fallback: {
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 