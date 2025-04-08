import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { ActivityIndicator, View, Platform } from "react-native";
import { onAuthStateChanged, User as FirebaseUser, signOut as firebaseSignOut, signInWithEmailAndPassword } from "firebase/auth";
import { doc, onSnapshot, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/backend/config/firebase";
import { userService } from "@/backend/services/userService";
import { UserData, UserType } from "@/backend/types/UserData";
import { router } from "expo-router";
import { routineService } from "@/backend/services/routineServices";
import logger from '@/utils/logger';
import { registrationService } from "@/backend/services/registrationService";
import { notificationService } from "@/backend/services/notificationService";
import { useQueryClient } from "@tanstack/react-query";
import { incompleteUser } from "@/backend/types/User";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authValidation } from "@/utils/authValidation";
import { useRegistration } from "@/hooks/auth/useRegistration";

// Define the extended User type that includes userData
interface AuthUser {
  uid: string;
  userData: UserData | null;
}

// Define AuthContextType with the new AuthUser type
interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isInitialized: boolean;
  signOut: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<FirebaseUser>;
  refreshUserData: (userId: string) => Promise<UserData | null>;
}

// Create the context with proper typing
const AuthContext = createContext<AuthContextType | null>(null);

// Loading spinner component
const LoadingSpinner = () => (
  <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
    <ActivityIndicator size="large" />
  </View>
);

interface AuthProviderProps {
  children: React.ReactNode;
}

const AUTH_KEY = 'auth_user_data';

