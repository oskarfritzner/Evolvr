import React, { useState } from "react"
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
import { LinearGradient } from "expo-linear-gradient"
import { FontAwesome } from "@expo/vector-icons"
import Toast from 'react-native-toast-message'
import { useRegistration } from "@/hooks/auth/useRegistration"
import { registrationService } from "@/backend/services/registrationService"
import { auth } from "@/backend/config/firebase"

interface SignUpData {
  email: string
  password: string
}

const MAX_WIDTH = 400; // Define maximum width constant

export default function Register() {
  const { colors } = useTheme()
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { setRegistrationData } = useRegistration()

  const handleRegister = async () => {
    if (!email || !password) {
      Toast.show({
        type: 'error',
        text1: 'Missing Fields',
        text2: 'Please fill in all required fields',
      });
      return;
    }

    if (password.length < 6) {
      Toast.show({
        type: 'error',
        text1: 'Weak Password',
        text2: 'Password must be at least 6 characters long',
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
      backgroundColor: colors.background,
    },
    gradient: {
      flex: 1,
      alignItems: 'center', // Center content horizontally
    },
    content: {
      flex: 1,
      justifyContent: "center",
      padding: 20,
      width: '100%', // Take full width
      maxWidth: MAX_WIDTH, // Add maximum width
    },
    title: {
      fontSize: 32,
      fontWeight: "bold",
      color: colors.textPrimary,
      marginBottom: 30,
      textAlign: "center",
    },
    input: {
      backgroundColor: colors.surface,
      padding: 15,
      borderRadius: 10,
      marginBottom: 15,
      fontSize: 16,
      color: colors.textPrimary,
    },
    button: {
      backgroundColor: colors.secondary,
      padding: 15,
      borderRadius: 10,
      alignItems: "center",
      marginTop: 10,
    },
    buttonText: {
      color: colors.primary,
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
      color: colors.textSecondary,
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
  })

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.secondary, colors.primary]}
        style={styles.gradient}
      >
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

          <TouchableOpacity 
            style={styles.button}
            onPress={handleRegister}
            disabled={loading}
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
            style={[styles.button, styles.googleButton]}
            onPress={handleGoogleSignUp}
            disabled={loading}
          >
            <FontAwesome name="google" size={24} color={colors.primary} />
            <Text style={[styles.buttonText, { opacity: 0.7 }]}>
              Sign up with Google (Disabled in Dev)
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
      </LinearGradient>
    </View>
  )
} 