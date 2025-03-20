import React from 'react';
import { ScrollView, StyleSheet, View, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useTheme } from '@/context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TermsOfService() {
  const { colors } = useTheme();
  const router = useRouter();
  console.log('Terms of Service page rendered');

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <Stack.Screen
        options={{
          title: "Terms of Service",
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
          <Text style={[styles.title, { color: colors.textPrimary }]}>Terms of Service</Text>
          <Text style={[styles.lastUpdated, { color: colors.textSecondary }]}>Last Updated: {new Date().toLocaleDateString()}</Text>
          
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>1. Acceptance of Terms</Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            By accessing or using Evolvr, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using the app.
          </Text>

          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>2. User Accounts</Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account.
          </Text>

          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>3. Service Description</Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            Evolvr provides a platform for personal journaling and reflection. We reserve the right to modify, suspend, or discontinue any aspect of the service at any time.
          </Text>

          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>4. User Content</Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            You retain all rights to the content you create through our service. By submitting content, you grant us a license to use, store, and process it for the purpose of providing our services.
          </Text>

          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>5. Prohibited Activities</Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            Users are prohibited from:
          </Text>
          <Text style={[styles.listItem, { color: colors.textSecondary }]}>• Violating any laws or regulations</Text>
          <Text style={[styles.listItem, { color: colors.textSecondary }]}>• Interfering with the security of the app</Text>
          <Text style={[styles.listItem, { color: colors.textSecondary }]}>• Impersonating others</Text>
          <Text style={[styles.listItem, { color: colors.textSecondary }]}>• Distributing malware or harmful code</Text>

          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>6. Data Protection</Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            We process personal data in accordance with our Privacy Policy and applicable data protection laws, including GDPR. For more information, please refer to our Privacy Policy.
          </Text>

          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>7. Termination</Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            We reserve the right to terminate or suspend access to our service immediately, without prior notice, for any conduct that we believe violates these Terms of Service or is harmful to other users or us.
          </Text>

          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>8. Changes to Terms</Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            We reserve the right to modify these terms at any time. We will notify users of any material changes via email or through the app.
          </Text>

          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>9. Contact</Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            For any questions about these Terms of Service, please contact us at oskar@fritzit.io
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