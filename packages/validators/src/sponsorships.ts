import { z } from "zod"

export const SponsorshipStatusSchema = z.enum([
  "scheduled",
  "active",
  "expired",
  "cancelled",
])
export type SponsorshipStatus = z.infer<typeof SponsorshipStatusSchema>

export const SponsorshipSchema = z.object({
  id: z.string(),
  business_id: z.string(),
  category_id: z.string(),
  tier_id: z.string().nullable(),
  status: SponsorshipStatusSchema,
  start_date: z.string(),
  end_date: z.string(),
  amount_cents: z.number().int().nonnegative(),
  notes: z.string().nullable(),
  recorded_by: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})
export type Sponsorship = z.infer<typeof SponsorshipSchema>

export const SponsorshipCreateInputSchema = z
  .object({
    business_id: z.string().min(1),
    category_id: z.string().min(1),
    tier_id: z.string().min(1).nullable().optional(),
    start_date: z.string().datetime(),
    end_date: z.string().datetime(),
    amount_cents: z.number().int().nonnegative(),
    notes: z.string().max(1000).nullable().optional(),
    recorded_by: z.string().max(200).nullable().optional(),
  })
  .strict()
export type SponsorshipCreateInput = z.infer<typeof SponsorshipCreateInputSchema>

export const SponsorshipUpdateInputSchema = z
  .object({
    id: z.string().min(1),
    tier_id: z.string().min(1).nullable().optional(),
    start_date: z.string().datetime().optional(),
    end_date: z.string().datetime().optional(),
    amount_cents: z.number().int().nonnegative().optional(),
    notes: z.string().max(1000).nullable().optional(),
  })
  .strict()
export type SponsorshipUpdateInput = z.infer<typeof SponsorshipUpdateInputSchema>

export const SponsorshipListOutputSchema = z.object({
  items: z.array(SponsorshipSchema),
})
export type SponsorshipListOutput = z.infer<typeof SponsorshipListOutputSchema>
