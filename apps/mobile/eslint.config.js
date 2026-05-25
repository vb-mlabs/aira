// Mobile ESLint flat config — extends eslint-config-expo's flat preset which
// pairs with the installed Expo SDK 55. The preset bundles RN + Expo-Router
// + React rules tuned for the SDK's expectations.

const expoConfig = require("eslint-config-expo/flat");

module.exports = [
  ...expoConfig,
  {
    ignores: [
      "node_modules/**",
      ".expo/**",
      "ios/**",
      "android/**",
      "dist/**",
    ],
  },
  {
    rules: {
      // React Native renders <Text> children as plain strings via the JS
      // engine, not HTML — the `'`/`"` quote-escape concerns this rule
      // exists for don't apply. Keeps user-facing copy like "you're" /
      // "we'll" readable in source.
      "react/no-unescaped-entities": "off",
    },
  },
];
