import { initializeApp, FirebaseApp } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  setPersistence,
  browserLocalPersistence, // Changed from indexedDBLocalPersistence
  inMemoryPersistence,
  getReactNativePersistence, // Move this import here
  Auth,
} from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { getAnalytics, Analytics, isSupported } from "firebase/analytics";
import { getInstallations } from "firebase/installations";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

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

// Validate configuration before proceeding
validateFirebaseConfig();

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;
let analytics: Analytics | null = null;

try {
  // Initialize Firebase
  app = initializeApp(firebaseConfig);

  // Initialize Auth with correct persistence for each platform
  auth =
    Platform.OS === "web"
      ? getAuth(app)
      : initializeAuth(app, {
          persistence: getReactNativePersistence(AsyncStorage),
        });

  // Set persistence for web platform
  if (Platform.OS === "web") {
    setPersistence(auth, browserLocalPersistence).catch((error) =>
      console.error("Auth persistence error:", error)
    );
  }

  // Initialize Firestore & Storage
  db = getFirestore(app);
  storage = getStorage(app);

  // Initialize optional services
  const initOptionalServices = async () => {
    try {
      if (Platform.OS === "web") {
        const analyticsSupported = await isSupported();
        if (analyticsSupported) {
          analytics = getAnalytics(app);
        }
      }
      await getInstallations(app);
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
