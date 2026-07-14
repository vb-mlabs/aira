import "server-only"

import { eq, and, ne, sql } from "drizzle-orm"
import { sponsorshipTiers, sponsorships } from "@aira/db/schema"
import { ApiError } from "@aira/api"
import type { Database } from "@aira/db/client"
import type {
  SponsorshipTier,
  SponsorshipTierCreateInput,
  SponsorshipTierUpdateInput,
} from "@aira/validators/sponsorship-tiers"
import { toSponsorshipTier, getSponsorshipTierById } from "./queries"

// Domain error surfaced when hard-delete is attempted on a tier that
// still has sponsorship references. The operation layer translates
// this to ApiError.badRequest with a stable code the UI can key off.
export class SponsorshipTierHasSponsorshipsError extends Error {
  constructor(public readonly count: number) {
    super(
      `This tier has ${count} sponsorship${count === 1 ? "" : "s"}. Deactivate it instead to retire without losing history.`,
    )
    this.name = "SponsorshipTierHasSponsorshipsError"
  }
}

async function checkPriorityConflict(
  db: Database,
  cityId: string,
  priority: number,
  excludeId?: string,
): Promise<void> {
  const conditions = excludeId
    ? [
        eq(sponsorshipTiers.city_id, cityId),
        eq(sponsorshipTiers.priority, priority),
        ne(sponsorshipTiers.id, excludeId),
      ]
    : [
        eq(sponsorshipTiers.city_id, cityId),
        eq(sponsorshipTiers.priority, priority),
      ]
  const existing = await db
    .select({ id: sponsorshipTiers.id, name: sponsorshipTiers.name })
    .from(sponsorshipTiers)
    .where(and(...conditions))
    .limit(1)
  if (existing[0]) {
    throw ApiError.badRequest(
      "sponsorship_tier.priority_taken",
      `Priority ${priority} is already used by tier "${existing[0].name}"`,
    )
  }
}

export async function createSponsorshipTier(
  db: Database,
  input: SponsorshipTierCreateInput,
): Promise<SponsorshipTier> {
  await checkPriorityConflict(db, input.city_id, input.priority)
  const rows = await db
    .insert(sponsorshipTiers)
    .values({
      city_id: input.city_id,
      name: input.name,
      priority: input.priority,
      display_slot: input.display_slot,
    })
    .returning()
  const row = rows[0]
  if (!row) throw new Error("insert sponsorship_tier returned no row")
  return toSponsorshipTier(row)
}

export async function updateSponsorshipTier(
  db: Database,
  input: SponsorshipTierUpdateInput,
): Promise<SponsorshipTier | null> {
  const { id, ...rest } = input
  if (rest.priority !== undefined) {
    const current = await getSponsorshipTierById(db, id)
    if (current) {
      await checkPriorityConflict(db, current.city_id, rest.priority, id)
    }
  }
  if (Object.keys(rest).length === 0) return getSponsorshipTierById(db, id)
  const rows = await db
    .update(sponsorshipTiers)
    .set(rest)
    .where(eq(sponsorshipTiers.id, id))
    .returning()
  const row = rows[0]
  if (!row) return null
  return toSponsorshipTier(row)
}

export async function deactivateSponsorshipTier(
  db: Database,
  id: string,
): Promise<SponsorshipTier | null> {
  return updateSponsorshipTier(db, { id, active: false })
}

/**
 * Hard-delete a sponsorship tier. Refuses when any row in
 * `sponsorships` still references it (past OR present — checks row
 * count, not status). Refusing preserves audit / billing history that
 * would otherwise lose its tier reference to the FK's `onDelete: "set
 * null"` config.
 *
 * Throws `SponsorshipTierHasSponsorshipsError` on FK guard failure;
 * returns `null` when the tier doesn't exist; returns the deleted row
 * on success.
 */
export async function deleteSponsorshipTier(
  db: Database,
  id: string,
): Promise<SponsorshipTier | null> {
  const [countRow] = await db
    .select({ n: sql<number>`COUNT(*)::int` })
    .from(sponsorships)
    .where(eq(sponsorships.tier_id, id))
  const count = Number(countRow?.n ?? 0)
  if (count > 0) throw new SponsorshipTierHasSponsorshipsError(count)

  const rows = await db
    .delete(sponsorshipTiers)
    .where(eq(sponsorshipTiers.id, id))
    .returning()
  const row = rows[0]
  if (!row) return null
  return toSponsorshipTier(row)
}
