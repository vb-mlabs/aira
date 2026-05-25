// @mlabs/eslint-config/expo — preset for the Expo mobile app.
//
// Today mobile uses `expo lint` (the Expo CLI's built-in ESLint integration).
// This preset is a thin wrapper that adds MLabs custom rules on top, so when
// mobile migrates from `expo lint` to direct ESLint invocation it can consume
// this preset with no surprise.
//
// Also adds `no-restricted-imports` to forbid mobile from pulling in server
// packages — defense in depth on top of package.json deps + bundle-scan CI.

import baseConfig from "./base.mjs";

/**
 * Forbid mobile from importing server-side workspace packages. Last line of
 * defense against accidentally shipping DATABASE_URL or BETTER_AUTH_SECRET
 * to the mobile bundle.
 */
const noServerImports = {
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: [
              "@mlabs/db",
              "@mlabs/db/*",
              "@mlabs/auth/server",
              "@mlabs/auth/server/*",
              "@mlabs/services",
              "@mlabs/services/*",
              "@mlabs/email",
              "@mlabs/email/*",
              "server-only",
            ],
            message:
              "Server-side package — not allowed in mobile. Import shared schemas/types from @mlabs/validators or @mlabs/api instead.",
          },
        ],
      },
    ],
  },
};

const expoConfig = [...baseConfig, noServerImports];

export default expoConfig;
