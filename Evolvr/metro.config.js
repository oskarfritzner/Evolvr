// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("@expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname, {
  // Enable CSS support
  isCSSEnabled: true,
});

// Add support for React Native Web
config.resolver.platforms = [...config.resolver.platforms, "web"];
config.resolver.mainFields = ["browser", "main"];

module.exports = config;
