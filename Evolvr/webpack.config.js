const createExpoWebpackConfigAsync = require("@expo/webpack-config");
const webpack = require("webpack");

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(
    {
      ...env,
      babel: {
        dangerouslyAddModulePathsToTranspile: ["@gorhom/bottom-sheet"],
      },
    },
    argv
  );

  // Optimize for React Native Web
  config.resolve.alias = {
    ...config.resolve.alias,
    "react-native$": "react-native-web",
  };

  // Production optimizations
  if (env.mode === "production") {
    // Set the correct public path for GitHub Pages
    config.output.publicPath = "/Evolvr/";

    // Ensure environment variables are properly injected
    config.plugins.push(
      new webpack.DefinePlugin({
        "process.env.NODE_ENV": JSON.stringify("production"),
        "process.env.PUBLIC_URL": JSON.stringify("/Evolvr"),
        "process.env.EXPO_PUBLIC_FIREBASE_API_KEY": JSON.stringify(
          process.env.EXPO_PUBLIC_FIREBASE_API_KEY
        ),
        "process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN": JSON.stringify(
          process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
        ),
        "process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID": JSON.stringify(
          process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID
        ),
        "process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET": JSON.stringify(
          process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
        ),
        "process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID": JSON.stringify(
          process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
        ),
        "process.env.EXPO_PUBLIC_FIREBASE_APP_ID": JSON.stringify(
          process.env.EXPO_PUBLIC_FIREBASE_APP_ID
        ),
        "process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID": JSON.stringify(
          process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID
        ),
      })
    );

    // Enable performance optimizations
    config.optimization = {
      ...config.optimization,
      minimize: true,
      splitChunks: {
        chunks: "all",
        minSize: 20000,
        maxSize: 244000,
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: "vendor",
            chunks: "all",
          },
        },
      },
    };

    // Add compression plugin if not already present
    if (
      !config.plugins.some(
        (plugin) => plugin.constructor.name === "CompressionPlugin"
      )
    ) {
      const CompressionPlugin = require("compression-webpack-plugin");
      config.plugins.push(new CompressionPlugin());
    }
  }

  return config;
};
