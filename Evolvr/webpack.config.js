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

  // Set the correct public path for GitHub Pages
  if (env.mode === "production") {
    config.output.publicPath = "/Evolvr/";
  }

  return config;
};
