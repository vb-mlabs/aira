// One-time QA seed/purge tool — upserts 4 fixed QA personas into whatever
// DATABASE_URL points at. Invoke via:
//
//   pnpm --filter @aira/db seed:qa          # seed (default)
//   pnpm --filter @aira/db seed:qa -- --purge  # remove all 4
//
// SHARED-CREDENTIAL MODEL
// The passwords below are hardcoded constants visible in git history.
// Anyone with repo read access can sign in as super_admin on any
// environment where this seed has run. Treat qa-super@aira-qa.test as
// the staff break-glass equivalent. Rotate by editing this file +
// re-running the seed; emergency-revoke by running with --purge.
//
// HOSTNAME GUARD
// Every invocation prints the resolved DATABASE_URL hostname before any
// write or delete. The script does NOT refuse to run against prod; the
// hostname print is the only safety net. If NODE_ENV=production, a
// [PRODUCTION] tag is appended. Verifying the hostname is the operator's
// responsibility.
//
// IDEMPOTENCY
// Both user and account rows have deterministic UUIDs per persona
// (`a00X` for user.id, `b00X` for account.id). The account table has
// NO UNIQUE constraint on (account_id, provider_id) in this repo's
// Better Auth adapter (only the PK on id and an index on userId — see
// packages/db/src/schema/auth.ts), so the account PK is the only valid
// ON CONFLICT target. ON CONFLICT (id) DO UPDATE on both tables makes
// re-running a no-op for everything except updated_at + password.
//
// BYPASS NOTE
// Direct drizzle/Postgres writes bypass Better Auth's databaseHooks
// (admin-bootstrap, super-admin-bootstrap) — those fire only when
// signups go through Better Auth's API. So our role assignments stick
// without any conflict from the bootstrap hooks.

import { Pool, neonConfig } from "@neondatabase/serverless"
import ws from "ws"
import { hashPassword } from "better-auth/crypto"

neonConfig.webSocketConstructor = ws

interface Persona {
  userId: string
  accountId: string
  name: string
  email: string
  password: string
  role: "end_user" | "admin" | "super_admin"
}

const PERSONAS: readonly Persona[] = [
  {
    userId: "00000000-0000-4000-8000-00000000a001",
    accountId: "00000000-0000-4000-8000-00000000b001",
    name: "QA · Super Admin",
    email: "qa-super@aira-qa.test",
    password: "qa-super-2026",
    role: "super_admin",
  },
  {
    userId: "00000000-0000-4000-8000-00000000a002",
    accountId: "00000000-0000-4000-8000-00000000b002",
    name: "QA · Admin",
    email: "qa-admin@aira-qa.test",
    password: "qa-admin-2026",
    role: "admin",
  },
  {
    userId: "00000000-0000-4000-8000-00000000a003",
    accountId: "00000000-0000-4000-8000-00000000b003",
    name: "QA · Member One",
    email: "qa-member-1@aira-qa.test",
    password: "qa-member1-2026",
    role: "end_user",
  },
  {
    userId: "00000000-0000-4000-8000-00000000a004",
    accountId: "00000000-0000-4000-8000-00000000b004",
    name: "QA · Member Two",
    email: "qa-member-2@aira-qa.test",
    password: "qa-member2-2026",
    role: "end_user",
  },
]

function describeDbHost(databaseUrl: string): string {
  // Node scripts in packages/db/scripts/ read process.env directly — the
  // "no raw process.env outside src/config/env.ts" rule applies to
  // apps/web app code, not to one-shot scripts (migrate.ts does the
  // same). NODE_ENV is consulted for the [PRODUCTION] tag only.
  const tag = process.env.NODE_ENV === "production" ? " [PRODUCTION]" : ""
  let host: string
  try {
    host = new URL(databaseUrl).hostname
  } catch {
    host = "(unparsable)"
  }
  return `Connected to DB host: ${host}${tag}`
}

async function runSeed(pool: Pool): Promise<void> {
  for (const p of PERSONAS) {
    const hash = await hashPassword(p.password)
    if (!hash) {
      throw new Error(
        `hashPassword returned an empty hash for ${p.email} — refusing to write an unauthenticated account row.`,
      )
    }

    await pool.query(
      `INSERT INTO "user"
        (id, name, email, email_verified, role, created_at, updated_at)
       VALUES ($1, $2, $3, true, $4, now(), now())
       ON CONFLICT (id) DO UPDATE
         SET name = EXCLUDED.name,
             email = EXCLUDED.email,
             email_verified = true,
             role = EXCLUDED.role,
             updated_at = now()`,
      [p.userId, p.name, p.email, p.role],
    )
    await pool.query(
      `INSERT INTO account
        (id, account_id, provider_id, user_id, password, created_at, updated_at)
       VALUES ($1, $2, 'credential', $3, $4, now(), now())
       ON CONFLICT (id) DO UPDATE
         SET password = EXCLUDED.password,
             updated_at = now()`,
      [p.accountId, p.email, p.userId, hash],
    )
  }

  // Only print credentials AFTER every upsert succeeds — a partial-failure
  // run shouldn't leak passwords alongside an error.
  console.log("")
  console.log("───── QA seed credentials ─────")
  for (const p of PERSONAS) {
    console.log(`${p.email.padEnd(28)} ${p.password.padEnd(18)} ${p.role}`)
  }
  console.log("───────────────────────────────")
  console.log(
    "Rotate these by editing packages/db/scripts/seed-qa-accounts.ts and re-running.",
  )
}

async function runPurge(pool: Pool): Promise<void> {
  // Hostname line already printed in main(); echo the destructive intent
  // so the operator gets one last visual cue before the DELETE fires.
  console.log("Purging QA personas from this DB.")

  const ids = PERSONAS.map((p) => p.userId)
  const result = await pool.query<{ id: string; email: string }>(
    `DELETE FROM "user"
     WHERE id = ANY($1::text[])
     RETURNING id, email`,
    [ids],
  )
  if (result.rows.length === 0) {
    console.log("Purged 0 — nothing to do.")
    return
  }
  const emails = result.rows.map((r) => r.email).join(", ")
  console.log(`Purged ${result.rows.length} personas: ${emails}`)
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error("DATABASE_URL is required to run the QA seed.")
    process.exit(1)
  }

  const isPurge = process.argv.includes("--purge")

  console.log(describeDbHost(databaseUrl))

  const pool = new Pool({ connectionString: databaseUrl })
  try {
    if (isPurge) {
      await runPurge(pool)
    } else {
      await runSeed(pool)
    }
  } finally {
    // Without pool.end() the Node process hangs because the pool's open
    // sockets keep the event loop alive (same reason as migrate.ts).
    await pool.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
