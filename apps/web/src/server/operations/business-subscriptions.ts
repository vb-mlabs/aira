import "server-only"

import { businessSubscriptions as subsService } from "@aira/services"
import {
  BusinessSubscriptionCreateInputSchema,
  BusinessSubscriptionUpdateInputSchema,
  BusinessSubscriptionListOutputSchema,
} from "@aira/validators/business-subscriptions"
import { z } from "zod"
import { ApiError } from "@aira/api"
import { createAudit } from "@aira/db/audit"
import { defineOperation } from "./index"

export const listSubscriptionsOp = defineOperation({
  name: "admin.subscriptions.list",
  // No .strict() — runFromRequest merges the URL [id] path param into raw;
  // stripping unknown keys lets business_id from the query through cleanly.
  input: z.object({ business_id: z.string().min(1) }),
  output: BusinessSubscriptionListOutputSchema,
  permission: "admin",
  handler: async (db, _ctx, { business_id }) => {
    const items = await subsService.listSubscriptionsByBusiness(db, business_id)
    return { items }
  },
})

export const createSubscriptionOp = defineOperation({
  name: "admin.subscriptions.create",
  // .strip() — runFromRequest injects the URL [id] path param; stripping
  // unknown keys lets the body's business_id through without rejection.
  input: BusinessSubscriptionCreateInputSchema.strip(),
  output: z.object({ subscription: z.any() }),
  permission: "admin",
  handler: async (db, ctx, input) => {
    const audit = createAudit(db)
    await audit({
      actorId: ctx.userId,
      action: "business.subscription_recorded",
      target: { type: "business", id: input.business_id },
      meta: {
        kind: "business.subscription_recorded",
        payment_status: input.payment_status,
        plan_id: input.plan_id ?? null,
        end_date: input.end_date,
      },
    })
    const subscription = await subsService.createSubscription(db, input)
    return { subscription }
  },
})

export const updateSubscriptionOp = defineOperation({
  name: "admin.subscriptions.update",
  input: BusinessSubscriptionUpdateInputSchema,
  output: z.object({ subscription: z.any() }),
  permission: "admin",
  handler: async (db, ctx, input) => {
    // Resolve first so we can key the audit row to the parent business —
    // the update input doesn't carry business_id. 404 here short-circuits
    // the update path with the same code the handler would emit below.
    const existing = await subsService.getSubscriptionById(db, input.id)
    if (!existing)
      throw ApiError.notFound("subscription.not_found", "Subscription not found")
    const audit = createAudit(db)
    await audit({
      actorId: ctx.userId,
      action: "business.subscription_updated",
      target: { type: "business", id: existing.business_id },
      meta: { kind: "business.subscription_updated" },
    })
    const subscription = await subsService.updateSubscription(db, input)
    if (!subscription)
      throw ApiError.notFound("subscription.not_found", "Subscription not found")
    return { subscription }
  },
})

export const deleteSubscriptionOp = defineOperation({
  name: "admin.subscriptions.delete",
  // Route: DELETE /businesses/[id]/subscriptions/[subId]
  // runFromRequest merges path params: id=businessId, subId=subscriptionId.
  input: z.object({
    id: z.string().min(1),    // business ID from [id] path segment
    subId: z.string().min(1), // subscription ID from [subId] path segment
  }),
  output: z.object({ ok: z.literal(true) }),
  permission: "admin",
  handler: async (db, ctx, { id: businessId, subId }) => {
    const audit = createAudit(db)
    await audit({
      actorId: ctx.userId,
      action: "business.subscription_voided",
      target: { type: "business", id: businessId },
      meta: { kind: "business.subscription_voided" },
    })
    const deleted = await subsService.deleteSubscription(db, subId)
    if (!deleted) throw ApiError.notFound("subscription.not_found", "Subscription not found")
    return { ok: true as const }
  },
})
