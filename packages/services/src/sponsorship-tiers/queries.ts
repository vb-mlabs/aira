import "server-only"

import { eq, and, sql } from "drizzle-orm"
import { sponsorshipTiers, sponsorships } from "@aira/db/schema"
import type { Database } from "@aira/db/client"
import type {
  SponsorshipTier,
  SponsorshipTierListItem,
  DisplaySlot,
} from "@aira/validators/sponsorship-tiers"

export function toSponsorshipTier(
  row: typeof sponsorshipTiers.$inferSelect,
): SponsorshipTier {
  // display_slot is `text` at the DB layer (matches the pattern used by
  // membership_plan.tier back when that existed); the CHECK constraint on
  // the column limits it to 'top' | 'mid' | 'regular'. Cast at the mapper
  // so callers see the union, not `string`.
  return {
    ...row,
    display_slot: row.display_slot as DisplaySlot,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  }
}

export async function listSponsorshipTiers(
  db: Database,
  cityId: string,
  includeInactive = false,
): Promise<SponsorshipTierListItem[]> {
  const conditions = includeInactive
    ? [eq(sponsorshipTiers.city_id, cityId)]
    : [eq(sponsorshipTiers.city_id, cityId), eq(sponsorshipTiers.active, true)]

  // Correlated subquery — one COUNT per tier row. Same pattern as
  // listMembershipPlans; trivial at expected tier volumes (~5-20
  // per city). Swap for LEFT JOIN + GROUP BY if it ever needs to scale.
  const sponsorshipCount = sql<number>`(
    SELECT COUNT(*)::int
    FROM ${sponsorships}
    WHERE ${sponsorships.tier_id} = ${sponsorshipTiers.id}
  )`.as("sponsorship_count")

  const rows = await db
    .select({
      tier: sponsorshipTiers,
      sponsorship_count: sponsorshipCount,
    })
    .from(sponsorshipTiers)
    .where(and(...conditions))
    // Priority ordering is functional (lower = better placement); preserve.
    .orderBy(sponsorshipTiers.priority)

  return rows.map(({ tier, sponsorship_count }) => ({
    ...toSponsorshipTier(tier),
    sponsorship_count: Number(sponsorship_count),
  }))
}

export async function getSponsorshipTierById(
  db: Database,
  id: string,
): Promise<SponsorshipTier | null> {
  const rows = await db
    .select()
    .from(sponsorshipTiers)
    .where(eq(sponsorshipTiers.id, id))
    .limit(1)
  return rows[0] ? toSponsorshipTier(rows[0]) : null
}
