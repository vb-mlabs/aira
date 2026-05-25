import type { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "MLabs Template",
  slug: "mlabs-mobile",
  scheme: "mlabs",
  ios: {
    bundleIdentifier: "com.example.mlabs",
    associatedDomains: ["applinks:mlabs.example.com"],
  },
  android: {
    package: "com.example.mlabs",
    intentFilters: [{ data: [{ scheme: "https", host: "mlabs.example.com" }] }],
  },
  plugins: [
    [
      "expo-image-picker",
      { photosPermission: "MLabs Template needs access to your photos." },
    ],
  ],
});
