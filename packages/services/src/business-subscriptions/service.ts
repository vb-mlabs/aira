import "server-only"

import { eq, lt, and } from "drizzle-orm"
import { businesses, businessSubscriptions } from "@aira/db/schema"
import type { Database } from "@aira/db/client"
import type { BusinessTier } from "@aira/validators/businesses"
import type {
  BusinessSubscription,
  BusinessSubscriptionCreateInput,
  BusinessSubscriptionUpdateInput,
} from "@aira/validators/business-subscriptions"
import {
  findActivePaidPlansForBusiness,
  toSubscription,
  getSubscriptionById,
} from "./queries"

// Tier-priority lookup used by recomputeBusinessTier. Lower number = better
// placement. Kept here (not in the validators package) because it's a
// service-layer ordering concern, not a wire-contract concern.
const TIER_PRIORITY: Record<BusinessTier, number> = {
  tier1: 1,
  tier2: 2,
  tier3: 3,
}

/**
 * Recomputes `businesses.tier` for `businessId` from the current active-paid
 * subscription set. Best (lowest TIER_PRIORITY) wins. Empty set → tier3.
 *
 * Pass `tx` (or the bare `db`) so callers can include the recompute inside
 * the same transaction as the mutation that triggered it. Concurrent
 * subscription mutations for the same business are serialised by the
 * transaction (each sees the post-mutation set after its own write but
 * commits in order; last write wins for the column, which is fine because
 * the recompute is idempotent over the same set).
 */
export async function recomputeBusinessTier(
  tx: Database,
  businessId: string,
): Promise<{ tier: BusinessTier }> {
  const plans = await findActivePaidPlansForBusiness(tx, businessId)
  let best: BusinessTier = "tier3"
  for (const { tier } of plans) {
    if (TIER_PRIORITY[tier] < TIER_PRIORITY[best]) {
      best = tier
    }
  }
  await tx
    .update(businesses)
    .set({ tier: best })
    .where(eq(businesses.id, businessId))
  return { tier: best }
}

export async function createSubscription(
  db: Database,
  input: BusinessSubscriptionCreateInput,
): Promise<BusinessSubscription> {
  const rows = await db
    .insert(businessSubscriptions)
    .values({
      business_id: input.business_id,
      plan_id: input.plan_id ?? null,
      payment_status: input.payment_status,
      start_date: new Date(input.start_date),
      end_date: new Date(input.end_date),
      amount_cents: input.amount_cents,
      payment_evidence_url: input.payment_evidence_url ?? null,
      notes: input.notes ?? null,
      recorded_by: input.recorded_by ?? null,
    })
    .returning()
  const row = rows[0]
  if (!row) throw new Error("insert business_subscription returned no row")
  return toSubscription(row)
}

export async function updateSubscription(
  db: Database,
  input: BusinessSubscriptionUpdateInput,
): Promise<BusinessSubscription | null> {
  const { id, start_date, end_date, ...rest } = input
  const payload: Partial<typeof businessSubscriptions.$inferInsert> = { ...rest }
  if (start_date !== undefined) payload.start_date = new Date(start_date)
  if (end_date !== undefined) payload.end_date = new Date(end_date)
  if (Object.keys(payload).length === 0) return getSubscriptionById(db, id)
  const rows = await db
    .update(businessSubscriptions)
    .set(payload)
    .where(eq(businessSubscriptions.id, id))
    .returning()
  const row = rows[0]
  if (!row) return null
  return toSubscription(row)
}

export async function deleteSubscription(
  db: Database,
  id: string,
): Promise<boolean> {
  const rows = await db
    .delete(businessSubscriptions)
    .where(eq(businessSubscriptions.id, id))
    .returning({ id: businessSubscriptions.id })
  return rows.length > 0
}

/** Daily rollover: flip paid → overdue when end_date has passed. */
export async function rolloverExpiredSubscriptions(
  db: Database,
): Promise<{ transitioned: number }> {
  const rows = await db
    .update(businessSubscriptions)
    .set({ payment_status: "overdue" })
    .where(
      and(
        eq(businessSubscriptions.payment_status, "paid"),
        lt(businessSubscriptions.end_date, new Date()),
      ),
    )
    .returning({ id: businessSubscriptions.id })
  return { transitioned: rows.length }
}
