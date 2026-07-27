import "server-only"

import { eq, lt, and, gt, desc } from "drizzle-orm"
import { businessSubscriptions } from "@aira/db/schema"
import type { Database } from "@aira/db/client"
import { ApiError } from "@aira/api/errors"
import {
  RENEWAL_ELIGIBILITY_DAYS,
  type BusinessSubscription,
  type BusinessSubscriptionCreateInput,
  type BusinessSubscriptionUpdateInput,
} from "@aira/validators/business-subscriptions"
import { toSubscription, getSubscriptionById } from "./queries"

export async function createSubscription(
  db: Database,
  input: BusinessSubscriptionCreateInput,
): Promise<BusinessSubscription> {
  // One-active-at-a-time + renewal-window rule: block create when the
  // business already has a subscription whose end_date is further than
  // RENEWAL_ELIGIBILITY_DAYS in the future. A subscription already
  // inside the renewal window (or already expired) is fair game — the
  // admin is recording the renewal itself. payment_status intentionally
  // ignored: overlap is about the covered PERIOD, not the payment state.
  // Race window between check and insert is negligible on this
  // admin-only surface; promote to a partial unique index if it grows.
  const eligibleFrom = new Date(
    Date.now() + RENEWAL_ELIGIBILITY_DAYS * 86_400_000,
  )
  const [blocking] = await db
    .select({
      id: businessSubscriptions.id,
      end_date: businessSubscriptions.end_date,
    })
    .from(businessSubscriptions)
    .where(
      and(
        eq(businessSubscriptions.business_id, input.business_id),
        gt(businessSubscriptions.end_date, eligibleFrom),
      ),
    )
    .orderBy(desc(businessSubscriptions.end_date))
    .limit(1)
  if (blocking) {
    const endDateLabel = blocking.end_date.toISOString().slice(0, 10)
    throw new ApiError({
      status: 409,
      code: "subscription.not_renewable_yet",
      message: `This business already has an active subscription until ${endDateLabel}. A new one can be recorded once it's within ${RENEWAL_ELIGIBILITY_DAYS} days of expiring.`,
    })
  }

  const rows = await db
    .insert(businessSubscriptions)
    .values({
      business_id: input.business_id,
      plan_id: input.plan_id,
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

/**
 * Daily rollover: flip paid → overdue when end_date has passed. Simple
 * bulk UPDATE now that businesses.tier is gone — no per-business
 * recompute needed. Placement is driven entirely by sponsorship.
 */
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
