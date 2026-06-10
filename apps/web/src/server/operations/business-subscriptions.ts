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
  input: z.object({ business_id: z.string().min(1) }).strict(),
  output: BusinessSubscriptionListOutputSchema,
  permission: "admin",
  handler: async (db, _ctx, { business_id }) => {
    const items = await subsService.listSubscriptionsByBusiness(db, business_id)
    return { items }
  },
})

export const createSubscriptionOp = defineOperation({
  name: "admin.subscriptions.create",
  input: BusinessSubscriptionCreateInputSchema,
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
  handler: async (db, _ctx, input) => {
    const subscription = await subsService.updateSubscription(db, input)
    if (!subscription)
      throw ApiError.notFound("subscription.not_found", "Subscription not found")
    return { subscription }
  },
})

export const deleteSubscriptionOp = defineOperation({
  name: "admin.subscriptions.delete",
  input: z.object({
    id: z.string().min(1),
    business_id: z.string().min(1),
  }).strict(),
  output: z.object({ ok: z.literal(true) }),
  permission: "admin",
  handler: async (db, ctx, { id, business_id }) => {
    const audit = createAudit(db)
    await audit({
      actorId: ctx.userId,
      action: "business.subscription_voided",
      target: { type: "business", id: business_id },
      meta: { kind: "business.subscription_voided" },
    })
    const deleted = await subsService.deleteSubscription(db, id)
    if (!deleted) throw ApiError.notFound("subscription.not_found", "Subscription not found")
    return { ok: true as const }
  },
})
