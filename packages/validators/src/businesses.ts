// Community business directory — shared shape between web RSC, web Client
// Components, mobile, and the /api/v1/businesses + /api/v1/categories
// route handlers.
//
// Tier/category stay as `text` columns in the DB (not pgEnum) so adding
// values doesn't require a migration round-trip — see the businesses
// schema header for the full rationale. The Zod boundary at this file
// is the validation layer.

import { z } from "zod";

export const VALID_TIERS = ["tier1", "tier2", "tier3"] as const;
export type BusinessTier = (typeof VALID_TIERS)[number];

export const VALID_CATEGORIES = [
  "restaurants",
  "education",
  "events-entertainment",
  "professional-services",
  "health-wellness",
  "real-estate",
  "shopping",
] as const;
export type BusinessCategory = (typeof VALID_CATEGORIES)[number];

export const BusinessTierSchema = z.enum(VALID_TIERS);
export const BusinessCategorySchema = z.enum(VALID_CATEGORIES);

export const BusinessSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  category: BusinessCategorySchema,
  description: z.string().nullable(),
  phone: z.string().nullable(),
  website: z.string().nullable(),
  address: z.string().nullable(),
  image_url: z.string().nullable(),
  facebook_url: z.string().nullable(),
  instagram_url: z.string().nullable(),
  whatsapp_number: z.string().nullable(),
  hours: z.string().nullable(),
  aira_review: z.string().nullable(),
  tier: BusinessTierSchema,
  verified: z.boolean(),
  /** ISO 8601 */
  created_at: z.string(),
  /** ISO 8601 */
  updated_at: z.string(),
});
export type Business = z.infer<typeof BusinessSchema>;

export const BusinessUpdateInputSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1).optional(),
    description: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    website: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
    tier: BusinessTierSchema.optional(),
    facebook_url: z.string().nullable().optional(),
    instagram_url: z.string().nullable().optional(),
    whatsapp_number: z.string().nullable().optional(),
    hours: z.string().nullable().optional(),
    aira_review: z.string().nullable().optional(),
  })
  .strict();
export type BusinessUpdateInput = z.infer<typeof BusinessUpdateInputSchema>;

export const BusinessUpdateOutputSchema = z.object({
  business: BusinessSchema,
});
export type BusinessUpdateOutput = z.infer<typeof BusinessUpdateOutputSchema>;

/** Input contract for GET /api/v1/businesses. Used by both the route and the
 *  shared apiClient/apiServerFetch callers. */
export const BusinessListInputSchema = z
  .object({
    /** When true, returns only tier1/tier2 businesses ordered by tier. */
    featured: z.coerce.boolean().optional(),
    category: BusinessCategorySchema.optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict();
export type BusinessListInput = z.infer<typeof BusinessListInputSchema>;

export const BusinessListOutputSchema = z.object({
  items: z.array(BusinessSchema),
});
export type BusinessListOutput = z.infer<typeof BusinessListOutputSchema>;

export const BusinessDetailInputSchema = z
  .object({ id: z.string().min(1) })
  .strict();
export type BusinessDetailInput = z.infer<typeof BusinessDetailInputSchema>;

export const BusinessDetailOutputSchema = z.object({
  business: BusinessSchema.nullable(),
});
export type BusinessDetailOutput = z.infer<typeof BusinessDetailOutputSchema>;
