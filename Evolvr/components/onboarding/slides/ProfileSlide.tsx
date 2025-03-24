import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  Image,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { MotiView } from 'moti';
import DatePicker from '@/components/DatePicker';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { usernameService } from '@/backend/services/usernameService';
import debounce from 'lodash/debounce';

interface ProfileSlideProps {
  profile: {
    username: string;
    bio: string;
    birthDate: Date;
    photoURL: string | null;
  };
  onChange: (value: {
    username: string;
    bio: string;
    birthDate: Date;
    photoURL: string | null;
  }) => void;
}

// Add function to resize image for web
const resizeImage = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (readerEvent: ProgressEvent<FileReader>) => {
      const img = document.createElement('img');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 500; // Max width/height
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width *= maxSize / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        // Convert to JPEG with reduced quality
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        resolve(dataUrl);
      };
      img.src = readerEvent.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

export function ProfileSlide({ profile, onChange }: ProfileSlideProps) {
  const { colors } = useTheme();
  const isWeb = Platform.OS === 'web';
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isUsernameValid, setIsUsernameValid] = useState(false);

  // Debounced username validation
  const validateUsername = useCallback(
    debounce(async (username: string) => {
      if (!username) {
        setUsernameError(null);
        setIsUsernameValid(false);
        return;
      }

      setIsCheckingUsername(true);
      try {
        // First check format
        const validation = usernameService.validateUsername(username);
        if (!validation.isValid) {
          setUsernameError(validation.error || 'Invalid username format');
          setIsUsernameValid(false);
          return;
        }

        // Then check availability
        const isAvailable = await usernameService.isUsernameAvailable(username);
        if (!isAvailable) {
          setUsernameError('Username is already taken');
          setIsUsernameValid(false);
        } else {
          setUsernameError(null);
          setIsUsernameValid(true);
        }
      } catch (error) {
        console.error('Error checking username:', error);
        setUsernameError('Error checking username availability');
        setIsUsernameValid(false);
      } finally {
        setIsCheckingUsername(false);
      }
    }, 500),
    []
  );

  // Validate username when it changes
  useEffect(() => {
    if (profile.username) {
      validateUsername(profile.username);
    } else {
      setUsernameError(null);
      setIsUsernameValid(false);
    }
  }, [profile.username]);

  const handleImageSelection = () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e: any) => {
        const file = e.target.files[0];
        if (file) {
          try {
            const resizedImage = await resizeImage(file);
            onChange({ ...profile, photoURL: resizedImage });
          } catch (error) {
            console.error('Error processing image:', error);
            Alert.alert(
              "Error",
              "Failed to process the image. Please try a different image."
            );
          }
        }
      };
      input.click();
    } else {
      Alert.alert(
        "Profile Photo",
        "Choose a photo from your library or take a new one",
        [
          {
            text: "Cancel",
            style: "cancel"
          },
          {
            text: "Take Photo",
            onPress: () => takePhoto()
          },
          {
            text: "Choose from Library",
            onPress: () => pickImage()
          }
        ]
      );
    }
  };

  const takePhoto = async () => {
    // Request camera permissions
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        "Permission Needed",
        "Please grant camera permissions to take a photo"
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      onChange({ ...profile, photoURL: result.assets[0].uri });
    }
  };

  const pickImage = async () => {
    // Request media library permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        "Permission Needed",
        "Please grant photo library access to choose a photo"
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      onChange({ ...profile, photoURL: result.assets[0].uri });
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      enabled={!isWeb}
    >
      <TouchableWithoutFeedback onPress={isWeb ? undefined : Keyboard.dismiss}>
        <ScrollView 
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
          pointerEvents="auto"
        >
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 500 }}
            style={styles.content}
          >
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Create Your Profile
            </Text>
            
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Let's get to know you better
            </Text>

            <View style={styles.photoContainer}>
              <TouchableOpacity 
                onPress={handleImageSelection}
                style={[styles.photoButton, { borderColor: colors.border }]}
              >
                {profile.photoURL ? (
                  <Image 
                    source={{ uri: profile.photoURL }} 
                    style={styles.profilePhoto}
                  />
                ) : (
                  <>
                    <MaterialIcons name="add-a-photo" size={32} color={colors.textSecondary} />
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.usernameContainer}>
                <TextInput
                  style={[
                    styles.input,
                    { 
                      color: colors.textPrimary,
                      borderColor: usernameError ? colors.error : isUsernameValid ? colors.success : colors.border,
                      backgroundColor: colors.surface
                    }
                  ]}
                  placeholder="Username"
                  placeholderTextColor={colors.textSecondary}
                  value={profile.username}
                  onChangeText={(text) => {
                    onChange({ ...profile, username: text });
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {isCheckingUsername && (
                  <ActivityIndicator 
                    style={styles.usernameIndicator} 
                    color={colors.textSecondary}
                  />
                )}
                {isUsernameValid && !isCheckingUsername && (
                  <MaterialIcons 
                    name="check-circle" 
                    size={24} 
                    color={colors.success}
                    style={styles.usernameIndicator}
                  />
                )}
              </View>
              {usernameError && (
                <Text style={[styles.errorText, { color: colors.error }]}>
                  {usernameError}
                </Text>
              )}

              <TextInput
                style={[
                  styles.input,
                  styles.bioInput,
                  { 
                    color: colors.textPrimary,
                    borderColor: colors.border,
                    backgroundColor: colors.surface
                  }
                ]}
                placeholder="Bio (optional)"
                placeholderTextColor={colors.textSecondary}
                value={profile.bio}
                onChangeText={(text) => onChange({ ...profile, bio: text })}
                multiline
                numberOfLines={3}
              />
            </View>
            <DatePicker
              date={profile.birthDate}
              onDateChange={(date: Date) => {
                onChange({ ...profile, birthDate: date });
              }}
              maxDate={new Date()}
              minDate={new Date(1900, 0, 1)}
              label="Birth Date"
            />
          </MotiView>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    padding: 20,
  },
  content: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 32,
    textAlign: 'center',
  },
  photoContainer: {
    marginBottom: 32,
  },
  photoButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  profilePhoto: {
    width: '100%',
    height: '100%',
  },
  photoText: {
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
  },
  inputContainer: {
    width: '100%',
    gap: 16,
    marginBottom: 24,
  },
  usernameContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  usernameIndicator: {
    position: 'absolute',
    right: 16,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  input: {
    width: '100%',
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingRight: 48, // Make room for the indicator
    fontSize: 16,
  },
  bioInput: {
    height: 100,
    paddingTop: 12,
    paddingBottom: 12,
    textAlignVertical: 'top',
  },
  dateButton: {
    width: '100%',
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateButtonText: {
    fontSize: 16,
  },
}); 