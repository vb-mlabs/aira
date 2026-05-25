// E2E auth fixture — shared constants for the test user and the path where
// the Playwright storageState (signed session cookie) is written.
//
// CONVENTION: a single deterministic test user with a hardcoded UUID.
// globalSetup runs `DELETE WHERE id = E2E_TEST_USER.id` before each run, so
// any orphan rows from a crashed previous run get wiped (BetterAuth's
// ON DELETE CASCADE handles session + account).
//
// The id is intentionally unrealistic (all-zeros prefix + version-4 marker)
// so it's vanishingly unlikely to collide with a real user. Do NOT reuse this
// id in any seed script — the row will be wiped on the next e2e run.
//
// WARNING: there is no separate test database. If your .env.local points at
// a shared Neon DB, running e2e locally will reseed `e2e-test-primary` in
// that DB. Long-term fix is per-developer Neon branches; for now, prefer
// running e2e against a local DB or your own Neon branch.
//
// DB ACCESS FROM SPECS — IMPORTANT:
// Spec files (`*.spec.ts`) should access the DB via raw `Pool`/SQL from
// `@neondatabase/serverless`, NOT via `@mlabs/db/schema`. Playwright's
// spec loader uses Node's runtime ESM resolution, which doesn't apply
// the `moduleResolution: "Bundler"` setting to the IMPORTED package's
// internal extensionless imports (e.g. `from "./auth"` inside
// `packages/db/src/schema/index.ts`). globalSetup runs through a
// different loader path and works fine.
// Pattern:
//   import { Pool } from "@neondatabase/serverless"
//   const pool = new Pool({ connectionString: process.env.DATABASE_URL })
//   await pool.query(`UPDATE … WHERE user_id = $1`, [E2E_TEST_USER.id])
//   await pool.end()
//
// Follow-up: when a fork needs per-test user isolation, add a
// createTestUser({ overrides }) factory here.

import { dirname, join } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))

export const E2E_TEST_USER = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "E2E Primary",
  email: "e2e-test-primary@mlabs.test",
  password: "e2e-test-password",
} as const

export const STORAGE_STATE_PATH = join(__dirname, "..", ".auth", "user.json")
