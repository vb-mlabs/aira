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
  return db.transaction(async (tx) => {
    const rows = await tx
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
    // tx narrows to PgTransaction at the type level but is API-compatible
    // with Database for the .select/.update/.insert chain recomputeBusinessTier
    // uses. The unknown cast matches the pattern used by the messages
    // service test mock.
    await recomputeBusinessTier(tx as unknown as Database, row.business_id)
    return toSubscription(row)
  })
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
  return db.transaction(async (tx) => {
    const rows = await tx
      .update(businessSubscriptions)
      .set(payload)
      .where(eq(businessSubscriptions.id, id))
      .returning()
    const row = rows[0]
    if (!row) return null
    // tx narrows to PgTransaction at the type level but is API-compatible
    // with Database for the .select/.update/.insert chain recomputeBusinessTier
    // uses. The unknown cast matches the pattern used by the messages
    // service test mock.
    await recomputeBusinessTier(tx as unknown as Database, row.business_id)
    return toSubscription(row)
  })
}

export async function deleteSubscription(
  db: Database,
  id: string,
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const rows = await tx
      .delete(businessSubscriptions)
      .where(eq(businessSubscriptions.id, id))
      .returning({
        id: businessSubscriptions.id,
        business_id: businessSubscriptions.business_id,
      })
    const row = rows[0]
    if (!row) return false
    // Recompute the affected business AFTER the delete commits inside the
    // tx so the active-paid set query no longer sees the row we just removed.
    // tx narrows to PgTransaction at the type level but is API-compatible
    // with Database for the .select/.update/.insert chain recomputeBusinessTier
    // uses. The unknown cast matches the pattern used by the messages
    // service test mock.
    await recomputeBusinessTier(tx as unknown as Database, row.business_id)
    return true
  })
}

/**
 * Daily rollover: flip paid → overdue when end_date has passed.
 *
 * The `.returning({ id, business_id })` projection lets the recompute fire
 * for every distinct business that was affected — without it we'd have to
 * scan the entire businesses table to find what to recompute. The bulk
 * UPDATE + the per-business recompute all share one transaction so a
 * mid-flight failure rolls back the whole flip.
 */
export async function rolloverExpiredSubscriptions(
  db: Database,
): Promise<{ transitioned: number }> {
  return db.transaction(async (tx) => {
    const rows = await tx
      .update(businessSubscriptions)
      .set({ payment_status: "overdue" })
      .where(
        and(
          eq(businessSubscriptions.payment_status, "paid"),
          lt(businessSubscriptions.end_date, new Date()),
        ),
      )
      .returning({
        id: businessSubscriptions.id,
        business_id: businessSubscriptions.business_id,
      })
    // Dedupe — one business may have had multiple paid subs flip in the
    // same run; the recompute only needs to fire once per business.
    const businessIds = new Set(rows.map((r) => r.business_id))
    for (const businessId of businessIds) {
      await recomputeBusinessTier(tx as unknown as Database, businessId)
    }
    return { transitioned: rows.length }
  })
}
