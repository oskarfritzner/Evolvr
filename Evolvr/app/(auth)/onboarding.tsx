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
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
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
import AsyncStorage from '@react-native-async-storage/async-storage'

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
  const { user, refreshUserData } = useAuth()
  const router = useRouter()
  const registrationData = useRegistration((state) => state.data)
  const updateRegistrationData = useRegistration((state) => state.updateRegistrationData)
  const clearRegistrationData = useRegistration((state) => state.clearRegistrationData)
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

  // Add state for temporary image URI
  const [tempImageUri, setTempImageUri] = useState<string | null>(null)

  const insets = useSafeAreaInsets()

  // Add state for date validation
  const [isDateValid, setIsDateValid] = useState(false)

  // Add state for image picker modal
  const [showImagePickerModal, setShowImagePickerModal] = useState(false)

  // Effect to handle registration data and navigation
  useEffect(() => {
    if (!registrationData?.userId) {
      router.replace("/register");
      return;
    }

    if (registrationData.onboardingStep) {
      setStep(registrationData.onboardingStep);
    }

    // Load incomplete user data if available
    const loadIncompleteUserData = async () => {
      const userId = registrationData.userId;
      if (!userId) return;

      try {
        const incompleteUser = await registrationService.get(userId);
        if (incompleteUser) {
          // Safely handle date conversion and type matching
          setFormData(prevData => ({
            ...prevData,
            ...incompleteUser,
            birthDate: incompleteUser.birthDate ? new Date(incompleteUser.birthDate) : prevData.birthDate,
          }));
        }
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to load your previous data. Starting fresh.'
        });
      }
    };

    loadIncompleteUserData();
  }, [registrationData]);

  useEffect(() => {
    console.log('Current mood value:', formData.moodOnRegistration);
  }, [formData.moodOnRegistration]);

  const getMoodText = (value: number) => {
    const moods = {
      1: "😢",
      2: "😕",
      3: "😐",
      4: "😊",
      5: "🤩"
    }
    return moods[value as keyof typeof moods]
  }

  const getMoodLabel = (value: number) => {
    const labels = {
      1: "Really Bad",
      2: "Not Great",
      3: "Okay",
      4: "Good",
      5: "Incredible"
    }
    return labels[value as keyof typeof labels]
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
      
      // 4. Refresh user data in context
      await refreshUserData(registrationData.userId);
      
      // 5. Clean up registration data
      clearRegistrationData();

      // 6. Set welcome modal flag
      await AsyncStorage.setItem(`should_show_welcome_${registrationData.userId}`, 'true');
      
      // 7. Redirect to dashboard
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

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({
          type: 'error',
          text1: 'Camera Permission Required',
          text2: 'Please enable camera access in your settings',
        });
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
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
          
          const response = await fetch(result.assets[0].uri);
          const blob = await response.blob();
          
          await uploadBytes(storageRef, blob);
          const downloadURL = await getDownloadURL(storageRef);

          if (registrationData?.userId) {
            await registrationService.update(registrationData.userId, {
              photoURL: downloadURL,
            });
          }

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
      console.error('Error taking photo:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to take photo',
      });
    } finally {
      setLoading(false);
      setShowImagePickerModal(false);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({
          type: 'error',
          text1: 'Gallery Permission Required',
          text2: 'Please enable gallery access in your settings',
        });
        return;
      }

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
          
          const response = await fetch(result.assets[0].uri);
          const blob = await response.blob();
          
          await uploadBytes(storageRef, blob);
          const downloadURL = await getDownloadURL(storageRef);

          if (registrationData?.userId) {
            await registrationService.update(registrationData.userId, {
              photoURL: downloadURL,
            });
          }

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
      setShowImagePickerModal(false);
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

  const minDate = new Date();
  minDate.setFullYear(minDate.getFullYear() - 100); // Max age 100 years
  
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() - 13); // Min age 13 years

  const renderDatePicker = () => (
    <View style={styles.dateContainer}>
      <CustomDatePicker
        date={formData.birthDate}
        onDateChange={handleDateChange}
        onValidationChange={setIsDateValid}
        minDate={minDate}
        maxDate={maxDate}
        label="Birth Date"
        required
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
            <Text style={[styles.stepIndicator, { color: colors.textSecondary }]}>Step 1 of 4</Text>
            <Text style={[styles.question, { color: colors.textPrimary }]}>Complete Your Profile</Text>
            
            <TouchableOpacity 
              onPress={() => setShowImagePickerModal(true)} 
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
              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                Username <Text style={styles.requiredText}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.surface,
                  color: colors.textPrimary
                }]}
                placeholder="Choose a username"
                placeholderTextColor={colors.textSecondary}
                value={formData.username}
                onChangeText={(text) => setFormData(prev => ({ ...prev, username: text }))}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                Birth Date <Text style={styles.requiredText}>*</Text>
              </Text>
              {renderDatePicker()}
            </View>

            <TextInput
              style={[styles.textArea, { 
                backgroundColor: colors.surface,
                color: colors.textPrimary,
                marginTop: 15 
              }]}
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
        const moodEmoji = getMoodText(formData.moodOnRegistration);
        const moodLabel = getMoodLabel(formData.moodOnRegistration);
        console.log('Mood values:', { moodEmoji, moodLabel, currentMood: formData.moodOnRegistration });
        
        return (
          <View style={styles.centeredStepContainer}>
            <Text style={[styles.stepIndicator, { color: colors.textSecondary }]}>Step 2 of 4</Text>
            <Text style={[styles.question, { color: colors.textPrimary }]}>How are you feeling?</Text>
            
            <Text style={[styles.moodEmoji, { color: colors.textPrimary }]}>
              {moodEmoji}
            </Text>
            
            <Text style={[styles.moodLabel, { color: colors.textPrimary }]}>
              {moodLabel}
            </Text>

            <Slider
              style={styles.slider}
              minimumValue={1}
              maximumValue={5}
              step={1}
              value={formData.moodOnRegistration}
              onValueChange={(value) => {
                console.log('Slider value changed:', value);
                setFormData(prev => ({ ...prev, moodOnRegistration: value }));
              }}
              minimumTrackTintColor={colors.secondary}
              maximumTrackTintColor={colors.textSecondary}
              thumbTintColor={colors.secondary}
            />
          </View>
        )

      case 3:
        return (
          <View style={styles.centeredStepContainer}>
            <Text style={[styles.stepIndicator, { color: colors.textSecondary }]}>Step 3 of 4</Text>
            <Text style={[styles.question, { color: colors.textPrimary }]}>Why do you want to improve yourself?</Text>
            <TextInput
              style={[styles.textArea, { 
                backgroundColor: colors.surface,
                color: colors.textPrimary 
              }]}
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
          <View style={styles.centeredStepContainer}>
            <Text style={[styles.stepIndicator, { color: colors.textSecondary }]}>Step 4 of 4</Text>
            <Text style={[styles.question, { color: colors.textPrimary }]}>What's your main goal?</Text>
            <TextInput
              style={[styles.textArea, { 
                backgroundColor: colors.surface,
                color: colors.textPrimary 
              }]}
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
        
        // Update registration data with new step
        updateRegistrationData({ onboardingStep: step + 1 });
      }

      if (step < 4) {
        setStep(step + 1);
      } else {
        await handleSubmit();
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

  // Add handleCancel function after handleSubmit
  const handleCancel = async () => {
    setLoading(true);
    try {
      if (registrationData?.userId) {
        // Delete any uploaded images
        if (formData.photoURL) {
          const storage = getStorage();
          try {
            const tempRef = ref(storage, `profileImages/${registrationData.userId}/temp`);
            await deleteObject(tempRef).catch(() => {}); // Ignore if doesn't exist
          } catch (error) {
            console.error('Error deleting temp image:', error);
          }
        }

        // Delete incomplete user data
        await registrationService.delete(registrationData.userId);

        // Delete Firebase auth user
        if (auth.currentUser) {
          await auth.currentUser.delete();
        }

        // Clear registration data from storage
        clearRegistrationData();

        Toast.show({
          type: 'success',
          text1: 'Registration Cancelled',
          text2: 'You can start fresh anytime',
        });
      }

      // Navigate back to register
      router.replace('/register');
    } catch (error) {
      console.error('Error cancelling registration:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to cancel registration',
      });
    } finally {
      setLoading(false);
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
    centeredContainer: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: insets.top,
      paddingBottom: insets.bottom,
      alignItems: 'center',
      justifyContent: 'center',
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
      textAlign: 'center',
      marginBottom: 10,
    },
    question: {
      fontSize: 28,
      fontWeight: "700",
      marginBottom: 30,
      textAlign: "center",
      lineHeight: 34,
    },
    moodText: {
      fontSize: 18,
      color: '#000000',
      marginBottom: 20,
      textAlign: 'center',
    },
    slider: {
      width: '80%',
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
    centeredStepContainer: {
      width: '100%',
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingBottom: 100, // Add some padding to offset the buttons at the bottom
    },
    imagePickerModal: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: -2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 5,
    },
    modalOption: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 15,
      borderRadius: 10,
      marginBottom: 10,
      backgroundColor: colors.background,
    },
    modalOptionText: {
      marginLeft: 15,
      fontSize: 16,
      color: colors.textPrimary,
      fontWeight: '500',
    },
    modalOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    moodContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      paddingVertical: 20,
    },
    emojiContainer: {
      alignItems: 'center',
      marginBottom: 30,
    },
    moodEmoji: {
      fontSize: 80,
      marginBottom: 20,
      textAlign: 'center',
    },
    moodLabel: {
      fontSize: 24,
      fontWeight: '600',
      marginBottom: 30,
      textAlign: 'center',
    },
    sliderContainer: {
      width: '80%',
      alignSelf: 'center',
    },
  })

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {step === 1 ? (
        <ScrollView 
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={true}
        >
          {renderStep()}
        </ScrollView>
      ) : (
        <View style={styles.centeredContainer}>
          {renderStep()}
        </View>
      )}

      <View style={[styles.buttonContainer, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: colors.error }]}
          onPress={handleCancel}
          disabled={loading}
        >
          <Text style={[styles.buttonText, { color: colors.surface }]}>
            Cancel
          </Text>
        </TouchableOpacity>

        {step > 1 && (
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: colors.surface }]}
            onPress={() => setStep(step - 1)}
            disabled={loading}
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

      {showImagePickerModal && (
        <>
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowImagePickerModal(false)}
          />
          <View style={styles.imagePickerModal}>
            <TouchableOpacity 
              style={styles.modalOption}
              onPress={takePhoto}
            >
              <MaterialIcons name="camera-alt" size={24} color={colors.secondary} />
              <Text style={styles.modalOptionText}>Take Photo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.modalOption}
              onPress={pickImage}
            >
              <MaterialIcons name="photo-library" size={24} color={colors.secondary} />
              <Text style={styles.modalOptionText}>Choose from Gallery</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  )
} 