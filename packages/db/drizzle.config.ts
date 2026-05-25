import type { Config } from "drizzle-kit"

// Drizzle Kit config for @aira/db — drives `pnpm --filter @aira/db generate`
// and `pnpm --filter @aira/db migrate`. Schema files live under src/schema/*
// and are re-exported from src/schema/index.ts. Migrations are committed to
// drizzle/migrations/.
//
// DATABASE_URL must be set for migrate/studio commands. generate works without it.

export default {
  schema: "./src/schema/index.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://placeholder@localhost/placeholder",
  },
  strict: true,
  verbose: true,
} satisfies Config
