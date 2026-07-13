// Audit helper for the placement-single-axis migration.
//
//   --report (default) — pre-migration snapshot: for every business whose
//     currently active + paid subscription plan is tier1 or tier2, list
//     business name, plan name, plan tier, and subscription end date. This
//     is the artifact for the client conversation ("these customers are
//     losing their subscription-derived placement — offer a courtesy
//     sponsorship if you want to preserve their experience").
//
//   --verify — post-migration check: assert (a) `businesses.tier` and
//     `membership_plan.tier` columns no longer exist via information_schema,
//     (b) every `sponsorship_tier` row has a non-NULL `display_slot`.
//     Exits non-zero if any check fails.

import { Pool, neonConfig } from "@neondatabase/serverless"
import ws from "ws"

neonConfig.webSocketConstructor = ws

const mode = process.argv.includes("--verify") ? "verify" : "report"

interface TierHolderRow {
  business_id: string
  business_name: string
  plan_id: string
  plan_name: string
  plan_tier: string
  subscription_end_date: string
}

async function runReport(pool: Pool): Promise<void> {
  const res = await pool.query<TierHolderRow>(`
    SELECT
      b.id AS business_id,
      b.name AS business_name,
      mp.id AS plan_id,
      mp.name AS plan_name,
      mp.tier AS plan_tier,
      bs.end_date::text AS subscription_end_date
    FROM business_subscription bs
    JOIN businesses b ON b.id = bs.business_id
    JOIN membership_plan mp ON mp.id = bs.plan_id
    WHERE mp.tier IN ('tier1', 'tier2')
    AND bs.payment_status = 'paid'
    AND now() BETWEEN bs.start_date AND bs.end_date
    AND b.deleted_at IS NULL
    ORDER BY mp.tier, b.name
  `)

  console.log(
    `\n=== Businesses on tier1/tier2 paid subscriptions (losing placement boost) ===`,
  )
  console.log(`count: ${res.rows.length}`)
  for (const r of res.rows) {
    console.log(
      `  ${r.plan_tier} · ${r.business_name} [${r.business_id}] · plan "${r.plan_name}" · ends ${r.subscription_end_date.slice(0, 10)}`,
    )
  }

  console.log(
    `\nBaseline: ${res.rows.length} customer${res.rows.length === 1 ? "" : "s"} affected.\n`,
  )
}

async function runVerify(pool: Pool): Promise<void> {
  const problems: string[] = []

  const membershipTierCol = await pool.query<{ count: string }>(`
    SELECT COUNT(*)::text AS count
    FROM information_schema.columns
    WHERE table_name = 'membership_plan' AND column_name = 'tier'
  `)
  if (Number(membershipTierCol.rows[0]?.count ?? 0) > 0) {
    problems.push("membership_plan.tier column still exists")
  }

  const businessesTierCol = await pool.query<{ count: string }>(`
    SELECT COUNT(*)::text AS count
    FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'tier'
  `)
  if (Number(businessesTierCol.rows[0]?.count ?? 0) > 0) {
    problems.push("businesses.tier column still exists")
  }

  const displaySlotCol = await pool.query<{ count: string }>(`
    SELECT COUNT(*)::text AS count
    FROM information_schema.columns
    WHERE table_name = 'sponsorship_tier' AND column_name = 'display_slot'
  `)
  if (Number(displaySlotCol.rows[0]?.count ?? 0) === 0) {
    problems.push("sponsorship_tier.display_slot column missing")
  } else {
    const missingSlot = await pool.query<{ count: string }>(`
      SELECT COUNT(*)::text AS count
      FROM sponsorship_tier
      WHERE display_slot IS NULL OR display_slot NOT IN ('top', 'mid', 'regular')
    `)
    const n = Number(missingSlot.rows[0]?.count ?? 0)
    if (n > 0) {
      problems.push(`${n} sponsorship_tier row(s) have NULL or invalid display_slot`)
    }
  }

  if (problems.length === 0) {
    console.log(
      "verify OK: tier columns removed, display_slot present and populated.",
    )
    return
  }

  console.error("verify FAILED:")
  for (const p of problems) console.error(`  ${p}`)
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
