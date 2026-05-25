import "server-only"

// Database client factory (Neon Postgres via @neondatabase/serverless WebSocket
// Pool + Drizzle). We use the WebSocket Pool driver — not neon-http — because:
//   1. The app runs as a long-lived Node process (Next.js on Replit / VPS),
//      not an edge function. neon-http exists for edge runtimes that can't
//      hold sockets (Cloudflare Workers, Vercel Edge); on Node it gives
//      nothing and inherits HTTP-gateway response-shape quirks (e.g.
//      `rows: null` for empty result sets, which crashes drizzle-orm's
//      neon-http adapter — surfaced on the BetFrnd fork during BetterAuth
//      signup's zero-row email lookup).
//   2. Migrations also use neon-serverless (see scripts/migrate.ts), so
//      aligning runtime + migrations on one driver removes a drift source.
//   3. WS speaks the real Postgres wire protocol — same as psql — so
//      pooling, prepared statements, and transactions all work properly.
//
// db.batch() is NOT available on this driver — it was neon-http-only.
// Callers needing atomic multi-statement work use db.transaction(async
// (tx) => { ... }) instead (real BEGIN/COMMIT). See packages/services/src/
// admin/service.ts banUser() + packages/services/src/messages/service.ts
// sendMessage() for examples.

import { drizzle } from "drizzle-orm/neon-serverless"
import { Pool, neonConfig } from "@neondatabase/serverless"
import ws from "ws"
import * as schema from "./schema"

// Node 20 has native WebSocket but @neondatabase/serverless still needs this
// explicit assignment outside browser/edge runtimes.
neonConfig.webSocketConstructor = ws

export type Database = ReturnType<typeof drizzle<typeof schema>>

export interface CreateDbOptions {
  /** Read lazily on first query so callers can pass `() => env.DATABASE_URL`
   *  without triggering server-side env reads at module load (which breaks
   *  test environments and any build-time static analysis). */
  databaseUrl: string | undefined | (() => string | undefined)
}

// Stash on globalThis in dev so Next.js HMR doesn't leak a Pool per reload —
// without this, every hot-reload would orphan the previous Pool and burn
// through Neon's per-project connection cap within minutes. Do NOT call
// pool.end() from the long-lived app; only from the migrate script.
const globalForDb = globalThis as unknown as {
  __mlabsPool?: Pool
}

export function createDb({ databaseUrl }: CreateDbOptions): Database {
  // Lazy singleton — built on first property access. Lets callers import the
  // returned proxy at module load even when DATABASE_URL isn't yet available
  // (e.g. during static analysis of API routes).
  let instance: Database | null = null

  function build(): Database {
    const url = typeof databaseUrl === "function" ? databaseUrl() : databaseUrl
    if (!url) {
      throw new Error(
        "DATABASE_URL is required to query the database. Set it in .env.local. " +
          "(SKIP_ENV_VALIDATION=1 only gates the env validator, not the runtime.)",
      )
    }
    const pool =
      globalForDb.__mlabsPool ?? new Pool({ connectionString: url, max: 10 })
    if (process.env.NODE_ENV !== "production") {
      globalForDb.__mlabsPool = pool
    }
    return drizzle({ client: pool, schema })
  }

  return new Proxy({} as Database, {
    get(_target, prop) {
      if (!instance) instance = build()
      return Reflect.get(instance, prop)
    },
  })
}
