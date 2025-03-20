import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Evolvr",
  slug: "Evolvr",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  userInterfaceStyle: "automatic",
  scheme: "evolvr", // Your app's URL scheme
  plugins: [
    // ... other plugins
    "expo-secure-store",
    "expo-dev-client",
  ],
  ios: {
    bundleIdentifier: "com.oskarfritzner.Evolvr",
    associatedDomains: ["applinks:evolvr.com"],
    infoPlist: {
      CFBundleURLTypes: [
        {
          CFBundleURLSchemes: [
            "com.googleusercontent.apps.31085337846-scv1e3m6caggsc5bl5b2tsgcmuhfcnha",
          ],
        },
      ],
      googleSignInReservedClientId:
        "com.googleusercontent.apps.31085337846-scv1e3m6caggsc5bl5b2tsgcmuhfcnha",
    },
    googleServicesFile: "./GoogleService-Info.plist",
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
});
