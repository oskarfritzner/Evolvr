import React, { useState, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Image,
  Platform,
  LogBox,
} from "react-native"
import { useTheme } from "@/context/ThemeContext"
import { useAuth } from "@/context/AuthContext"
import { useRouter, Redirect } from "expo-router"
import Slider from "@react-native-community/slider"
import { doc, setDoc, getDoc } from "firebase/firestore"
import { db } from "@/backend/config/firebase"
import * as ImagePicker from 'expo-image-picker'
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { FontAwesome5 } from '@expo/vector-icons'
import DateTimePicker from '@react-native-community/datetimepicker'
import CustomDatePicker from '@/components/DatePicker'
import Toast from 'react-native-toast-message'
import { useRegistration } from "@/hooks/auth/useRegistration"
import { createUserWithEmailAndPassword, signInWithCredential } from "firebase/auth"
import { auth } from "@/backend/config/firebase"
import { registrationService } from "@/backend/services/registrationService"
import { MotiView } from 'moti'
import { AnimatePresence } from 'framer-motion'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MaterialIcons } from '@expo/vector-icons'

// Suppress findDOMNode warning
LogBox.ignoreLogs(['findDOMNode']);

interface CategoryLevel {
  level: number;
  xp: number;
}

interface CategoryLevels {
  physical: CategoryLevel;
  mental: CategoryLevel;
  financial: CategoryLevel;
  career: CategoryLevel;
  relationships: CategoryLevel;
  intellectual: CategoryLevel;
  spiritual: CategoryLevel;
}

interface OnboardingData {
  username: string;
  photoURL: string;
  moodOnRegistration: number;
  improvementReason: string;
  mainGoal: string;
  bio: string;
  birthDate: Date;
  friends: string[];  // array of user IDs
  overall: {
    level: number;
    prestige: number;
    xp: number;
  };
  categories: CategoryLevels;
  posts: string[];
  habits: string[];
  cachedRoutines: any[];
  stats: {
    totalTasksCompleted: number;
    currentStreak: number;
    longestStreak: number;
    habitsCompleted: string[];    // Array of habit IDs
    challengesCompleted: string[]; // Array of challenge IDs
    habitsFormed: number;         // Replace routinesCompleted with habitsFormed
    todayXP: number;
  };
  notifications: {
    id: string
    type: string
    read: boolean
    createdAt: Date
  }[]
}

interface IncompleteUser {
  birthDate?: string | Date;
  photoURL?: string;
  onboardingStep?: number;
  [key: string]: any;
}

const MAX_WIDTH = 400; // Define maximum width constant

