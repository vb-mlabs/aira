import { z } from "zod"

/**
 * Display slot for a sponsorship tier — maps to one of three fixed
 * listing-page treatments.
 *
 * - `top`     — first inside the Sponsored section, `sponsoredTop` color pair
 * - `mid`     — after top inside the Sponsored section, `sponsoredMid` color pair
 * - `regular` — falls into the Regular section alongside unsponsored businesses,
 *               with the `regular` color pair (sponsored-regular-slot appear
 *               first within the section)
 *
 * End users see two sections: "Sponsored" and "Regular". The top/mid/regular
 * distinction is admin/pricing plumbing plus a subtle card color cue.
 */
export const DISPLAY_SLOTS = ["top", "mid", "regular"] as const
export type DisplaySlot = (typeof DISPLAY_SLOTS)[number]
export const DisplaySlotSchema = z.enum(DISPLAY_SLOTS)

/** Human-readable labels for the admin tier form + tier list column. */
export const DISPLAY_SLOT_LABELS: Record<DisplaySlot, string> = {
  top: "Top",
  mid: "Mid",
  regular: "Regular",
}

export const SponsorshipTierSchema = z.object({
  id: z.string(),
  city_id: z.string(),
  name: z.string(),
  priority: z.number().int().positive(),
  display_slot: DisplaySlotSchema,
  active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
})
export type SponsorshipTier = z.infer<typeof SponsorshipTierSchema>

// List-item variant: base tier + rolled-up sponsorship reference count.
// Emitted by admin.sponsorship-tiers.list so the admin UI can gate the
// hard-delete action on sponsorship_count === 0 without a second fetch.
// Base SponsorshipTierSchema stays untouched so consumers that don't
// need the count (TierForm, sponsorships-section fetches) keep their
// existing shape.
export const SponsorshipTierListItemSchema = SponsorshipTierSchema.extend({
  sponsorship_count: z.number().int().nonnegative(),
})
export type SponsorshipTierListItem = z.infer<typeof SponsorshipTierListItemSchema>

export const SponsorshipTierCreateInputSchema = z.object({
  city_id: z.string().min(1),
  name: z.string().min(1).max(100),
  priority: z.number().int().positive(),
  display_slot: DisplaySlotSchema,
})
export type SponsorshipTierCreateInput = z.infer<typeof SponsorshipTierCreateInputSchema>

export const SponsorshipTierUpdateInputSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100).optional(),
  priority: z.number().int().positive().optional(),
  display_slot: DisplaySlotSchema.optional(),
  active: z.boolean().optional(),
})
export type SponsorshipTierUpdateInput = z.infer<typeof SponsorshipTierUpdateInputSchema>

export const SponsorshipTierListOutputSchema = z.object({
  items: z.array(SponsorshipTierListItemSchema),
})
export type SponsorshipTierListOutput = z.infer<typeof SponsorshipTierListOutputSchema>
