import type { ExpoConfig, ConfigContext } from "expo/config";

/**
 * Expo dynamic config.
 *
 * BUNDLE_ID PLACEHOLDER: `com.example.mlabs` is a template-safe valid Java
 * package name that lets `expo prebuild` succeed out of the box. Forks
 * replace it with their real bundle/package via the Phase 6 `new-project`
 * skill (which prompts for bundle ID + Apple team ID + Android SHA-256).
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "MLabs Template",
  slug: "mlabs-mobile",
  scheme: "mlabs",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  icon: "./assets/icon.png",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
    dark: {
      image: "./assets/splash-dark.png",
      backgroundColor: "#000000",
    },
  },
  assetBundlePatterns: ["**/*"],
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.example.mlabs",
    associatedDomains: ["applinks:mlabs.example.com"],
  },
  android: {
    package: "com.example.mlabs",
    adaptiveIcon: {
      foregroundImage: "./assets/icon.png",
      backgroundColor: "#ffffff",
    },
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          {
            scheme: "https",
            host: "mlabs.example.com",
          },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },
  web: {
    bundler: "metro",
  },
  plugins: [
    "expo-router",
    "expo-font",
    "expo-secure-store",
    [
      "expo-image-picker",
      {
        photosPermission:
          "MLabs Template needs access to your photos to set your profile picture.",
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
});
