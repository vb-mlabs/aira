import "server-only"

import { membershipPlans as plansService } from "@aira/services"
import {
  MembershipPlanCreateInputSchema,
  MembershipPlanUpdateInputSchema,
  MembershipPlanListOutputSchema,
} from "@aira/validators/membership-plans"
import { z } from "zod"
import { ApiError } from "@aira/api"
import { defineOperation } from "./index"

const CITY_ID = "city-atlanta"

export const listMembershipPlansOp = defineOperation({
  name: "admin.membership-plans.list",
  input: z.object({ includeInactive: z.coerce.boolean().optional() }).strict(),
  output: MembershipPlanListOutputSchema,
  permission: "admin",
  handler: async (db, _ctx, { includeInactive }) => {
    const items = await plansService.listMembershipPlans(db, CITY_ID, includeInactive ?? false)
    return { items }
  },
})

export const createMembershipPlanOp = defineOperation({
  name: "admin.membership-plans.create",
  input: MembershipPlanCreateInputSchema.omit({ city_id: true }),
  output: z.object({ plan: z.any() }),
  permission: "admin",
  handler: async (db, _ctx, input) => {
    const plan = await plansService.createMembershipPlan(db, { ...input, city_id: CITY_ID })
    return { plan }
  },
})

export const updateMembershipPlanOp = defineOperation({
  name: "admin.membership-plans.update",
  input: MembershipPlanUpdateInputSchema,
  output: z.object({ plan: z.any() }),
  permission: "admin",
  handler: async (db, _ctx, input) => {
    const plan = await plansService.updateMembershipPlan(db, input)
    if (!plan) throw ApiError.notFound("membership_plan.not_found", "Plan not found")
    return { plan }
  },
})

export const deactivateMembershipPlanOp = defineOperation({
  name: "admin.membership-plans.deactivate",
  input: z.object({ id: z.string().min(1) }).strict(),
  output: z.object({ plan: z.any() }),
  permission: "admin",
  handler: async (db, _ctx, { id }) => {
    const plan = await plansService.deactivateMembershipPlan(db, id)
    if (!plan) throw ApiError.notFound("membership_plan.not_found", "Plan not found")
    return { plan }
  },
})
