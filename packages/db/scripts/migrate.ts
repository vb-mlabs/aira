// Migrate runner — applies pending Drizzle migrations against DATABASE_URL.
//
// Why there is no advisory lock here:
//
// A previous version of this script wrapped migrations in a session-level
// Postgres advisory lock (`pg_try_advisory_lock`) to prevent concurrent
// deploys from racing the same migration set. That lock was removed because
// the combination of session-level locks + PgBouncer (Neon's pooler) is a
// documented anti-pattern: when the migrate process dies before its
// `finally`-unlock runs (OOM, SIGKILL, deploy cancellation), the pooler
// keeps the backend session alive and the lock is held indefinitely,
// bricking subsequent deploys until a manual recovery.
//
// We can safely run without a lock because:
//   1. Replit Reserved VM serialises deploys per app — a single workspace
//      cannot fire two deploys against the same target simultaneously.
//   2. The production Neon DB is single-owner: only the deploy build
//      migrates it. No teammate forks, no second workspace, no laptop
//      migrations against prod.
//   3. Drizzle's `__drizzle_migrations` table records every applied
//      migration's hash. Even if two processes raced, they converge to
//      "first one wins; second no-ops or fails loudly on conflicting DDL"
//      — no silent corruption.
//
// If the deploy topology changes (multi-owner DB, parallel deploys, manual
// migrations from laptops or CI), revisit this decision. The right
// mechanism then is either a transaction-scoped lock
// (`pg_advisory_xact_lock`, auto-released on COMMIT/ROLLBACK regardless of
// process death) or a dedicated mutex table with a heartbeat — NOT a
// session-level lock through a pooler.
//
// Driver note: we use `neon-serverless` + `Pool` (WebSocket) rather than
// `neon-http`. Drizzle's migrator needs multi-statement transactions which
// the HTTP driver cannot hold (returns `rows: null` mid-migration and
// crashes the adapter). Node 20 has native WebSocket but
// @neondatabase/serverless still needs the explicit assignment outside a
// browser/edge runtime.
//
// Usage: pnpm --filter @mlabs/db migrate

import { drizzle } from "drizzle-orm/neon-serverless"
import { migrate } from "drizzle-orm/neon-serverless/migrator"
import { Pool, neonConfig } from "@neondatabase/serverless"
import ws from "ws"
import path from "node:path"
import { fileURLToPath } from "node:url"

neonConfig.webSocketConstructor = ws

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error("DATABASE_URL is required to run migrations.")
  process.exit(1)
}

const here = path.dirname(fileURLToPath(import.meta.url))
const migrationsFolder = path.resolve(here, "..", "drizzle", "migrations")

const pool = new Pool({ connectionString: databaseUrl })
const db = drizzle({ client: pool })

try {
  await migrate(db, { migrationsFolder })
  console.log("✓ migrations applied")
} finally {
  // Required: without pool.end() the Node process hangs because the
  // pool's open sockets keep the event loop alive.
  await pool.end()
}
