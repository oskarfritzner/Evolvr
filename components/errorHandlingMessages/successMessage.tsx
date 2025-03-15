import React, { useEffect } from 'react';
import { StyleSheet, Text, Animated, Dimensions, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

interface SuccessMessageProps {
  message: string;
  fadeAnim: Animated.Value;
}

const { width } = Dimensions.get('window');

export default function SuccessMessage({ message, fadeAnim }: SuccessMessageProps) {
  const { colors } = useTheme();

  useEffect(() => {
    Animated.sequence([
      Animated.spring(fadeAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 8,
      }),
      Animated.delay(2000),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [message]);

  return (
    <View style={styles.wrapper}>
      <Animated.View 
        style={[
          styles.container, 
          { 
            backgroundColor: colors.surface,
            opacity: fadeAnim 
          }
        ]}
      >
        <Text style={[styles.text, { color: colors.success }]}>{message}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    zIndex: 999,
  },
  container: {
    padding: 16,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    alignItems: 'center',
  },
  text: {
    fontSize: 16,
    fontWeight: '500',
  },
});