export default function Onboarding() {
  const { colors } = useTheme()
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState(1)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [formData, setFormData] = useState<OnboardingData>({
    username: "",
    photoURL: "",
    moodOnRegistration: 3,
    improvementReason: "",
    mainGoal: "",
    bio: "",
    birthDate: new Date(2000, 0, 1),
    friends: [],
    overall: {
      level: 1,
      prestige: 1,
      xp: 0,
    },
    categories: {
      physical: { level: 1, xp: 0 },
      mental: { level: 1, xp: 0 },
      financial: { level: 1, xp: 0 },
      career: { level: 1, xp: 0 },
      relationships: { level: 1, xp: 0 },
      intellectual: { level: 1, xp: 0 },
      spiritual: { level: 1, xp: 0 }
    },
    posts: [],
    habits: [],
    cachedRoutines: [],
    stats: {
      totalTasksCompleted: 0,
      currentStreak: 0,
      longestStreak: 0,
      habitsCompleted: [],
      challengesCompleted: [],
      habitsFormed: 0,
      todayXP: 0
    },
    notifications: []
  })

  const registrationData = useRegistration((state) => state.data)
  const clearRegistrationData = useRegistration((state) => state.clearRegistrationData)

  // Add state for temporary image URI
  const [tempImageUri, setTempImageUri] = useState<string | null>(null)

  const insets = useSafeAreaInsets()

  // Add state for date validation
  const [isDateValid, setIsDateValid] = useState(false)

  // Load incomplete user data on mount
  useEffect(() => {
    async function loadIncompleteUser() {
      if (registrationData?.userId) {
        try {
          const incompleteUser = await registrationService.get(registrationData.userId) as IncompleteUser;
          if (incompleteUser) {
            // Set the form data from incomplete user
            setFormData(prev => ({
              ...prev,
              ...(incompleteUser as Partial<OnboardingData>),
              birthDate: incompleteUser.birthDate ? new Date(incompleteUser.birthDate) : prev.birthDate,
              categories: prev.categories, // Keep the original categories structure
            }));
            // Set the step from incomplete user
            if (incompleteUser.onboardingStep) {
              setStep(incompleteUser.onboardingStep);
            }
            // Set temp image if exists
            if (incompleteUser.photoURL) {
              setTempImageUri(incompleteUser.photoURL);
              setFormData(prev => ({ ...prev, photoURL: incompleteUser.photoURL || '' }));
            }
          }
        } catch (error) {
          console.error('Error loading incomplete user:', error);
        }
      }
    }
    loadIncompleteUser();
  }, [registrationData?.userId]);

  // Handle no registration data
  if (!registrationData) {
    return <Redirect href="/register" />;
  }

  const getMoodText = (value: number) => {
    const moods = {
      1: "😢 Really Bad",
      2: "😕 Not Great",
      3: "😐 Okay",
      4: "😊 Good",
      5: "🤩 Incredible"
    }
    return moods[value as keyof typeof moods]
  }

  const handleSubmit = async () => {
    if (!registrationData?.userId) {
      Toast.show({
        type: 'error',
        text1: 'Registration Error',
        text2: 'Please start registration again',
      });
      router.replace("/register");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Move temp profile image to permanent location
      let finalPhotoURL = formData.photoURL;
      if (formData.photoURL && formData.photoURL.startsWith('file:')) {
        try {
          const storage = getStorage();
          const tempRef = ref(storage, `profileImages/${registrationData.userId}/temp`);
          const permanentRef = ref(storage, `profileImages/${registrationData.userId}/profile`);
          
          const response = await fetch(formData.photoURL);
          const blob = await response.blob();
          
          await uploadBytes(permanentRef, blob);
          finalPhotoURL = await getDownloadURL(permanentRef);
        } catch (imageError) {
          console.error('Error uploading image:', imageError);
        }
      }

      // 2. Create sanitized user data
      const userData = {
        ...formData,
        photoURL: finalPhotoURL,
        email: registrationData.email,
        createdAt: new Date(),
        userId: registrationData.userId,
        lastUpdated: new Date(),
        onboardingComplete: true,
        stats: {
          ...formData.stats,
          habitsCompleted: [],
        }
      };

      // 3. Convert incomplete user to full user
      await registrationService.convertToUser(registrationData.userId, userData);
      
      // 4. Clean up registration data
      clearRegistrationData();
      
      // 5. Redirect to dashboard
      router.replace("/(tabs)/dashboard");

    } catch (error) {
      console.error('Error completing registration:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to complete registration',
      });
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets[0].uri) {
        setLoading(true);
        
        try {
          const storage = getStorage();
          const storageRef = ref(storage, `profileImages/${registrationData?.userId}/temp`);
          
          // For local files, use fetch and blob
          const response = await fetch(result.assets[0].uri);
          const blob = await response.blob();
          
          await uploadBytes(storageRef, blob);
          const downloadURL = await getDownloadURL(storageRef);

          // Update incompleteUser with the image URL
          if (registrationData?.userId) {
            await registrationService.update(registrationData.userId, {
              photoURL: downloadURL,
            });
          }

          // Update local state
          setTempImageUri(result.assets[0].uri);
          setFormData(prev => ({ ...prev, photoURL: downloadURL }));
        } catch (uploadError) {
          console.error('Error uploading image:', uploadError);
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: 'Failed to upload image',
          });
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to pick image',
      });
    } finally {
      setLoading(false);
    }
  };

  // Add function to calculate age from birthdate
  const calculateAge = (birthDate: Date) => {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  // Update the date change handler
  const handleDateChange = (date: Date) => {
    setFormData(prev => ({
      ...prev, 
      birthDate: date,
    }));
  };

  // Add age validation function
  const isValidAge = (birthDate: Date): boolean => {
    const minAge = 13;
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1 >= minAge;
    }
    
    return age >= minAge;
  };

  const renderDatePicker = () => (
    <View style={styles.dateContainer}>
      <CustomDatePicker
        date={formData.birthDate}
        onDateChange={handleDateChange}
        onValidationChange={setIsDateValid}
        customStyles={{
          dateInput: {
            backgroundColor: colors.surface,
            color: colors.textPrimary,
          }
        }}
      />
    </View>
  )

  const renderStep = () => {
    return (
      <AnimatePresence mode="wait">
        <MotiView
          key={step}
          from={{
            opacity: 0,
            transform: [{ translateX: 20 }],
          }}
          animate={{
            opacity: 1,
            transform: [{ translateX: 0 }],
          }}
          exit={{
            opacity: 0,
            transform: [{ translateX: -20 }],
          }}
          transition={{ type: 'timing', duration: 300 }}
          style={styles.stepContainer}
        >
          {renderStepContent()}
        </MotiView>
      </AnimatePresence>
    )
  }

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <>
            <Text style={styles.stepIndicator}>Step 1 of 4</Text>
            <Text style={styles.question}>Complete Your Profile</Text>
            
            <TouchableOpacity 
              onPress={pickImage} 
              style={styles.imageContainer}
            >
              {formData.photoURL ? (
                <Image 
                  source={{ uri: formData.photoURL }} 
                  style={styles.profileImage} 
                />
              ) : (
                <MotiView 
                  style={styles.placeholderImage}
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ 
                    loop: true,
                    duration: 2000,
                    type: 'timing'
                  }}
                >
                  <FontAwesome5 name="user" size={40} color={colors.textSecondary} />
                  <Text style={styles.requiredText}>*</Text>
                </MotiView>
              )}
              <View style={styles.imageOverlay}>
                <MaterialIcons name="photo-camera" size={24} color={colors.primary} />
              </View>
            </TouchableOpacity>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>
                Username <Text style={styles.requiredText}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, { marginTop: 5 }]}
                placeholder="Choose a username"
                placeholderTextColor={colors.textSecondary}
                value={formData.username}
                onChangeText={(text) => setFormData(prev => ({ ...prev, username: text }))}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>
                Birth Date <Text style={styles.requiredText}>*</Text>
              </Text>
              {renderDatePicker()}
            </View>

            <TextInput
              style={[styles.textArea, { marginTop: 15 }]}
              multiline
              numberOfLines={4}
              placeholder="Tell us about yourself..."
              placeholderTextColor={colors.textSecondary}
              value={formData.bio}
              onChangeText={(text) => setFormData(prev => ({ ...prev, bio: text }))}
            />
          </>
        )

      case 2:
        return (
          <>
            <Text style={styles.stepIndicator}>Step 2 of 4</Text>
            <Text style={styles.question}>How are you feeling?</Text>
            <MotiView 
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ 
                duration: 1000,
                loop: true,
                type: 'timing'
              }}
            >
              <Text style={[styles.moodText, { fontSize: 48 }]}>
                {getMoodText(formData.moodOnRegistration)}
              </Text>
            </MotiView>
            <Slider
              style={styles.slider}
              minimumValue={1}
              maximumValue={5}
              step={1}
              value={formData.moodOnRegistration}
              onValueChange={(value) => setFormData({ ...formData, moodOnRegistration: value })}
              minimumTrackTintColor={colors.secondary}
              maximumTrackTintColor={colors.textSecondary}
              thumbTintColor={colors.secondary}
            />
          </>
        )

      case 3:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.question}>Why do you want to improve yourself?</Text>
            <TextInput
              style={styles.textArea}
              multiline
              numberOfLines={4}
              placeholder="Share your motivation..."
              placeholderTextColor={colors.textSecondary}
              value={formData.improvementReason}
              onChangeText={(text) => setFormData({ ...formData, improvementReason: text })}
            />
          </View>
        )

      case 4:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.question}>What's your main goal?</Text>
            <TextInput
              style={styles.textArea}
              multiline
              numberOfLines={4}
              placeholder="Describe your goal..."
              placeholderTextColor={colors.textSecondary}
              value={formData.mainGoal}
              onChangeText={(text) => setFormData({ ...formData, mainGoal: text })}
            />
          </View>
        )
    }
  }

  const validateStep = () => {
    switch (step) {
      case 1:
        // Check for profile image
        if (!tempImageUri) {
          Toast.show({
            type: 'error',
            text1: 'Profile Image Required',
            text2: 'Please upload a profile image',
          });
          return false;
        }

        // Check for username
        if (!formData.username.trim()) {
          Toast.show({
            type: 'error',
            text1: 'Username Required',
            text2: 'Please enter a username',
          });
          return false;
        }

        // Validate birthdate format and age
        if (!formData.birthDate) {
          Toast.show({
            type: 'error',
            text1: 'Birth Date Required',
            text2: 'Please enter your birth date in MM/DD/YYYY format',
          });
          return false;
        }

        // Check if date is valid
        if (isNaN(formData.birthDate.getTime())) {
          Toast.show({
            type: 'error',
            text1: 'Invalid Date Format',
            text2: 'Please enter a valid date in MM/DD/YYYY format',
          });
          return false;
        }

        // Validate age
        if (!isValidAge(formData.birthDate)) {
          Toast.show({
            type: 'error',
            text1: 'Invalid Age',
            text2: 'You must be at least 13 years old to use this app',
          });
          return false;
        }

        return true;

      case 2:
      case 3:
      case 4:
        return true;

      default:
        return true;
    }
  };

  const handleNext = async () => {
    if (!validateStep()) return;

    try {
      if (registrationData?.userId) {
        const updateData = {
          ...formData,
          onboardingStep: step + 1,
          lastUpdated: new Date(),
          notifications: formData.notifications.map(n => ({
            ...n,
            createdAt: new Date(n.createdAt)
          }))
        };
        
        await registrationService.update(registrationData.userId, updateData);
      }

      if (step < 4) {
        setStep(step + 1);
      } else {
        handleSubmit();
      }
    } catch (error) {
      console.error('Error saving progress:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to save progress',
      });
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    contentContainer: {
      flexGrow: 1,
      paddingHorizontal: 20,
      paddingTop: insets.top + 20,
      paddingBottom: insets.bottom + 20,
      alignItems: 'center',
      maxWidth: MAX_WIDTH,
      alignSelf: 'center',
      width: '100%',
    },
    stepContainer: {
      width: '100%',
      alignItems: 'center',
    },
    stepIndicator: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 10,
    },
    question: {
      fontSize: 28,
      fontWeight: "700",
      color: colors.textPrimary,
      marginBottom: 30,
      textAlign: "center",
      lineHeight: 34,
    },
    moodText: {
      fontSize: 18,
      color: colors.textSecondary,
      marginBottom: 20,
    },
    slider: {
      width: "100%",
      height: 40,
    },
    textArea: {
      width: "100%",
      backgroundColor: colors.surface,
      borderRadius: 10,
      padding: 15,
      fontSize: 16,
      color: colors.textPrimary,
      textAlignVertical: "top",
      minHeight: 120,
    },
    buttonContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 20,
      backgroundColor: colors.background,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    button: {
      backgroundColor: colors.secondary,
      paddingVertical: 15,
      paddingHorizontal: 30,
      borderRadius: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    buttonText: {
      color: colors.primary,
      fontSize: 16,
      fontWeight: "600",
    },
    errorText: {
      color: colors.error,
      textAlign: "center",
      marginBottom: 15,
    },
    imageContainer: {
      width: 150,
      height: 150,
      borderRadius: 75,
      alignSelf: 'center',
      marginBottom: 30,
      backgroundColor: colors.surface,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 5,
    },
    profileImage: {
      width: '100%',
      height: '100%',
      borderRadius: 75,
    },
    placeholderImage: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    imageOverlay: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      backgroundColor: colors.secondary,
      padding: 8,
      borderRadius: 20,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    dateContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 20,
    },
    dateButton: {
      backgroundColor: colors.surface,
      padding: 10,
      borderRadius: 10,
      minWidth: 120,
    },
    dateButtonText: {
      color: colors.textPrimary,
      fontSize: 16,
      textAlign: 'center',
    },
    input: {
      backgroundColor: colors.surface,
      padding: 15,
      borderRadius: 12,
      fontSize: 16,
      color: colors.textPrimary,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    dateLabel: {
      fontSize: 16,
      color: colors.textPrimary,
      marginBottom: 5,
      alignSelf: 'flex-start',
    },
    inputContainer: {
      width: '100%',
      marginTop: 15,
    },
    inputLabel: {
      fontSize: 16,
      color: colors.textPrimary,
      marginBottom: 5,
    },
    requiredText: {
      color: colors.error,
      fontSize: 16,
    },
    dateHint: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 5,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
  })

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={true}
      >
        {renderStep()}
      </ScrollView>

      <View style={[styles.buttonContainer, { paddingBottom: insets.bottom + 20 }]}>
        {step > 1 && (
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: colors.surface }]}
            onPress={() => setStep(step - 1)}
          >
            <Text style={[styles.buttonText, { color: colors.textPrimary }]}>Back</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          style={[
            styles.button,
            ((!formData.username.trim() || !isDateValid) && step === 1) && styles.buttonDisabled
          ]}
          onPress={handleNext}
          disabled={loading || (step === 1 && (!formData.username.trim() || !isDateValid))}
        >
          {loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.buttonText}>
              {step === 4 ? "Finish" : "Next"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
} 