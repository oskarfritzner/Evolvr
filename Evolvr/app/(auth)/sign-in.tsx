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
  Alert,
} from "react-native"
import { useTheme } from "@/context/ThemeContext"
import { useRouter } from "expo-router"
import { FontAwesome } from "@expo/vector-icons"
import Toast from 'react-native-toast-message'
import { useSignIn } from "@/hooks/auth/useSignIn"
import { useRegistration } from "@/hooks/auth/useRegistration"
import { auth } from "@/backend/config/firebase"
import { authValidation } from '@/utils/authValidation'
import AsyncStorage from "@react-native-async-storage/async-storage"
import { sendPasswordResetEmail } from "firebase/auth"

const MAX_WIDTH = 400; // Define maximum width constant

interface SignInParams {
  email: string;
  password: string;
}

export default function SignIn() {
  const { colors } = useTheme()
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const signInMutation = useSignIn()
  const { setRegistrationData } = useRegistration()
  const [rememberMe, setRememberMe] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetEmail, setResetEmail] = useState("")
  const [errors, setErrors] = useState({
    email: "",
    password: "",
    general: ""
  })

  useEffect(() => {
    // Load remembered email if exists
    AsyncStorage.getItem("rememberedEmail").then((savedEmail) => {
      if (savedEmail) {
        setEmail(savedEmail)
        setRememberMe(true)
      }
    })
  }, [])

  // Clear errors when input changes
  const handleEmailChange = (text: string) => {
    setEmail(text)
    setErrors(prev => ({ ...prev, email: "", general: "" }))
  }

  const handlePasswordChange = (text: string) => {
    setPassword(text)
    setErrors(prev => ({ ...prev, password: "", general: "" }))
  }

  const validateForm = () => {
    let isValid = true
    const newErrors = { email: "", password: "", general: "" }

    // Email validation
    if (!email.trim()) {
      newErrors.email = "Email is required"
      isValid = false
    } else if (!authValidation.validateEmail(email)) {
      newErrors.email = "Please enter a valid email address"
      isValid = false
    }

    // Password validation
    if (!password.trim()) {
      newErrors.password = "Password is required"
      isValid = false
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters"
      isValid = false
    }

    setErrors(newErrors)
    return isValid
  }

  const handleSignIn = async () => {
    if (!validateForm()) return

    const throttleCheck = await authValidation.checkSignInThrottle()
    if (!throttleCheck.canProceed) {
      setErrors(prev => ({
        ...prev,
        general: `Too many attempts. Please try again in ${throttleCheck.timeRemaining} seconds`
      }))
      return
    }

    try {
      await signInMutation.signIn({ email, password })
      
      if (rememberMe) {
        await AsyncStorage.setItem("rememberedEmail", email)
      } else {
        await AsyncStorage.removeItem("rememberedEmail")
      }
    } catch (error: any) {
      // Handle specific Firebase auth errors
      if (error.code === 'auth/user-not-found') {
        setErrors(prev => ({ ...prev, email: "No account found with this email" }))
      } else if (error.code === 'auth/wrong-password') {
        setErrors(prev => ({ ...prev, password: "Incorrect password" }))
      } else if (error.code === 'auth/invalid-email') {
        setErrors(prev => ({ ...prev, email: "Invalid email format" }))
      } else {
        setErrors(prev => ({ ...prev, general: error.message || "Sign in failed" }))
      }
      await authValidation.incrementSignInAttempts()
    }
  }

  const handleGoogleSignUp = async () => {
    Toast.show({
      type: 'info',
      text1: 'Development Mode',
      text2: 'Google Sign In is disabled during development',
    });
  };

  const handlePasswordReset = async () => {
    if (!authValidation.validateEmail(resetEmail)) {
      Toast.show({
        type: "error",
        text1: "Please enter a valid email address",
      })
      return
    }

    try {
      await sendPasswordResetEmail(auth, resetEmail)
      Toast.show({
        type: "success",
        text1: "Password reset email sent",
        text2: "Please check your email",
      })
      setShowResetModal(false)
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Failed to send reset email",
        text2: error.message,
      })
    }
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
    inputContainer: {
      marginBottom: 15,
    },
    input: {
      backgroundColor: '#F5F5F5',
      padding: 15,
      borderRadius: 10,
      fontSize: 16,
      color: '#000000',
      borderWidth: 1,
      borderColor: 'transparent',
    },
    inputError: {
      borderColor: colors.error,
    },
    errorText: {
      color: colors.error,
      fontSize: 12,
      marginTop: 4,
      marginLeft: 4,
    },
    generalError: {
      color: colors.error,
      textAlign: "center",
      marginBottom: 15,
      fontSize: 14,
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
    registerContainer: {
      flexDirection: "row",
      justifyContent: "center",
      marginTop: 20,
    },
    registerText: {
      color: '#666666',
    },
    registerButton: {
      marginLeft: 5,
    },
    registerButtonText: {
      color: colors.secondary,
      fontWeight: "600",
    },
    googleButton: {
      backgroundColor: '#4285F4',
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 10,
    },
    rememberMeContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 15,
    },
    checkbox: {
      width: 20,
      height: 20,
      borderWidth: 2,
      borderColor: colors.primary,
      borderRadius: 4,
      marginRight: 8,
      justifyContent: "center",
      alignItems: "center",
    },
    checkboxInner: {
      width: 12,
      height: 12,
      borderRadius: 2,
    },
    checkboxChecked: {
      backgroundColor: colors.primary,
    },
    rememberMeText: {
      fontSize: 14,
      color: '#000000',
    },
    forgotPassword: {
      marginTop: 15,
      alignItems: "center",
    },
    forgotPasswordText: {
      color: colors.secondary,
      fontSize: 14,
    },
    modalContainer: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    modalContent: {
      backgroundColor: colors.surface,
      padding: 24,
      borderRadius: 16,
      width: "90%",
      maxWidth: 400,
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    modalTitle: {
      fontSize: 24,
      fontWeight: "700",
      marginBottom: 20,
      textAlign: "center",
      color: colors.textPrimary,
    },
    modalButtons: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 20,
      gap: 12,
    },
    modalButton: {
      flex: 1,
      padding: 15,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    modalButtonPrimary: {
      backgroundColor: colors.secondary,
    },
    modalButtonSecondary: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.textSecondary,
    },
    modalButtonTextPrimary: {
      color: colors.primary,
    },
  })

  return (
    <View style={styles.container}>
      <View style={styles.gradient}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.content}
        >
          <Text style={styles.title}>Welcome Back</Text>

          {errors.general ? (
            <Text style={styles.generalError}>{errors.general}</Text>
          ) : null}

          <View style={styles.inputContainer}>
            <TextInput
              style={[
                styles.input,
                errors.email && styles.inputError
              ]}
              placeholder="Email"
              placeholderTextColor={colors.textSecondary}
              value={email}
              onChangeText={handleEmailChange}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!signInMutation.isLoading}
            />
            {errors.email ? (
              <Text style={styles.errorText}>{errors.email}</Text>
            ) : null}
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={[
                styles.input,
                errors.password && styles.inputError
              ]}
              placeholder="Password"
              placeholderTextColor={colors.textSecondary}
              value={password}
              onChangeText={handlePasswordChange}
              secureTextEntry
              editable={!signInMutation.isLoading}
            />
            {errors.password ? (
              <Text style={styles.errorText}>{errors.password}</Text>
            ) : null}
          </View>

          <View style={styles.rememberMeContainer}>
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => setRememberMe(!rememberMe)}
            >
              <View style={[styles.checkboxInner, rememberMe && styles.checkboxChecked]} />
            </TouchableOpacity>
            <Text style={styles.rememberMeText}>Remember me</Text>
          </View>

          <TouchableOpacity 
            style={[
              styles.button,
              signInMutation.isLoading && { opacity: 0.7 }
            ]}
            onPress={handleSignIn}
            disabled={signInMutation.isLoading}
          >
            {signInMutation.isLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.googleButton]}
            onPress={handleGoogleSignUp}
            disabled={signInMutation.isLoading}
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
              disabled={signInMutation.isLoading}
            >
              <Text style={styles.registerButtonText}>Register</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.forgotPassword}
            onPress={() => setShowResetModal(true)}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Password Reset Modal */}
          {showResetModal && (
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Reset Password</Text>
                <TextInput
                  style={[styles.input, { marginBottom: 20 }]}
                  placeholder="Enter your email"
                  placeholderTextColor={colors.textSecondary}
                  value={resetEmail}
                  onChangeText={setResetEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonSecondary]}
                    onPress={() => setShowResetModal(false)}
                  >
                    <Text style={styles.modalButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonPrimary]}
                    onPress={handlePasswordReset}
                  >
                    <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>
                      Reset
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </KeyboardAvoidingView>
      </View>
    </View>
  )
} 