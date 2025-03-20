import React from 'react';
import { ScrollView, StyleSheet, View, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useTheme } from '@/context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function PrivacyPolicy() {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <Stack.Screen
        options={{
          title: "Privacy Policy",
          headerStyle: {
            backgroundColor: colors.surface,
          },
          headerTintColor: colors.textPrimary,
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => router.back()}
              style={styles.closeButton}
            >
              <Ionicons 
                name="close" 
                size={24} 
                color={colors.textPrimary} 
              />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Privacy Policy</Text>
          <Text style={[styles.lastUpdated, { color: colors.textSecondary }]}>Last Updated: {new Date().toLocaleDateString()}</Text>
          
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>1. Introduction</Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            We are committed to protecting your personal data and respecting your privacy. This Privacy Policy explains how we collect, use, and protect your personal information when you use our app.
          </Text>

          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>2. Data We Collect</Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            We collect and process the following data:
          </Text>
          <Text style={[styles.listItem, { color: colors.textSecondary }]}>• Personal information (email, name)</Text>
          <Text style={[styles.listItem, { color: colors.textSecondary }]}>• Journal entries and reflections</Text>
          <Text style={[styles.listItem, { color: colors.textSecondary }]}>• Usage data and analytics</Text>

          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>3. How We Use Your Data</Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            We use your data to:
          </Text>
          <Text style={[styles.listItem, { color: colors.textSecondary }]}>• Provide and improve our services</Text>
          <Text style={[styles.listItem, { color: colors.textSecondary }]}>• Personalize your experience</Text>
          <Text style={[styles.listItem, { color: colors.textSecondary }]}>• Send important notifications</Text>

          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>4. Data Storage and Security</Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            Your data is stored securely using Firebase's infrastructure. We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, modification, or deletion.
          </Text>

          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>5. Your Rights (GDPR)</Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            Under GDPR, you have the following rights:
          </Text>
          <Text style={[styles.listItem, { color: colors.textSecondary }]}>• Right to access your data</Text>
          <Text style={[styles.listItem, { color: colors.textSecondary }]}>• Right to rectification</Text>
          <Text style={[styles.listItem, { color: colors.textSecondary }]}>• Right to erasure ("right to be forgotten")</Text>
          <Text style={[styles.listItem, { color: colors.textSecondary }]}>• Right to restrict processing</Text>
          <Text style={[styles.listItem, { color: colors.textSecondary }]}>• Right to data portability</Text>

          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>6. Contact Us</Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            If you have any questions about this Privacy Policy or our data practices, please contact us at oskar@fritzit.io
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  lastUpdated: {
    fontSize: 14,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  listItem: {
    fontSize: 16,
    lineHeight: 24,
    marginLeft: 16,
    marginBottom: 8,
  },
  closeButton: {
    padding: 8,
  },
}); 