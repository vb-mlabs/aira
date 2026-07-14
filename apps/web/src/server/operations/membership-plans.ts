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
  // LIST is read-only and admins need it to attach a plan to a business
  // via the Subscriptions card on /admin/businesses/[id]. The create/update/
  // deactivate ops below manage the catalog itself and correctly stay
  // super_admin.
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
  permission: "super_admin",
  handler: async (db, _ctx, input) => {
    const plan = await plansService.createMembershipPlan(db, { ...input, city_id: CITY_ID })
    return { plan }
  },
})

export const updateMembershipPlanOp = defineOperation({
  name: "admin.membership-plans.update",
  input: MembershipPlanUpdateInputSchema,
  output: z.object({ plan: z.any() }),
  permission: "super_admin",
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
  permission: "super_admin",
  handler: async (db, _ctx, { id }) => {
    const plan = await plansService.deactivateMembershipPlan(db, id)
    if (!plan) throw ApiError.notFound("membership_plan.not_found", "Plan not found")
    return { plan }
  },
})

// Hard-delete. Refuses when subscriptions reference the plan (the
// service-level MembershipPlanHasSubscriptionsError guard). The UI
// hides the Delete button when subscription_count > 0, but the guard
// here is the source of truth — a subscription created after the list
// was fetched would race past the UI hide.
export const deleteMembershipPlanOp = defineOperation({
  name: "admin.membership-plans.delete",
  input: z.object({ id: z.string().min(1) }).strict(),
  output: z.object({ plan: z.any() }),
  permission: "super_admin",
  handler: async (db, _ctx, { id }) => {
    try {
      const plan = await plansService.deleteMembershipPlan(db, id)
      if (!plan) throw ApiError.notFound("membership_plan.not_found", "Plan not found")
      return { plan }
    } catch (err) {
      if (err instanceof plansService.MembershipPlanHasSubscriptionsError) {
        throw ApiError.badRequest("membership_plan.has_subscriptions", err.message)
      }
      throw err
    }
  },
})