// Add type for navigation paths
type NavigationPath = "/onboarding" | "/(tabs)/dashboard" | "/sign-in" | "/register" | null;

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [pendingNavigation, setPendingNavigation] = useState<NavigationPath>(null);
  const [unsubscribeUserData, setUnsubscribeUserData] = useState<(() => void) | null>(null);
  const [unsubscribeNotifications, setUnsubscribeNotifications] = useState<(() => void) | null>(null);
  const queryClient = useQueryClient();

  // Get registration methods
  const setRegistrationData = useRegistration((state) => state.setRegistrationData);

  // Memoize the function to update user data in both context and React Query
  const updateUserDataState = useCallback((newUserData: UserData, userId: string) => {
    setUserData(newUserData);
    setUser(prev => prev ? {
      ...prev,
      userData: newUserData
    } : {
      uid: userId,
      userData: newUserData
    });
    
    // Update React Query cache
    queryClient.setQueryData(["userData", userId], newUserData);
  }, [queryClient]);

  // Setup Firestore listener with retry mechanism
  const setupUserDataListener = useCallback(async (userId: string, retries = 3) => {
    try {
      // Check if we have a valid auth state
      const currentUser = auth.currentUser;
      if (!currentUser) {
        logger.warn('Attempting to setup listener without auth');
        return;
      }

      if (unsubscribeUserData) {
        unsubscribeUserData();
      }

      const userRef = doc(db, "users", userId);
      
      // First get the initial data
      const initialDoc = await getDoc(userRef);
      if (initialDoc.exists()) {
        const initialData = initialDoc.data() as UserData;
        updateUserDataState(initialData, userId);
      }

      // Then set up the real-time listener
      const unsubUserData = onSnapshot(
        userRef,
        {
          next: (doc) => {
            if (doc.exists()) {
              const newUserData = doc.data() as UserData;
              updateUserDataState(newUserData, userId);
            }
          },
          error: async (error) => {
            logger.error('User data listener error:', error);
            if (error.code === 'permission-denied' && retries > 0) {
              // Wait for a short delay and retry
              await new Promise(resolve => setTimeout(resolve, 1000));
              setupUserDataListener(userId, retries - 1);
            }
          }
        }
      );
      
      setUnsubscribeUserData(() => unsubUserData);
    } catch (error) {
      logger.error('Error setting up user data listener:', error);
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setupUserDataListener(userId, retries - 1);
      }
    }
  }, [unsubscribeUserData, updateUserDataState]);

  // Handle auth state changes
  useEffect(() => {
    let unsubscribeAuth: (() => void) | null = null;

    const setupAuth = async () => {
      unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
        try {
          if (firebaseUser) {
            // Immediately set basic user state
            setUser({
              uid: firebaseUser.uid,
              userData: null
            });

            // Get initial user data
            const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
            
            if (userDoc.exists()) {
              const userData = userDoc.data() as UserData;
              
              // Update both context and React Query cache
              updateUserDataState(userData, firebaseUser.uid);
              
              // Set up real-time listener only after we have initial data
              await setupUserDataListener(firebaseUser.uid);
              
              // Set up notifications listener
              if (unsubscribeNotifications) {
                unsubscribeNotifications();
              }
              const unsubNotifications = notificationService.subscribeToUnreadCount(firebaseUser.uid);
              setUnsubscribeNotifications(() => unsubNotifications);

              // Navigate to dashboard if not already there
              if (router.canGoBack()) {
                router.replace("/(tabs)/dashboard");
              }
            } else {
              // Handle incomplete user registration
              const incompleteUser = await registrationService.get(firebaseUser.uid);
              if (incompleteUser?.onboardingComplete === false) {
                const registrationData = {
                  email: incompleteUser.email,
                  userId: firebaseUser.uid,
                  onboardingStarted: true,
                  onboardingStep: incompleteUser.onboardingStep || 1
                };
                setRegistrationData(registrationData);
                queryClient.setQueryData(['registrationData'], registrationData);
                router.replace("/onboarding");
              } else {
                // No user data and not in onboarding - sign out
                await signOut();
              }
            }
          } else {
            // User is signed out
            setUser(null);
            setUserData(null);
            queryClient.clear(); // Clear all React Query cache on sign out
            router.replace("/sign-in");
          }
          
          setIsInitialized(true);
          setIsLoading(false);
        } catch (error) {
          logger.error('Error in auth state change:', error);
          setIsInitialized(true);
          setIsLoading(false);
          // On error, clear state and redirect to sign in
          setUser(null);
          setUserData(null);
          queryClient.clear();
          router.replace("/sign-in");
        }
      });
    };

    setupAuth();
    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
      if (unsubscribeUserData) unsubscribeUserData();
      if (unsubscribeNotifications) unsubscribeNotifications();
    };
  }, [setupUserDataListener, updateUserDataState]);

  const signOut = async () => {
    try {
      setIsLoading(true);
      
      // Clear all listeners first
      if (unsubscribeUserData) {
        unsubscribeUserData();
        setUnsubscribeUserData(null);
      }
      if (unsubscribeNotifications) {
        unsubscribeNotifications();
        setUnsubscribeNotifications(null);
      }

      // Clear user data first
      setUser(null);
      setUserData(null);
      queryClient.clear();
      
      // Clear storage
      await Promise.all([
        AsyncStorage.removeItem(AUTH_KEY),
        authValidation.resetSignInAttempts()
      ]);

      // Finally, sign out from Firebase
      await firebaseSignOut(auth);
      
      // Navigate after everything is cleared
      router.replace("/sign-in");
    } catch (error) {
      logger.error('Error signing out:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Immediately set basic user state
      setUser({
        uid: userCredential.user.uid,
        userData: null
      });

      // Get user data
      const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserData;
        updateUserDataState(userData, userCredential.user.uid);
      } else {
        // Check if user is in incomplete registration
        const incompleteUser = await registrationService.get(userCredential.user.uid);
        if (incompleteUser?.onboardingComplete === false) {
          const registrationData = {
            email: incompleteUser.email,
            userId: userCredential.user.uid,
            onboardingStarted: true,
            onboardingStep: incompleteUser.onboardingStep || 1
          };
          setRegistrationData(registrationData);
          queryClient.setQueryData(['registrationData'], registrationData);
          router.replace("/onboarding");
          return userCredential.user;
        }
      }

      // Set up listeners after successful sign in
      await setupUserDataListener(userCredential.user.uid);
      
      // Navigate to dashboard on successful sign in
      router.replace("/(tabs)/dashboard");
      
      return userCredential.user;
    } catch (error) {
      logger.error('Sign in error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUserData = async (userId: string) => {
    try {
      const userDoc = await getDoc(doc(db, "users", userId));
      if (userDoc.exists()) {
        const newUserData = userDoc.data() as UserData;
        
        // Update React Query cache
        queryClient.setQueryData(["userData", userId], newUserData);
        
        // Update auth context state
        setUserData(newUserData);
        setUser(prev => {
          if (!prev) return null;
          return {
            ...prev,
            userData: newUserData
          };
        });

        return newUserData;
      }
      return null;
    } catch (error) {
      console.error('Error refreshing user data:', error);
      throw error;
    }
  };

  const contextValue = useMemo(
    () => ({
      user,
      isLoading,
      isInitialized,
      signOut,
      signIn,
      refreshUserData,
    }),
    [user, isLoading, isInitialized]
  );

  if (!isInitialized) {
    return <LoadingSpinner />;
  }

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// After successful login/initialization
const initializeUserData = async (user: FirebaseUser & { userData?: UserData | null }) => {
  try {
    // ... other initialization
    await routineService.getUserRoutines(user.uid); // This will refresh cache
  } catch (error) {
    logger.error('Error initializing user data:', error);
  }
};