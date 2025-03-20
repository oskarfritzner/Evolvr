import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useMutation } from "@tanstack/react-query";
import Toast from "react-native-toast-message";
import { auth } from "@/backend/config/firebase";
import { registrationService } from "@/backend/services/registrationService";
import { authValidation } from "@/utils/authValidation";
import { FirebaseError } from "firebase/app";
import logger from "@/utils/logger";
import { useRegistration } from "@/hooks/auth/useRegistration";
import { router } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";

interface SignInParams {
  email: string;
  password: string;
}

export function useSignIn() {
  const { signIn } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const setRegistrationData = useRegistration(
    (state) => state.setRegistrationData
  );
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: async ({ email, password }: SignInParams) => {
      setLoading(true);

      try {
        // Validate inputs
        if (!authValidation.validateEmail(email)) {
          throw new Error("Please enter a valid email address");
        }

        // Check rate limiting
        const throttleCheck = await authValidation.checkSignInThrottle();
        if (!throttleCheck.canProceed) {
          throw new Error(
            `Too many attempts. Please try again in ${throttleCheck.timeRemaining} seconds`
          );
        }

        // Attempt sign in
        const userCredential = await signInWithEmailAndPassword(
          auth,
          email,
          password
        );

        // Reset sign-in attempts on successful login
        await authValidation.resetSignInAttempts();

        // Store auth token if needed
        const token = await userCredential.user.getIdToken();
        await AsyncStorage.setItem("authToken", token);

        // Check for incomplete registration
        const incompleteUser = await registrationService.get(
          userCredential.user.uid
        );

        if (incompleteUser && !incompleteUser.onboardingComplete) {
          // Set registration data for onboarding
          setRegistrationData({
            email,
            userId: userCredential.user.uid,
            onboardingStarted: true,
            onboardingStep: incompleteUser.onboardingStep || 1,
          });

          // Navigate to onboarding
          router.replace("/onboarding");
        } else {
          // Navigate to dashboard
          router.replace("/(tabs)/dashboard");
        }

        return { userCredential, incompleteUser };
      } catch (err) {
        await authValidation.incrementSignInAttempts();

        let errorMessage: string;
        let errorTitle: string;

        if (err instanceof FirebaseError) {
          errorMessage = authValidation.getFirebaseErrorMessage(err);

          // Set specific error titles based on error type
          switch (err.code) {
            case "auth/user-not-found":
              errorTitle = "Account Not Found";
              break;
            case "auth/wrong-password":
              errorTitle = "Incorrect Password";
              break;
            case "auth/invalid-credential":
              errorTitle = "Invalid Credentials";
              break;
            case "auth/too-many-requests":
              errorTitle = "Account Locked";
              break;
            case "auth/network-request-failed":
              errorTitle = "Network Error";
              break;
            default:
              errorTitle = "Sign In Failed";
          }
        } else if (err instanceof Error) {
          errorMessage = err.message;
          errorTitle = "Sign In Failed";
        } else {
          errorMessage = "An unexpected error occurred. Please try again.";
          errorTitle = "Error";
        }

        logger.error("Sign in error:", { error: err, email });
        setError(errorMessage);

        // Show toast with more detailed error information
        Toast.show({
          type: "error",
          text1: errorTitle,
          text2: errorMessage,
          visibilityTime: 4000, // Show for 4 seconds
          autoHide: true,
          topOffset: 30,
          bottomOffset: 40,
        });

        throw err;
      } finally {
        setLoading(false);
      }
    },
    onSuccess: async ({ userCredential, incompleteUser }) => {
      if (incompleteUser && !incompleteUser.onboardingComplete) {
        Toast.show({
          type: "info",
          text1: "Welcome back!",
          text2: "Please complete your registration",
          visibilityTime: 3000,
        });
      } else {
        Toast.show({
          type: "success",
          text1: "Welcome back!",
          text2: "Successfully signed in",
          visibilityTime: 3000,
        });
      }
    },
    onError: () => {}, // Error handling moved to catch block for better control
  });

  return {
    signIn: mutation.mutate,
    isLoading: mutation.isPending,
    error,
    clearError: () => setError(null),
    loading,
  };
}
