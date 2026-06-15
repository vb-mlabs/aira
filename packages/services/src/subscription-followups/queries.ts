import "server-only"

import { and, desc, eq, inArray, sql } from "drizzle-orm"
import {
  businesses,
  businessSubscriptions,
  membershipPlans,
  subscriptionFollowups,
  user,
} from "@aira/db/schema"
import type { Database } from "@aira/db/client"
import type {
  FollowupHistoryRow,
  FollowupQueueRow,
} from "@aira/validators/subscription-followups"

// Hard cap on queue rows returned per request. The page surfaces a
// "showing 100 of N" hint when truncated. Atlanta-only MVP volume
// makes 100 generous; raise the cap when the directory outgrows it.
export const QUEUE_PAGE_CAP = 100

// Correlated subqueries — Drizzle's .orderBy() builder doesn't speak
// LATERAL JOIN (locked 2026-06-10), so the same idiom as
// homepageSponsoredFlag is used: one fragment per column needed from
// the latest followup row, each parameterised on the business_subscription
// id of the outer row.
const latestOutcome = sql`(
  SELECT outcome FROM subscription_followup
  WHERE subscription_id = ${businessSubscriptions.id}
  ORDER BY created_at DESC LIMIT 1
)`

const latestFollowupAt = sql`(
  SELECT created_at FROM subscription_followup
  WHERE subscription_id = ${businessSubscriptions.id}
  ORDER BY created_at DESC LIMIT 1
)`

const latestScheduledNext = sql`(
  SELECT scheduled_next FROM subscription_followup
  WHERE subscription_id = ${businessSubscriptions.id}
  ORDER BY created_at DESC LIMIT 1
)`

// A subscription drops out of the queue iff its LATEST followup row
// (a) marked it paid, or (b) reschedules it to a future timestamp.
// Encoded as a NOT EXISTS against the same "latest-by-created_at" shape
// the SELECTs use.
const inActiveQueue = sql`NOT EXISTS (
  SELECT 1 FROM subscription_followup sf
  WHERE sf.subscription_id = ${businessSubscriptions.id}
    AND sf.created_at = (
      SELECT MAX(sf2.created_at)
      FROM subscription_followup sf2
      WHERE sf2.subscription_id = ${businessSubscriptions.id}
    )
    AND (
      sf.outcome = 'paid'
      OR (sf.scheduled_next IS NOT NULL AND sf.scheduled_next > now())
    )
)`

export interface ListQueueOpts {
  withinDays: number
}

export interface ListQueueResult {
  items: FollowupQueueRow[]
  total: number
}

/**
 * Renewals queue — derived view: every subscription whose end_date is
 * inside the window AND whose latest followup neither marks it paid nor
 * reschedules it past now(). Ordered overdue-first, then by closest
 * expiry. Capped at QUEUE_PAGE_CAP; total reports the unbounded count
 * so the page can show "showing 100 of N".
 */
export async function listQueue(
  db: Database,
  opts: ListQueueOpts,
): Promise<ListQueueResult> {
  const days = Math.trunc(opts.withinDays)
  const windowUpper = sql`now() + (${sql.raw(String(days))} || ' days')::interval`

  const where = and(
    inArray(businessSubscriptions.payment_status, ["paid", "overdue"]),
    // Upper bound = within N days from now. No lower bound: long-overdue
    // subscriptions remain in the queue until an admin records a follow-up
    // outcome (paid / refused / etc.). The "overdue first" sort surfaces
    // them at the top.
    sql`${businessSubscriptions.end_date} <= ${windowUpper}`,
    inActiveQueue,
  )

  const rows = await db
    .select({
      subscription_id: businessSubscriptions.id,
      business_id: businesses.id,
      business_name: businesses.name,
      plan_name: membershipPlans.name,
      payment_status: businessSubscriptions.payment_status,
      end_date: businessSubscriptions.end_date,
      contact_phone: businesses.phone,
      contact_whatsapp: businesses.whatsapp_number,
      last_outcome: latestOutcome,
      last_followup_at: latestFollowupAt,
      scheduled_next: latestScheduledNext,
    })
    .from(businessSubscriptions)
    .innerJoin(
      businesses,
      eq(businessSubscriptions.business_id, businesses.id),
    )
    .leftJoin(
      membershipPlans,
      eq(businessSubscriptions.plan_id, membershipPlans.id),
    )
    .where(where)
    .orderBy(
      // Overdue first, then closest expiry next.
      sql`CASE WHEN ${businessSubscriptions.end_date} < now() THEN 0 ELSE 1 END`,
      businessSubscriptions.end_date,
    )
    .limit(QUEUE_PAGE_CAP + 1)

  const truncated = rows.length > QUEUE_PAGE_CAP
  const slice = truncated ? rows.slice(0, QUEUE_PAGE_CAP) : rows

  let total = slice.length
  if (truncated) {
    // Only pay for the COUNT(*) when we know there's overflow. Saves the
    // round-trip on the common case.
    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(businessSubscriptions)
      .where(where)
    total = countRow?.count ?? slice.length
  }

  const items: FollowupQueueRow[] = slice.map((r) => {
    const endDate = r.end_date
    const days_remaining = Math.ceil(
      (endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    )
    return {
      subscription_id: r.subscription_id,
      business_id: r.business_id,
      business_name: r.business_name,
      plan_name: r.plan_name ?? null,
      payment_status: r.payment_status,
      end_date: endDate.toISOString(),
      days_remaining,
      contact_phone: r.contact_phone ?? null,
      contact_whatsapp: r.contact_whatsapp ?? null,
      last_outcome:
        (r.last_outcome as FollowupQueueRow["last_outcome"]) ?? null,
      last_followup_at: toIso(r.last_followup_at),
      scheduled_next: toIso(r.scheduled_next),
    }
  })

  return { items, total }
}

export interface ListForSubscriptionOpts {
  subscriptionId: string
  limit?: number
}

/**
 * Followup history for one subscription — surfaced in the modal's
 * recent-attempts panel. Newest first.
 */
export async function listForSubscription(
  db: Database,
  opts: ListForSubscriptionOpts,
): Promise<FollowupHistoryRow[]> {
  const rows = await db
    .select({
      id: subscriptionFollowups.id,
      outcome: subscriptionFollowups.outcome,
      note: subscriptionFollowups.note,
      scheduled_next: subscriptionFollowups.scheduled_next,
      actor_id: subscriptionFollowups.actor_id,
      actor_email: user.email,
      created_at: subscriptionFollowups.created_at,
    })
    .from(subscriptionFollowups)
    .leftJoin(user, eq(subscriptionFollowups.actor_id, user.id))
    .where(eq(subscriptionFollowups.subscription_id, opts.subscriptionId))
    .orderBy(desc(subscriptionFollowups.created_at))
    .limit(opts.limit ?? 20)

  return rows.map((r) => ({
    id: r.id,
    outcome: r.outcome,
    note: r.note ?? null,
    scheduled_next: r.scheduled_next?.toISOString() ?? null,
    actor_id: r.actor_id ?? null,
    actor_email: r.actor_email ?? null,
    created_at: r.created_at.toISOString(),
  }))
}

function toIso(v: unknown): string | null {
  if (v === null || v === undefined) return null
  if (v instanceof Date) return v.toISOString()
  // Drizzle returns timestamp columns from raw sql fragments as strings
  // already serialised to ISO-ish form. Normalise via Date for safety.
  const d = new Date(v as string)
  return Number.isFinite(d.getTime()) ? d.toISOString() : null
}
