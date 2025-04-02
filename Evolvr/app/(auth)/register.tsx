import React, { useState, useEffect } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native"
import { useTheme } from "@/context/ThemeContext"
import { createUserWithEmailAndPassword, fetchSignInMethodsForEmail } from "firebase/auth"
import { useRouter } from "expo-router"
import { FontAwesome } from "@expo/vector-icons"
import Toast from 'react-native-toast-message'
import { useRegistration } from "@/hooks/auth/useRegistration"
import { registrationService } from "@/backend/services/registrationService"
import { auth } from "@/backend/config/firebase"
import { authValidation } from "@/utils/authValidation"

interface SignUpData {
  email: string
  password: string
}

interface PasswordStrength {
  score: number;
  strengthLabel: string;
  color: string;
  errors: string[];
}

const MAX_WIDTH = 400; // Define maximum width constant

export default function Register() {
  const { colors } = useTheme()
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    score: 0,
    strengthLabel: 'Very Weak',
    color: '#FF4444',
    errors: []
  })
  const { setRegistrationData } = useRegistration()

  useEffect(() => {
    if (password) {
      const validation = authValidation.validatePassword(password);
      setPasswordStrength({
        score: validation.score,
        strengthLabel: validation.strengthLabel,
        color: validation.color,
        errors: validation.errors
      });
    } else {
      setPasswordStrength({
        score: 0,
        strengthLabel: 'Very Weak',
        color: '#FF4444',
        errors: []
      });
    }
  }, [password]);

  const handleRegister = async () => {
    if (!email || !password) {
      Toast.show({
        type: 'error',
        text1: 'Missing Fields',
        text2: 'Please fill in all required fields',
      });
      return;
    }

    // Validate email
    if (!authValidation.validateEmail(email)) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Email',
        text2: 'Please enter a valid email address',
      });
      return;
    }

    // Validate password
    const passwordValidation = authValidation.validatePassword(password);
    if (!passwordValidation.isValid) {
      Toast.show({
        type: 'error',
        text1: 'Weak Password',
        text2: passwordValidation.errors[0],
      });
      return;
    }

    setLoading(true);
    try {
      // Check if email already exists
      const signInMethods = await fetchSignInMethodsForEmail(auth, email);
      if (signInMethods.length > 0) {
        Toast.show({
          type: 'error',
          text1: 'Email Already Exists',
          text2: 'Please use a different email or sign in',
        });
        setLoading(false);
        return;
      }

      // Create the auth user first to check if it's possible
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Create half user entry
        await registrationService.create(userCredential.user.uid, {
          email,
          authMethod: 'email',
        });

        setRegistrationData({ 
          email, 
          password,
          userId: userCredential.user.uid,
          onboardingStarted: true 
        });
        
        router.replace("/onboarding");
      } catch (authError: any) {
        if (authError.code === 'auth/email-already-in-use') {
          Toast.show({
            type: 'error',
            text1: 'Email Already in Use',
            text2: 'Please use a different email or sign in',
          });
          setLoading(false);
          return;
        }
        throw authError;
      }
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Registration Error',
        text2: error.message || 'An error occurred during registration',
      });
      console.error('Registration error:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleGoogleSignUp = async () => {
    Toast.show({
      type: 'info',
      text1: 'Development Mode',
      text2: 'Google Sign Up is disabled during development',
    });
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#FFFFFF',
    },
    gradient: {
      flex: 1,
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
    },
    content: {
      flex: 1,
      justifyContent: "center",
      padding: 20,
      width: '100%',
      maxWidth: MAX_WIDTH,
    },
    title: {
      fontSize: 32,
      fontWeight: "bold",
      color: '#000000',
      marginBottom: 30,
      textAlign: "center",
    },
    input: {
      backgroundColor: '#F5F5F5',
      padding: 15,
      borderRadius: 10,
      marginBottom: 15,
      fontSize: 16,
      color: '#000000',
    },
    button: {
      backgroundColor: colors.secondary,
      padding: 15,
      borderRadius: 10,
      alignItems: "center",
      marginTop: 10,
    },
    buttonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: "600",
    },
    googleButton: {
      backgroundColor: '#4285F4',
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 10,
    },
    loginContainer: {
      flexDirection: "row",
      justifyContent: "center",
      marginTop: 20,
    },
    loginText: {
      color: '#666666',
    },
    loginButton: {
      marginLeft: 5,
    },
    loginButtonText: {
      color: colors.secondary,
      fontWeight: "600",
    },
    errorText: {
      color: colors.error,
      textAlign: "center",
      marginBottom: 15,
    },
    dividerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 20,
    },
    divider: {
      flex: 1,
      height: 1,
      backgroundColor: colors.textSecondary,
    },
    dividerText: {
      color: colors.textSecondary,
      paddingHorizontal: 10,
    },
    passwordStrengthContainer: {
      marginBottom: 15,
    },
    strengthMeter: {
      height: 4,
      backgroundColor: colors.surface,
      borderRadius: 2,
      marginTop: 8,
      marginBottom: 8,
      overflow: 'hidden',
    },
    strengthIndicator: {
      height: '100%',
      borderRadius: 2,
    },
    strengthLabel: {
      fontSize: 12,
      marginBottom: 4,
    },
    errorList: {
      marginTop: 4,
    },
    errorItem: {
      color: colors.error,
      fontSize: 12,
      marginBottom: 2,
    },
  })

  return (
    <View style={styles.container}>
      <View style={styles.gradient}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.content}
        >
          <Text style={styles.title}>Create Account</Text>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {/* Password Strength Indicator - Only show when password exists */}
          {password.length > 0 && (
            <View style={styles.passwordStrengthContainer}>
              <Text style={[styles.strengthLabel, { color: passwordStrength.color }]}>
                Password Strength: {passwordStrength.strengthLabel}
              </Text>
              <View style={styles.strengthMeter}>
                <View 
                  style={[
                    styles.strengthIndicator,
                    {
                      backgroundColor: passwordStrength.color,
                      width: `${(passwordStrength.score / 4) * 100}%`,
                    }
                  ]} 
                />
              </View>
              {passwordStrength.errors.length > 0 && (
                <View style={styles.errorList}>
                  {passwordStrength.errors.map((error, index) => (
                    <Text key={index} style={styles.errorItem}>
                      • {error}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}

          <TouchableOpacity 
            style={[
              styles.button,
              { opacity: passwordStrength.score < 2 ? 0.5 : 1 }
            ]}
            onPress={handleRegister}
            disabled={loading || passwordStrength.score < 2}
          >
            {loading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={styles.buttonText}>Register</Text>
            )}
          </TouchableOpacity>

          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.divider} />
          </View>

          <TouchableOpacity 
            style={[styles.button, styles.googleButton, { opacity: 0.5 }]}
            disabled={true}
          >
            <FontAwesome name="google" size={24} color={colors.primary} />
            <Text style={[styles.buttonText, { color: '#666666' }]}>
              Google Sign Up (Disabled)
            </Text>
          </TouchableOpacity>

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account?</Text>
            <TouchableOpacity 
              style={styles.loginButton}
              onPress={() => router.push("/sign-in")}
            >
              <Text style={styles.loginButtonText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </View>
  )
} 