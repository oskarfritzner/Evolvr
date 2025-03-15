import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import Toast from "react-native-toast-message";
import { auth } from "@/backend/config/firebase";

export function useSignIn() {
  const { signIn } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async ({
      email,
      password,
    }: {
      email: string;
      password: string;
    }) => {
      try {
        await signIn(email, password);
        router.replace("/dashboard");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to sign in");
        throw err;
      }
    },
    onSuccess: () => {
      Toast.show({
        type: "success",
        text1: "Welcome back!",
        text2: "Successfully signed in",
      });
      // Wait for auth state to be updated
      setTimeout(() => {
        if (auth.currentUser) {
          router.replace("/dashboard");
        }
      }, 1000);
    },
    onError: (error: Error) => {
      Toast.show({
        type: "error",
        text1: "Sign In Failed",
        text2: error.message,
      });
    },
  });

  return {
    signIn: mutation.mutate,
    isLoading: mutation.isPending,
    error,
    clearError: () => setError(null),
  };
}
