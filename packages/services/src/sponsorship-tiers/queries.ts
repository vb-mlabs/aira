import "server-only"

import { eq, and } from "drizzle-orm"
import { sponsorshipTiers } from "@aira/db/schema"
import type { Database } from "@aira/db/client"
import type { SponsorshipTier } from "@aira/validators/sponsorship-tiers"

export function toSponsorshipTier(
  row: typeof sponsorshipTiers.$inferSelect,
): SponsorshipTier {
  return {
    ...row,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  }
}

export async function listSponsorshipTiers(
  db: Database,
  cityId: string,
  includeInactive = false,
): Promise<SponsorshipTier[]> {
  const conditions = includeInactive
    ? [eq(sponsorshipTiers.city_id, cityId)]
    : [eq(sponsorshipTiers.city_id, cityId), eq(sponsorshipTiers.active, true)]
  const rows = await db
    .select()
    .from(sponsorshipTiers)
    .where(and(...conditions))
    .orderBy(sponsorshipTiers.priority)
  return rows.map(toSponsorshipTier)
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
