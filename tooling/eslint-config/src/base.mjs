// @mlabs/eslint-config/base — shared MLabs rules consumed by every app and
// package. Bring in our 3 custom rules and forbid raw process.env reads.
//
// Consumed by:
//   @mlabs/eslint-config/next      — web app (apps/web)
//   @mlabs/eslint-config/expo      — mobile (apps/mobile, when it migrates off `expo lint`)
//   @mlabs/eslint-config/library   — workspace packages

import noBrandStringLiteral from "./rules/no-brand-string-literal.mjs";
import noDrizzleInSchemas from "./rules/no-drizzle-in-schemas.mjs";

/**
 * Block raw `process.env.X` and `process.env["X"]` reads. All env access must
 * go through the t3-env validated singleton.
 *
 * The selectors handle both shapes:
 *   process.env.X         (MemberExpression > MemberExpression)
 *   process.env["X"]      (MemberExpression with computed=true)
 */
const noRawProcessEnv = {
  rules: {
    "no-restricted-syntax": [
      "error",
      {
        selector:
          "MemberExpression[object.object.name='process'][object.property.name='env']",
        message:
          "Don't access process.env directly. Import { env } from '@/config/env' instead.",
      },
      {
        selector:
          "MemberExpression[object.name='process'][property.name='env']",
        message:
          "Don't access process.env directly. Import { env } from '@/config/env' instead.",
      },
    ],
  },
};

/**
 * MLabs custom rules — installed as the `mlabs` plugin namespace.
 * Apps and packages enable specific rules via their config.
 */
export const mlabsPlugin = {
  plugins: {
    mlabs: {
      rules: {
        "no-brand-string-literal": noBrandStringLiteral,
        "no-drizzle-in-schemas": noDrizzleInSchemas,
      },
    },
  },
};

/**
 * Default base preset — register the plugin and enable all rules. Apps
 * extend this and add their own framework-specific configs.
 */
const baseConfig = [
  {
    ...mlabsPlugin,
    rules: {
      ...noRawProcessEnv.rules,
      "mlabs/no-brand-string-literal": "error",
      "mlabs/no-drizzle-in-schemas": "error",
    },
  },
];

export default baseConfig;
