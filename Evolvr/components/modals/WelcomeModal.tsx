import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { MaterialIcons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface WelcomeModalProps {
  visible: boolean;
  onClose: () => void;
}

export function WelcomeModal({ visible, onClose }: WelcomeModalProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const features = [
    {
      icon: 'track-changes',
      title: 'Track Your Progress',
      description: 'Monitor your growth across different life categories and level up as you improve.',
    },
    {
      icon: 'schedule',
      title: 'Build Habits',
      description: 'Create and maintain positive habits with daily tracking and streak monitoring.',
    },
    {
      icon: 'route',
      title: 'Set Routines',
      description: 'Establish structured routines to make your self-improvement journey consistent.',
    },
    {
      icon: 'assignment-turned-in',
      title: 'Complete Tasks',
      description: 'Break down your goals into manageable tasks and track their completion.',
    },
    {
      icon: 'emoji-events',
      title: 'Join Challenges',
      description: 'Participate in community challenges to stay motivated and accountable.',
    },
  ];

  const styles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      width: '100%',
      maxWidth: 500,
      maxHeight: '80%',
    },
    header: {
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      alignItems: 'center',
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: 10,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    scrollContent: {
      padding: 20,
    },
    featureContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 25,
      gap: 15,
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.secondary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    featureContent: {
      flex: 1,
    },
    featureTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 5,
    },
    featureDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    footer: {
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    button: {
      backgroundColor: colors.secondary,
      padding: 15,
      borderRadius: 12,
      alignItems: 'center',
    },
    buttonText: {
      color: colors.surface,
      fontSize: 16,
      fontWeight: '600',
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <MotiView
          from={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'timing', duration: 300 }}
          style={styles.modalContent}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Welcome to Your Journey!</Text>
            <Text style={styles.subtitle}>
              Start your self-improvement journey with these powerful features
            </Text>
          </View>

          <ScrollView style={styles.scrollContent}>
            {features.map((feature, index) => (
              <MotiView
                key={feature.title}
                from={{ opacity: 0, translateX: -20 }}
                animate={{ opacity: 1, translateX: 0 }}
                transition={{ delay: index * 100 }}
                style={styles.featureContainer}
              >
                <View style={styles.iconContainer}>
                  <MaterialIcons name={feature.icon as any} size={24} color={colors.surface} />
                </View>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>{feature.description}</Text>
                </View>
              </MotiView>
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.button} onPress={onClose}>
              <Text style={styles.buttonText}>Let's Get Started!</Text>
            </TouchableOpacity>
          </View>
        </MotiView>
      </View>
    </Modal>
  );
} 