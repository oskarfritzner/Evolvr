import React, { useState, useEffect } from "react"
import {
  View,
  StyleSheet,
  Platform,
  LogBox,
  Alert,
  TouchableOpacity,
  Text,
} from "react-native"
import { useTheme } from "@/context/ThemeContext"
import { useAuth } from "@/context/AuthContext"
import { useRouter } from "expo-router"
import { db, auth } from "@/backend/config/firebase"
import { doc, deleteDoc } from "firebase/firestore"
import { signInWithEmailAndPassword } from "firebase/auth"
import { MotiView } from 'moti'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { MoodSlide } from '@/components/onboarding/slides/MoodSlide'
import { MotivationSlide } from '@/components/onboarding/slides/MotivationSlide'
import { GoalSlide } from '@/components/onboarding/slides/GoalSlide'
import { WelcomeSlide } from '@/components/onboarding/slides/WelcomeSlide'
import { ProfileSlide } from '@/components/onboarding/slides/ProfileSlide'
import Button from '@/components/Button'
import Toast from 'react-native-toast-message'
import { MaterialIcons } from '@expo/vector-icons'
import { registrationService } from '@/backend/services/registrationService'
import { useRegistration } from '@/hooks/auth/useRegistration'
import { userService } from '@/backend/services/userService'

// Suppress findDOMNode warning
LogBox.ignoreLogs(['findDOMNode']);

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user, signOut, refreshUserData } = useAuth();
  const insets = useSafeAreaInsets();
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

  useEffect(() => {
    // Update onboarding step in incomplete users collection
    if (user?.uid) {
      registrationService.updateOnboardingStep(user.uid, currentStep)
        .catch(console.error);
    }
  }, [currentStep, user?.uid]);

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

  // Helper function to wait for user data with retries
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

        // Complete registration and create full user
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
          categories: {},
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
          friends: [],
          activeTasks: [],
          posts: [],
          subscription: {
            type: "FREE",
            startDate: new Date(),
            status: "active",
            autoRenew: false
          },
          displayName: profile.username,
          usernameLower: profile.username.toLowerCase(),
          displayNameLower: profile.username.toLowerCase(),
          createdAt: new Date(),
          lastUpdated: new Date()
        };

        // Complete registration
        await registrationService.completeRegistration(user.uid, finalUserData);

        // Clear registration data
        clearRegistrationData();
        
        // Set welcome modal flag
        await AsyncStorage.setItem(`should_show_welcome_${user.uid}`, 'true');

        // Force token refresh and get new token
        const currentUser = auth.currentUser;
        if (currentUser) {
          await currentUser.getIdToken(true);
        }

        // Wait for user data to be available with retries
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
          // Wait before next retry
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

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

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

  return (
    <View 
      style={[
        styles.container, 
        { 
          backgroundColor: colors.background,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        }
      ]}
    >
      <StatusBar style="auto" />
      
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

      {renderStep()}
      
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
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    paddingRight: 16,
    borderRadius: 20,
    gap: 4,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '500',
  },
  progressDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
    marginRight: 44,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  stepContainer: {
    flex: 1,
    width: '100%',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
    gap: 12,
  },
  button: {
    flex: 1,
    minHeight: 50,
    borderRadius: 25,
  },
  singleButton: {
    maxWidth: 200,
    alignSelf: 'center',
  },
}); 