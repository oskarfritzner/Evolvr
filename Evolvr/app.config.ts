import { ExpoConfig, ConfigContext } from "expo/config";

// Helper to get environment variables with fallbacks
const getEnvVar = (key: string, fallback: string = ""): string => {
  const value = process.env[key] || fallback;
  if (!value && process.env.NODE_ENV === "production") {
    console.warn(`Warning: ${key} environment variable is not set`);
  }
  return value;
};

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Evolvr",
  slug: "Evolvr",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  userInterfaceStyle: "automatic",
  scheme: "evolvr",
  extra: {
    ...config.extra,
    eas: {
      projectId: "03ea9dda-605e-447e-b852-ef15db99aee4",
    },
    // Only expose public environment variables to the client
    OPENAI_API_KEY: getEnvVar("EXPO_PUBLIC_OPENAI_API_KEY"),
  },
  plugins: ["expo-secure-store", "expo-dev-client"],
  ios: {
    bundleIdentifier: "com.oskarfritzner.Evolvr",
    associatedDomains: ["applinks:evolvr.com"],
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    intentFilters: [
      {
        action: "VIEW",
        data: [
          {
            scheme: "evolvr",
            host: "*.evolvr.com",
            pathPrefix: "/",
          },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
    package: "com.oskarfritzner.Evolvr",
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
  },
  sdkVersion: "52.0.0",
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  experiments: {
    baseUrl: "/EvolvrApp",
  },
});
