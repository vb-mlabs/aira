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
  items: z.array(MembershipPlanSchema),
})
export type MembershipPlanListOutput = z.infer<typeof MembershipPlanListOutputSchema>
