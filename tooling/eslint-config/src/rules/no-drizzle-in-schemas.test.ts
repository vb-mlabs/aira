// @vitest-environment node
//
// Unit test for the no-drizzle-in-schemas ESLint rule.
//
// ESLint's RuleTester is itself a Mocha-style test runner — calling
// `tester.run()` registers a suite. It MUST be called at top level
// (not inside `describe/it`) or Vitest rejects the nested suite.

import { RuleTester } from "eslint";
import rule from "./no-drizzle-in-schemas.mjs";

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
  },
});

tester.run("no-drizzle-in-schemas", rule as never, {
  valid: [
    // Zod-only schema in the protected validators package → OK.
    {
      code: `import { z } from "zod"; export const S = z.object({})`,
      filename: "packages/validators/src/auth.ts",
    },
    // Zod-only schema in the legacy location → still OK.
    {
      code: `import { z } from "zod"; export const S = z.object({})`,
      filename: "src/lib/schemas/auth.ts",
    },
    // Drizzle import OUTSIDE the validators package → OK.
    {
      code: `import { eq } from "drizzle-orm"; export const x = eq`,
      filename: "src/lib/db/audit.ts",
    },
    // Drizzle sub-path import outside schemas → OK.
    {
      code: `import { pgTable } from "drizzle-orm/pg-core"; export const t = pgTable`,
      filename: "src/lib/db/schema/users.ts",
    },
  ],
  invalid: [
    {
      code: `import { eq } from "drizzle-orm"`,
      filename: "packages/validators/src/forbidden.ts",
      errors: [{ messageId: "noDrizzle" }],
    },
    {
      code: `import { pgTable } from "drizzle-orm/pg-core"`,
      filename: "packages/validators/src/users-shape.ts",
      errors: [{ messageId: "noDrizzle" }],
    },
    // Legacy path still blocked during the migration.
    {
      code: `import { eq } from "drizzle-orm"`,
      filename: "src/lib/schemas/forbidden.ts",
      errors: [{ messageId: "noDrizzle" }],
    },
    // Dynamic import is also caught.
    {
      code: `const m = import("drizzle-orm")`,
      filename: "packages/validators/src/dyn.ts",
      errors: [{ messageId: "noDrizzle" }],
    },
  ],
});
