/**
 * Onboarding Screen
 * 
 * This screen handles the user onboarding process after registration.
 * It consists of 5 steps:
 * 1. Welcome - Introduction to the app
 * 2. Profile - Basic user information (username, photo, birth date)
 * 3. Mood - Current emotional state
 * 4. Motivation - User's primary motivation for using the app
 * 5. Goal - User's main goal
 * 
 * Features:
 * - Smooth transitions between steps using MotiView animations
 * - Progress tracking with animated dots
 * - Data validation at each step
 * - Persistent storage of onboarding progress
 * - Graceful error handling and user feedback
 * - Cross-platform support (iOS, Android, Web)
 */

import React, { useState, useEffect } from "react"
import {
  View,
  StyleSheet,
  Platform,
  LogBox,
  Alert,
  TouchableOpacity,
  Text,
  ViewStyle,
  TextStyle,
} from "react-native"
import { useTheme } from "@/context/ThemeContext"
import { useAuth } from "@/context/AuthContext"
import { useRouter } from "expo-router"
import { db, auth } from "@/backend/config/firebase"
import { MotiView } from 'moti'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { MoodSlide } from '@/components/onboarding/slides/MoodSlide'
import { MotivationSlide } from '@/components/onboarding/slides/MotivationSlide'
import { GoalSlide } from '@/components/onboarding/slides/GoalSlide'
import { WelcomeSlide } from '@/components/onboarding/slides/WelcomeSlide'
import { ProfileSlide } from '@/components/onboarding/slides/ProfileSlide'
import Button from '@/components/ui/Button'
import Toast from 'react-native-toast-message'
import { MaterialIcons } from '@expo/vector-icons'
import { registrationService } from '@/backend/services/registrationService'
import { useRegistration } from '@/hooks/auth/useRegistration'
import { userService } from '@/backend/services/userService'
import { CategoryLevel } from "@/backend/types/Level"

// Suppress specific warnings for web
if (Platform.OS === 'web') {
  LogBox.ignoreLogs([
    'Warning: Unsupported style property',
    'TouchableWithoutFeedback is deprecated',
    'props.pointerEvents is deprecated'
  ]);
}

