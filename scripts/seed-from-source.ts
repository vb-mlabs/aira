// One-time seed: copy every meaningful row from SOURCE_DATABASE_URL into
// DATABASE_URL using INSERT ... ON CONFLICT DO UPDATE. Idempotent —
// re-running re-applies the latest source state without duplicating rows.
//
// Use case: pushing the local "QA-in-prod" fixture set (curated businesses,
// test users, seeded subscriptions, etc.) up to a target deployment so
// the staging/preview environment matches local. Not intended for
// merging two real production datasets.
//
// Safety gates:
//   - Refuses to run without `--confirm`.
//   - Refuses if SOURCE_DATABASE_URL == DATABASE_URL.
//   - Prints the row counts per table and waits 5 seconds before applying
//     so a Ctrl-C can abort.
//
// Excluded tables (deliberate):
//   - session, verification        — transient auth state
//   - audit_log, cron_run, error_log, webhook_event — historical, local-only
//   - messages, conversations, conversation_participants, notifications
//                                  — local-only chatter between test users
//
// Usage:
//   # Standard: source defaults to the Replit-local helium DB (the
//   # hardcoded constant below). Just set the target.
//   DATABASE_URL=postgresql://...target... pnpm seed:from-source --confirm
//
//   # Override the source explicitly if you ever want to push between
//   # two non-local databases:
//   SOURCE_DATABASE_URL=postgresql://...other-source... \
//   DATABASE_URL=postgresql://...target... \
//   pnpm seed:from-source --confirm

/** Default source — the Replit-local helium Postgres. `helium` is a
 *  workspace-local network alias provisioned by Replit; the
 *  `postgres:password` credentials are the default for that local
 *  service and unlock nothing outside this workspace. Override by
 *  exporting SOURCE_DATABASE_URL. */
const DEFAULT_SOURCE_URL =
  "postgresql://postgres:password@helium/heliumdb?sslmode=disable"

import { Pool, neonConfig } from "@neondatabase/serverless"
import ws from "ws"

neonConfig.webSocketConstructor = ws

interface TableSpec {
  /** Table identifier as it appears in SQL (quoted if reserved). */
  table: string
  /** Column(s) used as the ON CONFLICT target. Must match a UNIQUE
   *  constraint or unique index in the target schema. */
  conflict: string[]
}

// Order matters — parents before children so FK checks pass on every
// row insert. Within an order tier, alphabetic for readability.
const TABLES: TableSpec[] = [
  // Level 0 — no FKs
  { table: "city", conflict: ["slug"] },
  { table: '"user"', conflict: ["id"] },
  { table: "app_setting", conflict: ["key"] },
  { table: "membership_plan", conflict: ["id"] },
  { table: "waitlist", conflict: ["email", "type"] },

  // Level 1 — depend on level 0
  { table: "account", conflict: ["id"] },              // user
  { table: "category", conflict: ["id"] },             // city
  { table: "sponsorship_tier", conflict: ["id"] },     // city
  { table: "businesses", conflict: ["slug"] },         // city
  { table: "community_post", conflict: ["id"] },       // user

  // Level 2 — depend on level 1
  { table: "business_image", conflict: ["id"] },       // businesses
  { table: "business_category", conflict: ["id"] },    // businesses, category
  { table: "business_subscription", conflict: ["id"] }, // businesses, membership_plan
  { table: "sponsorship", conflict: ["id"] },          // businesses, category, sponsorship_tier
  { table: "post_interest", conflict: ["id"] },        // community_post, user

  // Level 3 — depend on level 2
  { table: "subscription_followup", conflict: ["id"] }, // business_subscription, user
]

function maskUrl(url: string): string {
  try {
    const u = new URL(url)
    if (u.password) u.password = "****"
    return u.toString()
  } catch {
    return url.replace(/:[^@:/]+@/, ":****@")
  }
}

async function tableExists(pool: Pool, name: string): Promise<boolean> {
  const unquoted = name.replace(/^"|"$/g, "")
  const { rows } = await pool.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
    [unquoted],
  )
  return rows.length > 0
}

