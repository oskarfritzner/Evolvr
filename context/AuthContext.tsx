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
}

// Create AuthContext
const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isInitialized: false,
  signOut: async () => {},
  signIn: async () => { throw new Error("signIn method not implemented"); },
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

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthContextType["user"]>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);

  const setupFirestoreListener = async (firebaseUser: FirebaseUser) => {
    try {
      const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
      
      if (!userDoc.exists()) {
        // Check if user is in incomplete users collection
        const incompleteUser = await registrationService.get(firebaseUser.uid);
        if (incompleteUser && !incompleteUser.onboardingComplete) {
          router.replace("/onboarding");
          return null;
        }
        if (!incompleteUser) {
          router.replace("/register");
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

  // Store auth data securely
  const storeAuthData = async (userData: UserData, uid: string) => {
    try {
      const authData = JSON.stringify({ userData, uid });
      if (Platform.OS !== 'web') {
        await SecureStore.setItemAsync(AUTH_KEY, authData);
      } else {
        localStorage.setItem(AUTH_KEY, authData);
      }
    } catch (error) {
      logger.error('Error storing auth data:', error);
    }
  };

  // Handle auth state changes
  useEffect(() => {
    // Set up auth state listener
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Get user data from Firestore
          const userData = await setupFirestoreListener(firebaseUser);
          setUser({
            uid: firebaseUser.uid,
            userData,
          });
        } else {
          setUser(null);
        }
      } catch (error) {
        logger.error('Auth state change error:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
        setIsInitialized(true);
      }
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user?.uid) {
      // Set up user data listener
      const unsubscribeUserData = onSnapshot(doc(db, "users", user.uid), (doc) => {
        setUserData(doc.data() as UserData);
      });

      // Set up unread notifications listener
      const unsubscribeNotifications = notificationService.subscribeToUnreadCount(user.uid);

      return () => {
        unsubscribeUserData();
        unsubscribeNotifications();
      };
    }
  }, [user?.uid]);

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      if (Platform.OS !== 'web') {
        await SecureStore.deleteItemAsync(AUTH_KEY);
      } else {
        localStorage.removeItem(AUTH_KEY);
      }
      router.replace("/sign-in");
    } catch (error) {
      logger.error('Error signing out:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  };

  // Remove automatic navigation from here
  const contextValue = useMemo(
    () => ({
      user,
      isLoading,
      isInitialized,
      signOut,
      signIn,
    }),
    [user, isLoading, isInitialized]
  );

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