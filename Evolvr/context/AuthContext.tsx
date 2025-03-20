import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { ActivityIndicator, View, Platform } from "react-native";
import { onAuthStateChanged, User as FirebaseUser, signOut as firebaseSignOut, signInWithEmailAndPassword } from "firebase/auth";
import { doc, onSnapshot, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/backend/config/firebase";
import { levelService } from "@/backend/services/levelService";
import { userService } from "@/backend/services/userService";
import { UserData, UserType } from "@/backend/types/UserData";
import { habitService } from "@/backend/services/habitService";
import { router } from "expo-router";
import * as SecureStore from 'expo-secure-store';
import { routineService } from "@/backend/services/routineServices";
import logger from '@/utils/logger';
import { registrationService } from "@/backend/services/registrationService";
import { notificationService } from "@/backend/services/notificationService";
import { useQueryClient } from "@tanstack/react-query";
import { incompleteUser } from "@/backend/types/User";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authValidation } from "@/utils/authValidation";
import { useRegistration } from "@/hooks/auth/useRegistration";

// Extend FirebaseUser to include userData
interface User extends FirebaseUser {
  userData?: UserData | null;
}

// Define AuthContextType
export interface AuthContextType {
  user: {
    uid: string;
    userData?: UserData | null;
  } | null;
  isLoading: boolean;
  isInitialized: boolean;
  signOut: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<FirebaseUser>;
  refreshUserData: (userId: string) => Promise<void>;
}

// Create AuthContext
const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isInitialized: false,
  signOut: async () => {},
  signIn: async () => { throw new Error("signIn method not implemented"); },
  refreshUserData: async () => {},
});

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
  const [user, setUser] = useState<AuthContextType["user"]>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [pendingNavigation, setPendingNavigation] = useState<NavigationPath>(null);
  const [unsubscribeUserData, setUnsubscribeUserData] = useState<(() => void) | null>(null);
  const [unsubscribeNotifications, setUnsubscribeNotifications] = useState<(() => void) | null>(null);
  const queryClient = useQueryClient();

  // Get registration methods
  const setRegistrationData = useRegistration((state) => state.setRegistrationData);

  // Handle navigation based on auth state
  useEffect(() => {
    if (!isLoading && isInitialized && !user?.userData) {
      const handleNavigation = async () => {
        if (!user) {
          // No user, redirect to sign in
          router.replace("/sign-in");
          return;
        }

        try {
          // Check if user exists in users collection
          const userDoc = await getDoc(doc(db, "users", user.uid));
          
          if (userDoc.exists()) {
            // Complete user, go to dashboard
            router.replace("/(tabs)/dashboard");
          } else {
            // Check if user is in incomplete users collection
            const incompleteUser = await registrationService.get(user.uid);
            
            if (incompleteUser && !incompleteUser.onboardingComplete) {
              // User needs to complete onboarding
              router.replace("/onboarding");
            } else {
              // Something is wrong with the user's state
              await signOut();
              router.replace("/sign-in");
            }
          }
        } catch (error) {
          logger.error('Navigation error:', error);
          router.replace("/sign-in");
        }
      };

      handleNavigation();
    }
  }, [user?.uid, isLoading, isInitialized]);

  const setupFirestoreListener = async (firebaseUser: FirebaseUser) => {
    try {
      const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
      
      if (!userDoc.exists()) {
        // Check if user is in incomplete users collection with timeout
        const incompleteUser = await Promise.race([
          registrationService.get(firebaseUser.uid),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout checking registration')), 5000)
          )
        ]) as incompleteUser | null;

        if (incompleteUser?.onboardingComplete === false) {
          // Store onboarding step in registration data
          const registrationData = {
            email: incompleteUser.email,
            userId: firebaseUser.uid,
            onboardingStarted: true,
            onboardingStep: incompleteUser.onboardingStep || 1
          };
          
          // Set registration data in both Zustand and React Query
          setRegistrationData(registrationData);
          queryClient.setQueryData(['registrationData'], registrationData);
          
          // Set pending navigation instead of navigating directly
          setPendingNavigation("/onboarding");
          return null;
        }
        if (!incompleteUser) {
          return null;
        }
      }
      
      await userService.migrateUserFields(firebaseUser.uid);
      return userDoc.data() as UserData;
    } catch (error) {
      logger.error('Error checking user data:', error);
      throw error;
    }
  };

  // Handle auth state changes
  useEffect(() => {
    let unsubscribeAuth: (() => void) | null = null;

    const setupAuth = () => {
      unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
        try {
          if (firebaseUser) {
            // Check if user exists in users collection
            const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
            
            if (userDoc.exists()) {
              // Complete user, set up listeners and state
              const userData = userDoc.data() as UserData;
              setUser({
                uid: firebaseUser.uid,
                userData,
              });

              // Set up user data listener
              if (unsubscribeUserData) {
                unsubscribeUserData();
              }
              
              const unsubUserData = onSnapshot(
                doc(db, "users", firebaseUser.uid),
                (doc) => {
                  if (doc.exists()) {
                    const newUserData = doc.data() as UserData;
                    setUserData(newUserData);
                    queryClient.setQueryData(["userData", firebaseUser.uid], newUserData);
                    
                    setUser(prev => prev ? {
                      ...prev,
                      userData: newUserData
                    } : null);
                  }
                },
                (error) => {
                  logger.error('User data listener error:', error);
                }
              );
              setUnsubscribeUserData(() => unsubUserData);

              // Set up notifications listener
              if (unsubscribeNotifications) {
                unsubscribeNotifications();
              }
              const unsubNotifications = notificationService.subscribeToUnreadCount(firebaseUser.uid);
              setUnsubscribeNotifications(() => unsubNotifications);
            } else {
              // User exists but no userData - could be in onboarding
              setUser({
                uid: firebaseUser.uid,
                userData: null,
              });
            }
          } else {
            setUser(null);
            if (unsubscribeUserData) {
              unsubscribeUserData();
              setUnsubscribeUserData(null);
            }
            if (unsubscribeNotifications) {
              unsubscribeNotifications();
              setUnsubscribeNotifications(null);
            }
          }
        } catch (error) {
          logger.error('Auth state change error:', error);
          setUser(null);
        } finally {
          setIsLoading(false);
          setIsInitialized(true);
        }
      });
    };

    setupAuth();

    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
      if (unsubscribeUserData) unsubscribeUserData();
      if (unsubscribeNotifications) unsubscribeNotifications();
    };
  }, [queryClient]);

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
        setUserData(newUserData);
        queryClient.setQueryData(["userData", userId], newUserData);
        setUser(prev => prev ? {
          ...prev,
          userData: newUserData
        } : null);
      }
    } catch (error) {
      logger.error('Error refreshing user data:', error);
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

// Hook to use AuthContext
export const useAuth = () => useContext(AuthContext);

// After successful login/initialization
const initializeUserData = async (user: User) => {
  try {
    // ... other initialization
    await routineService.getUserRoutines(user.uid); // This will refresh cache
  } catch (error) {
    logger.error('Error initializing user data:', error);
  }
};