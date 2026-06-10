import "server-only"

import { eq, lt, and } from "drizzle-orm"
import { businessSubscriptions } from "@aira/db/schema"
import type { Database } from "@aira/db/client"
import type {
  BusinessSubscription,
  BusinessSubscriptionCreateInput,
  BusinessSubscriptionUpdateInput,
} from "@aira/validators/business-subscriptions"
import { toSubscription, getSubscriptionById } from "./queries"

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
