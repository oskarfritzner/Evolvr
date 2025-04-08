const createExpoWebpackConfigAsync = require("@expo/webpack-config");
const webpack = require("webpack");
const Dotenv = require("dotenv-webpack");
const path = require("path");

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

  // Debug environment variables during build
  console.log("\nEnvironment Variables during webpack build:");
  Object.keys(process.env).forEach((key) => {
    if (key.startsWith("EXPO_PUBLIC_")) {
      console.log(`${key}: ${process.env[key] ? "Present" : "Missing"}`);
    }
  });

  // Optimize for React Native Web
  config.resolve.alias = {
    ...config.resolve.alias,
    "react-native$": "react-native-web",
  };

  // Add fallbacks for node modules
  config.resolve.fallback = {
    ...config.resolve.fallback,
    crypto: require.resolve("crypto-browserify"),
    stream: require.resolve("stream-browserify"),
    buffer: require.resolve("buffer/"),
  };

  // Production optimizations
  if (env.mode === "production") {
    // Set the correct public path for GitHub Pages
    config.output.publicPath = "/Evolvr/";

    // Ensure environment variables are properly injected
    const envVars = {
      "process.env.NODE_ENV": JSON.stringify(
        process.env.NODE_ENV || "production"
      ),
      "process.env.PUBLIC_URL": JSON.stringify("/Evolvr"),
    };

    // Add all EXPO_PUBLIC_ environment variables
    Object.keys(process.env).forEach((key) => {
      if (key.startsWith("EXPO_PUBLIC_")) {
        envVars[`process.env.${key}`] = JSON.stringify(process.env[key]);
      }
    });

    // Remove any existing DefinePlugin instances
    config.plugins = config.plugins.filter(
      (plugin) => plugin.constructor.name !== "DefinePlugin"
    );

    // Add dotenv-webpack plugin
    config.plugins.push(
      new Dotenv({
        path: ".env.production",
        safe: true,
        systemvars: true,
        defaults: false,
      })
    );

    // Add our new DefinePlugin with all environment variables
    config.plugins.push(new webpack.DefinePlugin(envVars));

    // Add ProvidePlugin for Buffer
    config.plugins.push(
      new webpack.ProvidePlugin({
        Buffer: ["buffer", "Buffer"],
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

    // Add source maps for production
    config.devtool = "source-map";
  }

  return config;
};