async function listColumns(pool: Pool, name: string): Promise<string[]> {
  const unquoted = name.replace(/^"|"$/g, "")
  const { rows } = await pool.query<{ column_name: string }>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1
     ORDER BY ordinal_position`,
    [unquoted],
  )
  return rows.map((r) => r.column_name)
}

async function main() {
  if (!process.argv.includes("--confirm")) {
    console.error(
      "Refusing to run without --confirm.\n" +
        "Usage:\n" +
        "  DATABASE_URL=... pnpm seed:from-source --confirm\n" +
        "(SOURCE_DATABASE_URL defaults to the local helium DB; set it to override.)",
    )
    process.exit(2)
  }

  // eslint-disable-next-line no-restricted-syntax
  const sourceUrl = process.env.SOURCE_DATABASE_URL ?? DEFAULT_SOURCE_URL
  // eslint-disable-next-line no-restricted-syntax
  const targetUrl = process.env.DATABASE_URL
  if (!targetUrl) {
    console.error(
      "DATABASE_URL must be set in the environment (the seed target).",
    )
    process.exit(2)
  }
  if (sourceUrl === targetUrl) {
    console.error(
      "SOURCE_DATABASE_URL and DATABASE_URL point at the same database — refusing.",
    )
    process.exit(2)
  }

  const source = new Pool({ connectionString: sourceUrl })
  const target = new Pool({ connectionString: targetUrl })

  try {
    console.log(`\nSeed plan`)
    console.log(`  FROM:   ${maskUrl(sourceUrl)}`)
    console.log(`  INTO:   ${maskUrl(targetUrl)}`)
    console.log(``)

    const plan: Array<{ spec: TableSpec; count: number }> = []
    for (const spec of TABLES) {
      if (!(await tableExists(source, spec.table))) {
        console.log(`  ${spec.table.padEnd(28)} (missing in source — skip)`)
        continue
      }
      const { rows } = await source.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM ${spec.table}`,
      )
      const count = Number.parseInt(rows[0]!.count, 10)
      console.log(`  ${spec.table.padEnd(28)} ${String(count).padStart(6)} rows`)
      plan.push({ spec, count })
    }

    const total = plan.reduce((s, p) => s + p.count, 0)
    console.log(`\n  total: ${total} rows`)

    if (total === 0) {
      console.log("Nothing to seed. Exiting.")
      return
    }

    console.log(`\nApplying in 5 seconds. Ctrl-C to abort.`)
    await new Promise((r) => setTimeout(r, 5000))

    let totalUpserted = 0
    for (const { spec, count } of plan) {
      if (count === 0) {
        console.log(`  ${spec.table.padEnd(28)} (0 rows, skipping)`)
        continue
      }

      // Read column order from the TARGET (so any extra columns added in
      // the source that don't exist in the target are silently dropped
      // rather than crashing the insert).
      const targetCols = await listColumns(target, spec.table)
      const sourceCols = await listColumns(source, spec.table)
      const shared = targetCols.filter((c) => sourceCols.includes(c))
      const skipped = sourceCols.filter((c) => !targetCols.includes(c))
      if (skipped.length > 0) {
        console.log(
          `  ${spec.table}: source has extra columns not in target, will drop: ${skipped.join(", ")}`,
        )
      }

      const colList = shared.map((c) => `"${c}"`).join(", ")
      const conflictTarget = spec.conflict.map((c) => `"${c}"`).join(", ")
      const updateSet = shared
        .filter((c) => !spec.conflict.includes(c))
        .map((c) => `"${c}" = EXCLUDED."${c}"`)
        .join(", ")

      // Stream rows in batches so we don't load huge tables into memory.
      // 200 rows per batch matches a typical pg statement-size sweet spot.
      const BATCH = 200
      let offset = 0
      let upsertedForTable = 0

      while (offset < count) {
        const { rows } = await source.query(
          `SELECT ${colList} FROM ${spec.table} ORDER BY ${spec.conflict[0]} LIMIT ${BATCH} OFFSET ${offset}`,
        )
        if (rows.length === 0) break

        // Build a multi-row INSERT for the batch — one round-trip per
        // batch is dramatically faster than per-row.
        const placeholders: string[] = []
        const values: unknown[] = []
        let i = 1
        for (const row of rows) {
          const cells: string[] = []
          for (const c of shared) {
            cells.push(`$${i++}`)
            values.push((row as Record<string, unknown>)[c])
          }
          placeholders.push(`(${cells.join(", ")})`)
        }

        const sql = updateSet
          ? `INSERT INTO ${spec.table} (${colList}) VALUES ${placeholders.join(", ")}
             ON CONFLICT (${conflictTarget}) DO UPDATE SET ${updateSet}`
          : `INSERT INTO ${spec.table} (${colList}) VALUES ${placeholders.join(", ")}
             ON CONFLICT (${conflictTarget}) DO NOTHING`

        await target.query(sql, values)
        upsertedForTable += rows.length
        offset += rows.length
      }

      console.log(
        `  ${spec.table.padEnd(28)} ${String(upsertedForTable).padStart(6)} upserted`,
      )
      totalUpserted += upsertedForTable
    }

    console.log(`\n✓ Seed complete. ${totalUpserted} rows upserted across ${plan.length} tables.`)
  } finally {
    await source.end()
    await target.end()
  }
}

main().catch((err) => {
  console.error("\n✗ Seed failed:")
  console.error(err)
  process.exit(1)
})