export default function OnboardingScreen() {
  // Theme and navigation hooks
  const { colors } = useTheme();
  const router = useRouter();
  const { user, signOut, refreshUserData } = useAuth();
  const insets = useSafeAreaInsets();

  // State management for the onboarding process
  const [currentStep, setCurrentStep] = useState(1);
  const [profile, setProfile] = useState({
    username: '',
    bio: '',
    birthDate: new Date(),
    photoURL: null as string | null,
  });
  const [mood, setMood] = useState(3);
  const [motivation, setMotivation] = useState('');
  const [goal, setGoal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const { data: registrationData, clearRegistrationData } = useRegistration();

  /**
   * Updates the onboarding progress in Firestore
   * This allows users to resume their onboarding if they close the app
   */
  useEffect(() => {
    if (user?.uid) {
      registrationService.updateOnboardingStep(user.uid, currentStep)
        .catch(console.error);
    }
  }, [currentStep, user?.uid]);

  /**
   * Handles the cancellation of the onboarding process
   * - Deletes incomplete user data
   * - Removes auth user
   * - Clears registration data
   * - Redirects to sign-in
   */
  const handleCancel = async () => {
    Alert.alert(
      "Cancel Registration",
      "Are you sure you want to cancel? This will delete your account and you'll need to register again.",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              setIsCanceling(true);
              
              if (user?.uid) {
                // First, ensure we have a fresh token
                try {
                  const currentUser = auth.currentUser;
                  if (currentUser) {
                    await currentUser.getIdToken(true); // Force token refresh
                  }
                } catch (error) {
                  console.error('Error refreshing token:', error);
                }

                // Delete data in this order to ensure cleanup
                try {
                  // 1. Delete incomplete user document first
                  await registrationService.deleteIncompleteUser(user.uid);
                } catch (error) {
                  console.error('Error deleting incomplete user:', error);
                }

                try {
                  // 2. Delete the auth user
                  if (auth.currentUser) {
                    await auth.currentUser.delete();
                  }
                } catch (error) {
                  console.error('Error deleting auth user:', error);
                }
              }
              
              // 3. Clear registration data and storage regardless of previous steps
              clearRegistrationData();
              await AsyncStorage.multiRemove(['onboardingCompleted']);
              
              // 4. Sign out and redirect
              await signOut();
              router.replace('/(auth)/sign-in');
              
            } catch (error) {
              console.error('Error canceling registration:', error);
              
              // Even if there's an error, try to sign out and redirect
              try {
                await signOut();
                router.replace('/(auth)/sign-in');
              } catch (signOutError) {
                console.error('Error signing out after registration cancel:', signOutError);
              }

              Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to cancel registration completely, but you have been signed out.',
              });
            } finally {
              setIsCanceling(false);
            }
          }
        }
      ]
    );
  };

  /**
   * Waits for user data to be available in Firestore
   * Implements a retry mechanism with exponential backoff
   */
  const waitForUserData = async (userId: string, maxRetries = 3): Promise<boolean> => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const userData = await userService.getUserData(userId);
        if (userData) {
          await refreshUserData(userId);
          return true;
        }
        // Wait before next retry
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Retry ${i + 1} failed:`, error);
        if (i === maxRetries - 1) throw error;
      }
    }
    return false;
  };

  /**
   * Handles progression to the next step
   * - Validates current step data
   * - Updates step counter
   * - On final step, completes registration and creates user profile
   */
  const handleNext = async () => {
    // Validate profile data when on profile step
    if (currentStep === 2) {
      if (!profile.username?.trim()) {
        Toast.show({
          type: 'error',
          text1: 'Username Required',
          text2: 'Please enter a username to continue',
        });
        return;
      }
      if (!profile.birthDate) {
        Toast.show({
          type: 'error',
          text1: 'Birth Date Required',
          text2: 'Please enter your birth date to continue',
        });
        return;
      }
      if (!profile.photoURL) {
        Toast.show({
          type: 'error',
          text1: 'Profile Picture Required',
          text2: 'Please add a profile picture to continue',
        });
        return;
      }
    }

    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    } else {
      try {
        setIsLoading(true);
        
        if (!user?.uid) {
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: 'User not found. Please try again.',
          });
          return;
        }

        // Initialize user data with default values and onboarding information
        const finalUserData = {
          email: registrationData?.email,
          ...profile,
          onboardingInfo: {
            completedAt: new Date(),
            mood,
            motivation,
            goal,
            birthDate: profile.birthDate,
          },
          // Initialize user categories with starting levels
          categories: {
            physical: { level: 1, xp: 0 },
            mental: { level: 1, xp: 0 },
            intellectual: { level: 1, xp: 0 },
            spiritual: { level: 1, xp: 0 },
            financial: { level: 1, xp: 0 },
            career: { level: 1, xp: 0 },
            relationships: { level: 1, xp: 0 },
          },
          // Initialize user stats and progress tracking
          overall: { level: 1, xp: 0, prestige: 0 },
          stats: {
            totalTasksCompleted: 0,
            currentStreak: 0,
            longestStreak: 0,
            routinesCompleted: 0,
            habitsCompleted: [],
            challengesCompleted: [],
            totalChallengesJoined: 0,
            todayXP: 0,
            todayCompletedTasks: [],
          },
          // Initialize social features
          friends: [],
          activeTasks: [],
          posts: [],
          // Set up subscription status
          subscription: {
            type: "FREE",
            startDate: new Date(),
            status: "active",
            autoRenew: false
          },
          // Set up user identifiers
          displayName: profile.username,
          usernameLower: profile.username.toLowerCase(),
          displayNameLower: profile.username.toLowerCase(),
          createdAt: new Date(),
          lastUpdated: new Date()
        };

        // Complete registration process
        await registrationService.completeRegistration(user.uid, finalUserData);
        clearRegistrationData();
        await AsyncStorage.setItem(`should_show_welcome_${user.uid}`, 'true');

        // Ensure fresh auth token
        const currentUser = auth.currentUser;
        if (currentUser) {
          await currentUser.getIdToken(true);
        }

        // Wait for user data to be available
        let userData = null;
        for (let i = 0; i < 5; i++) {
          try {
            userData = await userService.getUserData(user.uid);
            if (userData) {
              console.log("User data loaded:", userData);
              await refreshUserData(user.uid);
              break;
            }
          } catch (error) {
            console.error(`Retry ${i + 1} failed:`, error);
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        if (!userData) {
          throw new Error('Failed to load user data after multiple retries');
        }

        // Navigate to dashboard
        router.replace('/(tabs)/dashboard');
      } catch (error) {
        console.error('Error completing registration:', error);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to save your information. Please try again.',
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  /**
   * Handles navigation to the previous step
   */
  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  /**
   * Renders the appropriate slide based on current step
   * Each slide is wrapped in a MotiView for smooth animations
   */
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <MotiView
            style={styles.stepContainer}
            animate={{ opacity: 1, translateX: 0 }}
            from={{ opacity: 0, translateX: 100 }}
            transition={{ type: 'timing', duration: 300 }}
          >
            <WelcomeSlide />
          </MotiView>
        );
      case 2:
        return <ProfileSlide profile={profile} onChange={setProfile} />;
      case 3:
        return <MoodSlide value={mood} onChange={setMood} />;
      case 4:
        return <MotivationSlide value={motivation} onChange={setMotivation} />;
      case 5:
        return <GoalSlide value={goal} onChange={setGoal} />;
      default:
        return null;
    }
  };

  /**
   * Main render function
   * Handles both web and mobile layouts
   */
  const content = (
    <View 
      style={[
        styles.container,
        { 
          backgroundColor: colors.background,
          paddingTop: Platform.OS === 'web' ? 20 : insets.top,
          paddingBottom: Platform.OS === 'web' ? 20 : insets.bottom,
        }
      ]}
    >
      <StatusBar style="auto" />
      
      {/* Header with cancel button and progress dots */}
      <View style={styles.headerContainer}>
        <TouchableOpacity
          onPress={handleCancel}
          disabled={isCanceling || isLoading}
          style={[
            styles.cancelButton,
            { backgroundColor: colors.surface },
            (isCanceling || isLoading) && { opacity: 0.5 }
          ]}
        >
          <MaterialIcons name="close" size={24} color={colors.textSecondary} />
          <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
        </TouchableOpacity>

        {/* Animated progress dots */}
        <View style={styles.progressDots}>
          {[1, 2, 3, 4, 5].map((step) => (
            <MotiView
              key={step}
              style={[
                styles.dot,
                {
                  backgroundColor: step === currentStep ? colors.secondary : colors.border,
                  width: step === currentStep ? 24 : 8,
                }
              ]}
              animate={{
                scale: step === currentStep ? 1.1 : 1,
                backgroundColor: step === currentStep ? colors.secondary : colors.border,
              }}
              transition={{ type: 'spring', damping: 15 }}
            />
          ))}
        </View>
      </View>

      {/* Current step content */}
      {renderStep()}
      
      {/* Navigation buttons */}
      <MotiView 
        style={styles.buttonContainer}
        animate={{ opacity: 1, translateY: 0 }}
        from={{ opacity: 0, translateY: 20 }}
        transition={{ type: 'timing', duration: 300 }}
      >
        {currentStep > 1 && (
          <Button
            onPress={handleBack}
            title="Back"
            variant="secondary"
            style={styles.button}
            disabled={isLoading || isCanceling}
          />
        )}
        <Button
          onPress={handleNext}
          title={currentStep === 5 ? "Get Started" : "Next"}
          variant="primary"
          style={[styles.button, currentStep === 1 && styles.singleButton]}
          loading={isLoading}
          disabled={isLoading || isCanceling}
        />
      </MotiView>
      <Toast />
    </View>
  );

  // Handle web-specific layout
  if (Platform.OS === 'web') {
    return (
      <div style={{ 
        maxWidth: 800, 
        margin: '0 auto',
        height: '100vh',
        overflow: 'auto'
      }}>
        {content}
      </div>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  } as ViewStyle,
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  } as ViewStyle,
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    paddingRight: 16,
    borderRadius: 20,
    gap: 4,
    ...(Platform.OS === 'web' ? {
      cursor: 'pointer' as const,
    } : {}),
  } as ViewStyle,
  cancelText: {
    fontSize: 16,
    fontWeight: '500',
  } as TextStyle,
  progressDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
    marginRight: 44,
  } as ViewStyle,
  dot: {
    height: 8,
    borderRadius: 4,
  } as ViewStyle,
  stepContainer: {
    flex: 1,
    width: '100%',
  } as ViewStyle,
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
    gap: 12,
  } as ViewStyle,
  button: {
    flex: 1,
    minHeight: 50,
    borderRadius: 25,
  } as ViewStyle,
  singleButton: {
    maxWidth: 200,
    alignSelf: 'center',
  } as ViewStyle,
}); 