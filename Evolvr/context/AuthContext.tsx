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

  // Setup Firestore listener with retry mechanism and delay
  const setupUserDataListener = useCallback(async (userId: string, retries = 3, delay = 1000) => {
    try {
      // Check if we have a valid auth state
      const currentUser = auth.currentUser;
      if (!currentUser) {
        logger.warn('Attempting to setup listener without auth');
        return;
      }

      // Add initial delay to ensure token propagation
      await new Promise(resolve => setTimeout(resolve, delay));

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

      // Then set up the real-time listener with exponential backoff on error
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
              // Wait with exponential backoff and retry
              const backoffDelay = Math.min(delay * 2, 10000); // Max 10 seconds
              await new Promise(resolve => setTimeout(resolve, backoffDelay));
              setupUserDataListener(userId, retries - 1, backoffDelay);
            } else if (retries <= 0) {
              logger.warn('Maximum retry attempts reached for user data listener');
              // Consider notifying the user or implementing fallback behavior
            } else {
              logger.error(`Unhandled listener error: ${error.code}`);
            }
          }
        }
      );
      
      setUnsubscribeUserData(() => unsubUserData);
    } catch (error) {
      logger.error('Error setting up user data listener:', error);
      if (retries > 0) {
        const backoffDelay = Math.min(delay * 2, 10000); // Max 10 seconds
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
        setupUserDataListener(userId, retries - 1, backoffDelay);
      } else {
        logger.warn('Maximum retry attempts reached while setting up listener');
        // Consider implementing fallback behavior here
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
              
              // Add debouncing for notification updates
              if (unsubscribeNotifications) {
                unsubscribeNotifications();
              }
              const unsubNotifications = notificationService.subscribeToUnreadCount(
                firebaseUser.uid,
                // Add debounce time to prevent rapid updates
                { debounceTime: 1000 }
              );
              setUnsubscribeNotifications(() => unsubNotifications);

              // Only redirect to dashboard on initial auth or when coming from auth screens
              // This prevents the constant redirects during normal navigation
              const isFromAuthOrInitial = !router.canGoBack() || pendingNavigation === "/(tabs)/dashboard";
              
              if (isFromAuthOrInitial) {
                // Wrap navigation in a microtask to ensure root layout is mounted
                setTimeout(() => {
                  router.replace("/(tabs)/dashboard");
                }, 0);
              }
              // Reset pending navigation after use
              if (pendingNavigation) {
                setPendingNavigation(null);
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
                setTimeout(() => {
                  router.replace("/onboarding");
                }, 0);
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
            setTimeout(() => {
              router.replace("/sign-in");
            }, 0);
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
          setTimeout(() => {
            router.replace("/sign-in");
          }, 0);
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
      
      // Use a more reliable navigation approach
      if (router.canGoBack()) {
        router.replace("/sign-in");
      } else {
        // If we can't go back, we're likely at the root
        // Use a small delay to ensure layout is mounted
        requestAnimationFrame(() => {
          router.replace("/sign-in");
        });
      }
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
      
      // Add a delay before setting up listeners to ensure token propagation
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get user data
      const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserData;
        updateUserDataState(userData, userCredential.user.uid);
        
        // Set up listeners after delay
        await setupUserDataListener(userCredential.user.uid);
        
        // Navigate to dashboard on successful sign in - use setTimeout to prevent timing issues
        setTimeout(() => {
          router.replace("/(tabs)/dashboard");
        }, 0);
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
          setTimeout(() => {
            router.replace("/onboarding");
          }, 0);
        }
      }

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