const createExpoWebpackConfigAsync = require("@expo/webpack-config");

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
    config.output.publicPath = "/EvolvrApp/";

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
