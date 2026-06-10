import "server-only"

import { eq, and, inArray, sql, count } from "drizzle-orm"
import { sponsorships, sponsorshipTiers } from "@aira/db/schema"
import type { Database } from "@aira/db/client"
import type { Sponsorship } from "@aira/validators/sponsorships"

export function toSponsorship(
  row: typeof sponsorships.$inferSelect,
): Sponsorship {
  return {
    ...row,
    tier_id: row.tier_id ?? null,
    notes: row.notes ?? null,
    recorded_by: row.recorded_by ?? null,
    start_date: row.start_date.toISOString(),
    end_date: row.end_date.toISOString(),
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  }
}

export async function listSponsorshipsByBusiness(
  db: Database,
  businessId: string,
): Promise<Sponsorship[]> {
  const rows = await db
    .select()
    .from(sponsorships)
    .where(eq(sponsorships.business_id, businessId))
    .orderBy(sponsorships.end_date)
  return rows.map(toSponsorship)
}

export async function getSponsorshipById(
  db: Database,
  id: string,
): Promise<Sponsorship | null> {
  const rows = await db
    .select()
    .from(sponsorships)
    .where(eq(sponsorships.id, id))
    .limit(1)
  return rows[0] ? toSponsorship(rows[0]) : null
}

export interface ActiveSponsorshipForSort {
  sponsorship_id: string
  business_id: string
  tier_priority: number | null
  amount_cents: number
}

/**
 * Counts active + scheduled sponsorships for a (tier, category) pair.
 * Used to enforce max_slots before INSERT.
 */
export async function countActiveSponsorships(
  db: Database,
  tierId: string,
  categoryId: string,
): Promise<number> {
  const result = await db
    .select({ n: count() })
    .from(sponsorships)
    .where(
      and(
        eq(sponsorships.tier_id, tierId),
        eq(sponsorships.category_id, categoryId),
        inArray(sponsorships.status, ["active", "scheduled"]),
      ),
    )
  return result[0]?.n ?? 0
}

/** Returns currently-active sponsorships for a category — used by the sort JOIN. */
export async function listActiveSponsorshipsForCategory(
  db: Database,
  categoryId: string,
): Promise<ActiveSponsorshipForSort[]> {
  const rows = await db
    .select({
      sponsorship_id: sponsorships.id,
      business_id: sponsorships.business_id,
      tier_priority: sponsorshipTiers.priority,
      amount_cents: sponsorships.amount_cents,
    })
    .from(sponsorships)
    .leftJoin(sponsorshipTiers, eq(sponsorships.tier_id, sponsorshipTiers.id))
    .where(
      and(
        eq(sponsorships.category_id, categoryId),
        eq(sponsorships.status, "active"),
        sql`now() BETWEEN ${sponsorships.start_date} AND ${sponsorships.end_date}`,
      ),
    )
  return rows.map((r) => ({
    sponsorship_id: r.sponsorship_id,
    business_id: r.business_id,
    tier_priority: r.tier_priority ?? null,
    amount_cents: r.amount_cents,
  }))
}
