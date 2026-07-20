import "server-only"

import { eq } from "drizzle-orm"
import { sponsorships, sponsorshipTiers } from "@aira/db/schema"
import type { Database } from "@aira/db/client"
import type {
  Sponsorship,
  SponsorshipListItem,
} from "@aira/validators/sponsorships"

export function toSponsorship(
  row: typeof sponsorships.$inferSelect,
): Sponsorship {
  return {
    ...row,
    tier_id: row.tier_id ?? null,
    notes: row.notes ?? null,
    payment_evidence_url: row.payment_evidence_url ?? null,
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
): Promise<SponsorshipListItem[]> {
  // LEFT JOIN sponsorship_tier so the admin sponsorships table can
  // render the tier NAME instead of the raw tier_id. LEFT because
  // tier_id is nullable AND the FK is onDelete: "set null" — an
  // orphaned reference should still surface the sponsorship row.
  const rows = await db
    .select({
      sp: sponsorships,
      tier_name: sponsorshipTiers.name,
    })
    .from(sponsorships)
    .leftJoin(sponsorshipTiers, eq(sponsorships.tier_id, sponsorshipTiers.id))
    .where(eq(sponsorships.business_id, businessId))
    .orderBy(sponsorships.end_date)
  return rows.map(({ sp, tier_name }) => ({
    ...toSponsorship(sp),
    tier_name: tier_name ?? null,
  }))
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
