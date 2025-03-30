import React from 'react';
import { 
  View, 
  StyleSheet, 
  ViewProps, 
  TouchableOpacity, 
  TouchableOpacityProps 
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated';
  onPress?: () => void;
}

export default function Card({ 
  children, 
  variant = 'default',
  style, 
  onPress,
  ...props 
}: CardProps) {
  const { colors } = useTheme();

  const cardStyles = [
    styles.card,
    {
      backgroundColor: colors.surface,
      borderColor: variant === 'default' ? colors.textSecondary + '20' : 'transparent',
    },
    variant === 'elevated' && styles.elevated,
    style
  ];

  if (onPress) {
    return (
      <TouchableOpacity 
        style={cardStyles} 
        onPress={onPress}
        activeOpacity={0.7}
        {...(props as TouchableOpacityProps)}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={cardStyles} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  elevated: {
    shadowColor: "#000",
    shadowOffset: { 
      width: 0, 
      height: 2 
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
}); 