import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HabitInfoModalProps } from './types';
import { createStyles } from './styles';

export const HabitInfoModal: React.FC<HabitInfoModalProps> = ({ visible, onClose, colors }) => {
  const styles = createStyles(colors, false);

  if (!visible) return null;

  return (
    <View style={[styles.infoOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
      <View style={[
        styles.infoContainer, 
        { 
          backgroundColor: colors.surface,
          margin: 20,
        }
      ]}>
        <TouchableOpacity 
          style={styles.closeButton} 
          onPress={onClose}
        >
          <Ionicons 
            name="close" 
            size={24} 
            color={colors.textSecondary} 
          />
        </TouchableOpacity>

        <ScrollView style={styles.infoScroll}>
          <Text style={[styles.infoTitle, { color: colors.textPrimary }]}>
            The Truth About Habit Formation 🌱
          </Text>
          
          <Text style={[styles.infoSection, { color: colors.textPrimary }]}>
            The 21-Day Myth 🤔
          </Text>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Have you ever heard that it takes 21 days to form a habit? This common belief comes from a misinterpretation of research by Dr. Maxwell Maltz, a plastic surgeon who observed that patients took around 21 days to adjust to physical changes.
          </Text>

          <Text style={[styles.infoSection, { color: colors.textPrimary }]}>
            How Long Does It Really Take? ⏳
          </Text>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            A 2009 study by Dr. Phillippa Lally found that on average, it takes 66 days for a behavior to become automatic. The timeline varies:{'\n\n'}
            • Simple habits form faster 🚀{'\n'}
            • Complex habits can take 18 to 254 days 📈{'\n'}
          </Text>

          <Text style={[styles.infoSection, { color: colors.textPrimary }]}>
            The Science Behind Success 🧠
          </Text>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Why do some people see faster results?{'\n\n'}
            • Consistency matters more than time ⚡️{'\n'}
            • Existing routines help accelerate formation 📅{'\n'}
            • Emotional rewards strengthen habits 🎯{'\n\n'}
            The Neuroscience:{'\n\n'}
            • Repetition strengthens neural pathways 🔄{'\n'}
            • Consistency in context solidifies habits 🎯{'\n'}
            • Rewards trigger dopamine release ⭐️{'\n'}
            • Identity shifts enhance commitment 🦋
          </Text>

          <Text style={[styles.infoSection, { color: colors.textPrimary }]}>
            Bottom Line 💫
          </Text>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Focus on persistence and building a system that makes your habits effortless, rather than counting days. Your commitment to showing up daily matters more than any arbitrary timeline. 🌟
          </Text>
        </ScrollView>

        <View style={[styles.infoButtonContainer, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.secondary }]}
            onPress={onClose}
          >
            <Text style={[styles.buttonText, { color: colors.primary }]}>
              Got it! Let's build some habits! 💪
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}; 