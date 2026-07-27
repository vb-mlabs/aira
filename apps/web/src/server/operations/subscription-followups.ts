import "server-only"

// F23′ Admin operations for the renewal follow-up queue.

import { z } from "zod"
import { subscriptionFollowups as service } from "@aira/services"
import {
  CreateFollowupInputSchema,
  CreateFollowupOutputSchema,
  FollowupHistoryOutputSchema,
  FollowupQueueInputSchema,
  FollowupQueueOutputSchema,
} from "@aira/validators/subscription-followups"
import { defineOperation } from "./index"

const DEFAULT_WITHIN_DAYS = 30

export const listFollowupQueueOp = defineOperation({
  name: "admin.followups.listQueue",
  input: FollowupQueueInputSchema,
  output: FollowupQueueOutputSchema,
  permission: "admin",
  handler: async (db, _ctx, input) => {
    const withinDays = input.withinDays ?? DEFAULT_WITHIN_DAYS
    // includeAll: false is the default active-work view. The
    // validator's z.enum(["0","1"]).transform(v=>v==="1") coerces the
    // URL param — undefined/missing collapses to false via the
    // ?? here so a straight `?withinDays=7` behaves exactly as before.
    const includeAll = input.includeAll ?? false
    const result = await service.listQueue(db, { withinDays, includeAll })
    return { items: result.items, total: result.total, withinDays }
  },
})

export const listFollowupHistoryOp = defineOperation({
  name: "admin.followups.listHistory",
  input: z.object({ subscriptionId: z.string().min(1) }).strict(),
  output: FollowupHistoryOutputSchema,
  permission: "admin",
  handler: async (db, _ctx, input) => {
    const items = await service.listForSubscription(db, {
      subscriptionId: input.subscriptionId,
    })
    return { items }
  },
})

export const createFollowupOp = defineOperation({
  name: "admin.followups.create",
  input: CreateFollowupInputSchema,
  output: CreateFollowupOutputSchema,
  permission: "admin",
  handler: async (db, ctx, input) => {
    return service.create(db, ctx, input)
  },
})
