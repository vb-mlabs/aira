import { z } from "zod"

export const MembershipPlanSchema = z.object({
  id: z.string(),
  city_id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  price_cents: z.number().int().nonnegative(),
  duration_months: z.number().int().positive(),
  active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
})
export type MembershipPlan = z.infer<typeof MembershipPlanSchema>

// List-item variant: base plan + rolled-up subscription reference count.
// Emitted by admin.membership-plans.list so the admin UI can gate the
// hard-delete action on subscription_count === 0 without a second fetch.
// Base MembershipPlanSchema stays untouched so consumers that don't need
// the count (PlanForm, single-plan fetches) keep their existing shape.
export const MembershipPlanListItemSchema = MembershipPlanSchema.extend({
  subscription_count: z.number().int().nonnegative(),
})
export type MembershipPlanListItem = z.infer<typeof MembershipPlanListItemSchema>

export const MembershipPlanCreateInputSchema = z
  .object({
    city_id: z.string().min(1),
    name: z.string().min(1).max(100),
    description: z.string().max(500).nullable().optional(),
    price_cents: z.number().int().nonnegative(),
    duration_months: z.number().int().positive(),
  })
  .strict()
export type MembershipPlanCreateInput = z.infer<typeof MembershipPlanCreateInputSchema>

export const MembershipPlanUpdateInputSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).nullable().optional(),
    price_cents: z.number().int().nonnegative().optional(),
    duration_months: z.number().int().positive().optional(),
    active: z.boolean().optional(),
  })
  .strict()
export type MembershipPlanUpdateInput = z.infer<typeof MembershipPlanUpdateInputSchema>

export const MembershipPlanListOutputSchema = z.object({
  items: z.array(MembershipPlanListItemSchema),
})
export type MembershipPlanListOutput = z.infer<typeof MembershipPlanListOutputSchema>
