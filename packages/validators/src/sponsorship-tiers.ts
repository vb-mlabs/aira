import { z } from "zod"

export const SponsorshipTierSchema = z.object({
  id: z.string(),
  city_id: z.string(),
  name: z.string(),
  priority: z.number().int().positive(),
  active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
})
export type SponsorshipTier = z.infer<typeof SponsorshipTierSchema>

export const SponsorshipTierCreateInputSchema = z
  .object({
    city_id: z.string().min(1),
    name: z.string().min(1).max(100),
    priority: z.number().int().positive(),
  })
  .strict()
export type SponsorshipTierCreateInput = z.infer<typeof SponsorshipTierCreateInputSchema>

export const SponsorshipTierUpdateInputSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1).max(100).optional(),
    priority: z.number().int().positive().optional(),
    active: z.boolean().optional(),
  })
  .strict()
export type SponsorshipTierUpdateInput = z.infer<typeof SponsorshipTierUpdateInputSchema>

export const SponsorshipTierListOutputSchema = z.object({
  items: z.array(SponsorshipTierSchema),
})
export type SponsorshipTierListOutput = z.infer<typeof SponsorshipTierListOutputSchema>
