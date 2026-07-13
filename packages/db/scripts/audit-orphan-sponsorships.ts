// Audit helper for the per-business-sponsorship migration.
//
//   --report (default) — pre-migration snapshot:
//     (a) orphan sponsorships whose category_id is NOT in the business's
//         business_category set (these already silently don't render on any
//         listing page)
//     (b) businesses with >1 active/scheduled sponsorship row (candidates
//         the dedup CTE will collapse — previews which id survives per the
//         rule: highest tier priority -> latest end_date -> max amount -> id)
//
//   --verify — post-migration check: assert zero rows match
//     SELECT business_id FROM sponsorship
//     WHERE status IN ('active','scheduled')
//     GROUP BY business_id HAVING COUNT(*) > 1
//   Exits non-zero if any found. --verify does NOT reference category_id,
//   so it's safe to run after the column is dropped.

import { Pool, neonConfig } from "@neondatabase/serverless"
import ws from "ws"

neonConfig.webSocketConstructor = ws

const mode = process.argv.includes("--verify") ? "verify" : "report"

interface OrphanRow {
  sponsorship_id: string
  business_id: string
  business_name: string
  category_id: string
  status: string
  amount_cents: number
}

interface DuplicateRow {
  business_id: string
  business_name: string
  candidates: Array<{
    id: string
    tier_id: string | null
    tier_priority: number | null
    end_date: string
    amount_cents: number
    status: string
    category_id: string
  }>
  predicted_winner: string
}

async function runReport(pool: Pool): Promise<void> {
  // (a) Orphan sponsorships
  const orphansRes = await pool.query<OrphanRow>(`
    SELECT
      s.id AS sponsorship_id,
      s.business_id,
      b.name AS business_name,
      s.category_id,
      s.status,
      s.amount_cents
    FROM sponsorship s
    JOIN businesses b ON b.id = s.business_id
    WHERE s.status IN ('active', 'scheduled')
    AND NOT EXISTS (
      SELECT 1 FROM business_category bc
      WHERE bc.business_id = s.business_id
      AND bc.category_id = s.category_id
    )
    ORDER BY b.name, s.end_date
  `)

  console.log(`\n=== Orphan sponsorships (category not in business's set) ===`)
  console.log(`count: ${orphansRes.rows.length}`)
  for (const r of orphansRes.rows) {
    console.log(
      `  ${r.business_name} [${r.business_id}] · sponsorship ${r.sponsorship_id} · status=${r.status} · cat=${r.category_id} · $${(r.amount_cents / 100).toFixed(2)}`,
    )
  }

  // (b) Multi-row-per-business (dedup preview)
  const dupsRes = await pool.query<{
    business_id: string
    business_name: string
    id: string
    tier_id: string | null
    tier_priority: number | null
    end_date: string
    amount_cents: number
    status: string
    category_id: string
  }>(`
    WITH multi_biz AS (
      SELECT business_id
      FROM sponsorship
      WHERE status IN ('active', 'scheduled')
      GROUP BY business_id
      HAVING COUNT(*) > 1
    )
    SELECT
      s.business_id,
      b.name AS business_name,
      s.id,
      s.tier_id,
      st.priority AS tier_priority,
      s.end_date::text AS end_date,
      s.amount_cents,
      s.status,
      s.category_id
    FROM sponsorship s
    JOIN businesses b ON b.id = s.business_id
    LEFT JOIN sponsorship_tier st ON st.id = s.tier_id
    WHERE s.business_id IN (SELECT business_id FROM multi_biz)
    AND s.status IN ('active', 'scheduled')
    ORDER BY b.name, COALESCE(st.priority, 999999), s.end_date DESC, s.amount_cents DESC, s.id
  `)

  const grouped = new Map<string, DuplicateRow>()
  for (const r of dupsRes.rows) {
    let entry = grouped.get(r.business_id)
    if (!entry) {
      entry = {
        business_id: r.business_id,
        business_name: r.business_name,
        candidates: [],
        predicted_winner: "",
      }
      grouped.set(r.business_id, entry)
    }
    entry.candidates.push({
      id: r.id,
      tier_id: r.tier_id,
      tier_priority: r.tier_priority,
      end_date: r.end_date,
      amount_cents: r.amount_cents,
      status: r.status,
      category_id: r.category_id,
    })
  }
  // The SQL ORDER BY matches the dedup rule, so the first row per business wins.
  for (const entry of grouped.values()) {
    entry.predicted_winner = entry.candidates[0]?.id ?? "(none)"
  }

  console.log(
    `\n=== Businesses with multiple active/scheduled sponsorships ===`,
  )
  console.log(`count: ${grouped.size}`)
  for (const entry of grouped.values()) {
    console.log(`\n  ${entry.business_name} [${entry.business_id}]`)
    console.log(`    predicted winner (per dedup rule): ${entry.predicted_winner}`)
    for (const c of entry.candidates) {
      const marker = c.id === entry.predicted_winner ? "→" : " "
      console.log(
        `    ${marker} ${c.id} · tier_priority=${c.tier_priority ?? "null"} · end=${c.end_date.slice(0, 10)} · $${(c.amount_cents / 100).toFixed(2)} · ${c.status} · cat=${c.category_id}`,
      )
    }
  }

  console.log(
    `\nBaseline: ${orphansRes.rows.length} orphan(s), ${grouped.size} business(es) with duplicate live rows.\n`,
  )
}

async function runVerify(pool: Pool): Promise<void> {
  const res = await pool.query<{ business_id: string; n: number }>(`
    SELECT business_id, COUNT(*)::int AS n
    FROM sponsorship
    WHERE status IN ('active', 'scheduled')
    GROUP BY business_id
    HAVING COUNT(*) > 1
  `)

  if (res.rows.length === 0) {
    console.log("verify OK: zero businesses with duplicate active/scheduled sponsorships.")
    return
  }

  console.error(
    `verify FAILED: ${res.rows.length} business(es) still hold multiple active/scheduled sponsorships:`,
  )
  for (const r of res.rows) {
    console.error(`  ${r.business_id} · ${r.n} rows`)
  }
  process.exit(1)
}

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error("DATABASE_URL is required.")
    process.exit(1)
  }
  const pool = new Pool({ connectionString: url })
  try {
    if (mode === "verify") {
      await runVerify(pool)
    } else {
      await runReport(pool)
    }
  } finally {
    await pool.end()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
