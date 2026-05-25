import { defineConfig, globalIgnores } from "eslint/config"
import mlabsNext from "@mlabs/eslint-config/next"

// apps/web ESLint config. Extends @mlabs/eslint-config/next which bundles:
//   - eslint-config-next (core-web-vitals + typescript)
//   - The 3 MLabs custom rules (no-brand-string-literal, no-drizzle-in-schemas,
//     no-raw-process-env)
//
// Path-scoped carve-outs below cover files that legitimately need process.env.

const eslintConfig = defineConfig([
  ...mlabsNext,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "tests/fixtures/**",
  ]),
  // env config is the ONE place process.env is allowed
  {
    files: ["src/config/env.ts"],
    rules: { "no-restricted-syntax": "off" },
  },
  // next config needs process.env at boot
  {
    files: ["next.config.ts"],
    rules: { "no-restricted-syntax": "off" },
  },
  // Build/test/CI scripts that legitimately need process.env. The t3-env
  // singleton is for app runtime; these run outside the validated env.
  {
    files: [
      "playwright.config.ts",
      "tests/**/*.{ts,tsx}",
      "vitest.config.ts",
    ],
    rules: { "no-restricted-syntax": "off" },
  },
])

export default eslintConfig
