import type { ExpoConfig, ConfigContext } from "expo/config";

/**
 * Expo dynamic config.
 *
 * Bundle ID `com.airabynisarga.app` is the reverse of the prod host
 * `airabynisarga.com`. iOS associatedDomains + Android intent host both
 * point at the apex domain — the .well-known files under
 * apps/web/public/.well-known/ are what verify the universal link.
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "AIRA",
  slug: "aira-mobile",
  scheme: "aira",
  version: "0.1.0",
  // EAS Update OTA scope. Updates only flow within the same marketing
  // `version` string — bumping `version` invalidates in-flight OTAs and
  // is the deliberate ceremony at every store release. See
  // docs/operations/eas-build-runbook.md (S7 launch sequence).
  runtimeVersion: { policy: "appVersion" },
  // EAS Update endpoint — paired with the projectId in `extra.eas` below.
  // Written by `eas update:configure` (2026-06-22) but pasted manually
  // because Expo can't auto-mutate a function-form config.
  updates: {
    url: "https://u.expo.dev/21065081-2afd-43d4-aef7-7ce10de55a8b",
  },
  orientation: "portrait",
  userInterfaceStyle: "light",
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
    bundleIdentifier: "com.airabynisarga.app",
    associatedDomains: ["applinks:airabynisarga.com"],
    // App Store export-compliance declaration. AIRA uses only the
    // platform's standard cryptography (HTTPS, OS keychain) — no
    // proprietary crypto. Setting this to false skips the App Store
    // export-compliance prompt on every submission. Confirmed at the
    // first EAS Build during S0 init (2026-06-23).
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: "com.airabynisarga.app",
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
            host: "airabynisarga.com",
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
          "AIRA needs access to your photos to set your profile picture.",
      },
    ],
    // expo-notifications config plugin — wires the iOS push entitlement
    // + the Android FCM receiver at build time. Adding this is a
    // native-code change; production builds installed before this commit
    // will NOT receive push even with OS permission granted. A new EAS
    // production build is required for both platforms after T12 lands.
    "expo-notifications",
  ],
  experiments: {
    typedRoutes: true,
  },
  // Bound to the @million-labs Expo org by `eas init` (2026-06-22). EAS
  // can't auto-write to a dynamic config (function form), so the projectId
  // is committed by hand. Future `eas` commands read this value.
  extra: {
    eas: {
      projectId: "21065081-2afd-43d4-aef7-7ce10de55a8b",
    },
  },
});
