import "server-only"

import { eq } from "drizzle-orm"
import { sponsorships } from "@aira/db/schema"
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
