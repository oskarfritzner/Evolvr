import { initializeApp, FirebaseApp } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  setPersistence,
  browserLocalPersistence,
  inMemoryPersistence,
  getReactNativePersistence,
  Auth,
} from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { getAnalytics, Analytics, isSupported } from "firebase/analytics";
import { getInstallations } from "firebase/installations";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// Debug environment variables
const debugEnvVars = () => {
  const vars = [
    "EXPO_PUBLIC_FIREBASE_API_KEY",
    "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "EXPO_PUBLIC_FIREBASE_PROJECT_ID",
    "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET",
    "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
    "EXPO_PUBLIC_FIREBASE_APP_ID",
    "EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID",
  ];

  console.log("Environment Variables Status:");
  vars.forEach((varName) => {
    console.log(`${varName}: ${process.env[varName] ? "Present" : "Missing"}`);
  });
};

// Call debug function
debugEnvVars();

// Validate Firebase configuration
const validateFirebaseConfig = () => {
  const requiredEnvVars = [
    "EXPO_PUBLIC_FIREBASE_API_KEY",
    "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "EXPO_PUBLIC_FIREBASE_PROJECT_ID",
    "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET",
    "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
    "EXPO_PUBLIC_FIREBASE_APP_ID",
    "EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID",
  ];

  const missingVars = requiredEnvVars.filter(
    (varName) => !process.env[varName]
  );

  if (missingVars.length > 0) {
    console.error("Missing required Firebase configuration:", missingVars);
    throw new Error(
      "Missing required Firebase configuration. Check your environment variables."
    );
  }
};

// Get Firebase configuration with fallback values for development
const getFirebaseConfig = () => {
  // In production, we should not use fallback values
  if (process.env.NODE_ENV === "production") {
    const config = {
      apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
      measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
    };

    // Validate that all required fields are present in production
    const missingFields = Object.entries(config).filter(([_, value]) => !value);
    if (missingFields.length > 0) {
      console.error(
        "Missing required Firebase configuration fields:",
        missingFields.map(([key]) => key)
      );
      throw new Error("Missing required Firebase configuration fields");
    }

    return config;
  }

  // Development environment with fallback values
  return {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "development-api-key",
    authDomain:
      process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ||
      "development.firebaseapp.com",
    projectId:
      process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "development-project",
    storageBucket:
      process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ||
      "development.appspot.com",
    messagingSenderId:
      process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "000000000000",
    appId:
      process.env.EXPO_PUBLIC_FIREBASE_APP_ID ||
      "1:000000000000:web:0000000000000000000000",
    measurementId:
      process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-0000000000",
  };
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;
let analytics: Analytics | null = null;

try {
  // Initialize Firebase with validated config
  validateFirebaseConfig();
  const firebaseConfig = getFirebaseConfig();

  console.log("Initializing Firebase...");
  app = initializeApp(firebaseConfig);
  console.log("Firebase initialized successfully");

  // Initialize Auth with correct persistence for each platform
  console.log("Initializing Auth...");
  auth =
    Platform.OS === "web"
      ? getAuth(app)
      : initializeAuth(app, {
          persistence: getReactNativePersistence(AsyncStorage),
        });
  console.log("Auth initialized successfully");

  // Set persistence for web platform
  if (Platform.OS === "web") {
    setPersistence(auth, browserLocalPersistence).catch((error) =>
      console.error("Auth persistence error:", error)
    );
  }

  // Initialize Firestore & Storage
  console.log("Initializing Firestore and Storage...");
  db = getFirestore(app);
  storage = getStorage(app);
  console.log("Firestore and Storage initialized successfully");

  // Initialize optional services
  const initOptionalServices = async () => {
    try {
      if (Platform.OS === "web") {
        const analyticsSupported = await isSupported();
        if (analyticsSupported) {
          analytics = getAnalytics(app);
          console.log("Analytics initialized successfully");
        }
      }
      await getInstallations(app);
      console.log("Installations initialized successfully");
    } catch (error) {
      console.debug("Optional services limited:", error);
    }
  };

  // Initialize optional services in background
  initOptionalServices();
} catch (error) {
  console.error("Error initializing Firebase:", error);
  throw error;
}

export { app, auth, db, storage, analytics };
export default app;
