import { ExpoConfig, ConfigContext } from "expo/config";

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
    OPENAI_API_KEY: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
    AZURE_OPENAI_ENDPOINT: process.env.AZURE_OPENAI_ENDPOINT,
    AZURE_OPENAI_API_KEY: process.env.AZURE_OPENAI_API_KEY,
  }, // Your app's URL scheme
  plugins: ["expo-secure-store", "expo-dev-client"],
  ios: {
    bundleIdentifier: "com.oskarfritzner.Evolvr",
    associatedDomains: ["applinks:evolvr.com"],
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    // ... other Android config
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
});
