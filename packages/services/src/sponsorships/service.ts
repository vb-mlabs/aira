import "server-only"

import { eq, lt, gte, and } from "drizzle-orm"
import { sponsorships } from "@aira/db/schema"
import type { Database } from "@aira/db/client"
import type {
  Sponsorship,
  SponsorshipCreateInput,
  SponsorshipUpdateInput,
} from "@aira/validators/sponsorships"
import { toSponsorship, getSponsorshipById } from "./queries"

export async function createSponsorship(
  db: Database,
  input: SponsorshipCreateInput,
): Promise<Sponsorship> {
  const startDate = new Date(input.start_date)
  const endDate = new Date(input.end_date)
  const now = new Date()
  const initialStatus =
    startDate > now ? "scheduled" : endDate < now ? "expired" : "active"

  const rows = await db
    .insert(sponsorships)
    .values({
      business_id: input.business_id,
      category_id: input.category_id,
      tier_id: input.tier_id ?? null,
      status: initialStatus,
      start_date: startDate,
      end_date: endDate,
      amount_cents: input.amount_cents,
      notes: input.notes ?? null,
      recorded_by: input.recorded_by ?? null,
    })
    .returning()
  const row = rows[0]
  if (!row) throw new Error("insert sponsorship returned no row")
  return toSponsorship(row)
}

export async function updateSponsorship(
  db: Database,
  input: SponsorshipUpdateInput,
): Promise<Sponsorship | null> {
  const { id, start_date, end_date, ...rest } = input
  const payload: Partial<typeof sponsorships.$inferInsert> = { ...rest }
  if (start_date !== undefined) payload.start_date = new Date(start_date)
  if (end_date !== undefined) payload.end_date = new Date(end_date)
  if (Object.keys(payload).length === 0) return getSponsorshipById(db, id)
  const rows = await db
    .update(sponsorships)
    .set(payload)
    .where(eq(sponsorships.id, id))
    .returning()
  const row = rows[0]
  if (!row) return null
  return toSponsorship(row)
}

export async function cancelSponsorship(
  db: Database,
  id: string,
): Promise<Sponsorship | null> {
  const rows = await db
    .update(sponsorships)
    .set({ status: "cancelled" })
    .where(eq(sponsorships.id, id))
    .returning()
  const row = rows[0]
  if (!row) return null
  return toSponsorship(row)
}

/** Cron rollover: scheduled → active. */
export async function transitionSponsorshipsToActive(
  db: Database,
): Promise<{ transitioned: number }> {
  const now = new Date()
  const rows = await db
    .update(sponsorships)
    .set({ status: "active" })
    .where(
      and(
        eq(sponsorships.status, "scheduled"),
        lt(sponsorships.start_date, now),
        gte(sponsorships.end_date, now),
      ),
    )
    .returning({ id: sponsorships.id })
  return { transitioned: rows.length }
}

/** Cron rollover: active → expired. */
export async function transitionSponsorshipsToExpired(
  db: Database,
): Promise<{ transitioned: number }> {
  const rows = await db
    .update(sponsorships)
    .set({ status: "expired" })
    .where(
      and(
        eq(sponsorships.status, "active"),
        lt(sponsorships.end_date, new Date()),
      ),
    )
    .returning({ id: sponsorships.id })
  return { transitioned: rows.length }
}
