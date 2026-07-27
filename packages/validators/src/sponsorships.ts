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
  tier_id: z.string().nullable(),
  status: SponsorshipStatusSchema,
  start_date: z.string(),
  end_date: z.string(),
  amount_cents: z.number().int().nonnegative(),
  notes: z.string().nullable(),
  // Relative /api/storage/... path returned by the storage driver — use
  // .min(1), NOT .url(), so the schema doesn't reject valid stored values
  // (see .claude/memory/storage-driver-relative-urls.md, commit 3aa520f).
  payment_evidence_url: z.string().nullable(),
  recorded_by: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})
export type Sponsorship = z.infer<typeof SponsorshipSchema>

export const SponsorshipCreateInputSchema = z
  .object({
    business_id: z.string().min(1),
    // Required — every sponsorship must map to a tier so the placement
    // (top/mid/regular slot) is deterministic. The one-active-per-business
    // rule is enforced separately in the service.
    tier_id: z.string().min(1),
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
    // Optional (leaving it out means "unchanged") but not nullable — once
    // set, a sponsorship can be re-tiered but not de-tiered. Mirrors the
    // create-side required rule.
    tier_id: z.string().min(1).optional(),
    start_date: z.string().datetime().optional(),
    end_date: z.string().datetime().optional(),
    amount_cents: z.number().int().nonnegative().optional(),
    notes: z.string().max(1000).nullable().optional(),
    payment_evidence_url: z.string().min(1).nullable().optional(),
  })
  .strict()
export type SponsorshipUpdateInput = z.infer<typeof SponsorshipUpdateInputSchema>

/** List-item variant — extends base with the joined tier name so the
 *  admin sponsorships table can render "{name}" instead of the raw
 *  tier_id. Null when the sponsorship has no tier_id OR when the
 *  referenced tier no longer exists (FK is onDelete: "set null"). */
export const SponsorshipListItemSchema = SponsorshipSchema.extend({
  tier_name: z.string().nullable(),
})
export type SponsorshipListItem = z.infer<typeof SponsorshipListItemSchema>

export const SponsorshipListOutputSchema = z.object({
  items: z.array(SponsorshipListItemSchema),
})
export type SponsorshipListOutput = z.infer<typeof SponsorshipListOutputSchema>
