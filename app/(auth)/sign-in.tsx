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
  Alert,
} from "react-native"
import { useTheme } from "@/context/ThemeContext"
import { signInWithEmailAndPassword } from "firebase/auth"
import { useRouter } from "expo-router"
import { LinearGradient } from "expo-linear-gradient"
import { FontAwesome } from "@expo/vector-icons"
import { useAuth } from '@/context/AuthContext'
import Toast from 'react-native-toast-message'
import { useSignIn } from "@/hooks/auth/useSignIn"
import { useRegistration } from "@/hooks/auth/useRegistration"
import { registrationService } from "@/backend/services/registrationService"
import { auth } from "@/backend/config/firebase"

const MAX_WIDTH = 400; // Define maximum width constant

export default function SignIn() {
  const { colors } = useTheme()
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { signIn: authSignIn } = useAuth()
  const signInMutation = useSignIn()
  const { setRegistrationData } = useRegistration()

  const handleSignIn = async () => {
    if (!email || !password) {
      Toast.show({
        type: 'error',
        text1: 'Missing Fields',
        text2: 'Please enter both email and password',
      });
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Check for incomplete registration
      const incompleteUser = await registrationService.get(userCredential.user.uid);
      if (incompleteUser) {
        // Set registration data and redirect to onboarding
        setRegistrationData({
          email: userCredential.user.email || '',
          userId: userCredential.user.uid,
          onboardingStarted: true
        });
        router.replace("/onboarding");
        return;
      }

      router.replace("/(tabs)/dashboard");
    } catch (error) {
      console.error('Sign in error:', error);
      Toast.show({
        type: 'error',
        text1: 'Sign In Failed',
        text2: 'Please check your email and password',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    Toast.show({
      type: 'info',
      text1: 'Development Mode',
      text2: 'Google Sign In is disabled during development',
    });
  };

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
    registerContainer: {
      flexDirection: "row",
      justifyContent: "center",
      marginTop: 20,
    },
    registerText: {
      color: colors.textSecondary,
    },
    registerButton: {
      marginLeft: 5,
    },
    registerButtonText: {
      color: colors.secondary,
      fontWeight: "600",
    },
    errorText: {
      color: colors.error,
      textAlign: "center",
      marginBottom: 15,
    },
    googleButton: {
      backgroundColor: '#4285F4',
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 10,
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
          <Text style={styles.title}>Welcome Back</Text>

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
            onPress={handleSignIn}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.googleButton]}
            onPress={handleGoogleSignUp}
            disabled={loading}
          >
            <FontAwesome name="google" size={24} color={colors.primary} />
            <Text style={[styles.buttonText, { opacity: 0.7 }]}>
              Sign in with Google (Disabled in Dev)
            </Text>
          </TouchableOpacity>

          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Don't have an account?</Text>
            <TouchableOpacity 
              style={styles.registerButton}
              onPress={() => router.push("/(auth)/register")}
            >
              <Text style={styles.registerButtonText}>Register</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </View>
  )
} 