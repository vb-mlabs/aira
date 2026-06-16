import "server-only"

import { eq } from "drizzle-orm"
import {
  businessSubscriptions,
  subscriptionFollowups,
} from "@aira/db/schema"
import type { Database } from "@aira/db/client"
import { createAudit } from "@aira/db/audit"
import { ApiError } from "@aira/api"
import type { CallerContext } from "@aira/api/context"
import type {
  CreateFollowupInput,
  FollowupOutcome,
} from "@aira/validators/subscription-followups"

function auditClient(ctx: CallerContext): "web" | "mobile" {
  return ctx.source === "mobile" ? "mobile" : "web"
}

const DAY_MS = 1000 * 60 * 60 * 24

export interface CreateResult {
  id: string
}

/**
 * Record one follow-up attempt against a business subscription.
 *
 * Audit-around-INSERT pattern (locked 2026-06-14 + 2026-06-15 review):
 *   1. Generate the row id upfront with crypto.randomUUID() — needed so
 *      the audit row carries the same id BEFORE the followup INSERT.
 *   2. Pre-flight: verify the subscription exists. Cheap upfront check
 *      keeps the transaction tight and gives a clean 404.
 *   3. db.transaction:
 *        a. Write the audit row first (audit-before-mutation).
 *        b. INSERT the followup row with the pre-generated id.
 *      If the audit insert fails the followup is never written; if the
 *      followup insert fails the audit rolls back.
 */
export async function create(
  db: Database,
  ctx: CallerContext,
  args: CreateFollowupInput,
): Promise<CreateResult> {
  const [sub] = await db
    .select({ id: businessSubscriptions.id })
    .from(businessSubscriptions)
    .where(eq(businessSubscriptions.id, args.subscriptionId))
    .limit(1)

  if (!sub) {
    throw ApiError.notFound(
      "renewals.subscription_not_found",
      "Subscription not found.",
    )
  }

  const id = crypto.randomUUID()
  const outcome: FollowupOutcome = args.outcome
  const scheduledNext = computeScheduledNext(outcome, args.scheduleDays)
  const note = args.note?.trim() ? args.note.trim() : null

  await db.transaction(async (tx) => {
    const audit = createAudit(tx)
    await audit({
      actorId: ctx.userId,
      action: "business.subscription_followup",
      target: { type: "business_subscription", id: args.subscriptionId },
      meta: {
        kind: "business.subscription_followup",
        outcome,
        note,
        scheduled_next: scheduledNext?.toISOString() ?? null,
      },
      client: auditClient(ctx),
    })

    await tx.insert(subscriptionFollowups).values({
      id,
      subscription_id: args.subscriptionId,
      actor_id: ctx.userId,
      outcome,
      note,
      scheduled_next: scheduledNext,
    })
  })

  return { id }
}

/** Hybrid outcome → scheduled_next mapping (locked 2026-06-15 QA Issue 1):
 *    - reschedule: explicit scheduleDays from operator (validator-enforced 1-60)
 *    - called:     auto +7d (real conversation; pace the next attempt)
 *    - paid, refused: drop from queue permanently — see inActiveQueue filter
 *    - voicemail, no_answer: stay in queue with last-attempt annotation
 */
function computeScheduledNext(
  outcome: FollowupOutcome,
  scheduleDays: number | undefined,
): Date | null {
  if (outcome === "reschedule" && scheduleDays !== undefined) {
    return new Date(Date.now() + scheduleDays * DAY_MS)
  }
  if (outcome === "called") {
    return new Date(Date.now() + 7 * DAY_MS)
  }
  return null
}
