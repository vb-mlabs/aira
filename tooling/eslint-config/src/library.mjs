// @mlabs/eslint-config/library — preset for workspace packages under packages/*.
//
// Base rules + TypeScript parsing for .ts/.tsx files so packages can be
// linted standalone (root ESLint ignores packages/**).
//
// Consumed by packages via:
//   import libraryConfig from "@mlabs/eslint-config/library";
//   export default libraryConfig;

import baseConfig from "./base.mjs";
import tsParser from "@typescript-eslint/parser";

const libraryConfig = [
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
  },
  ...baseConfig,
];

export default libraryConfig;
