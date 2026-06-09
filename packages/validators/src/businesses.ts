// Community business directory — shared shape between web RSC, web Client
// Components, mobile, and the /api/v1/businesses + /api/v1/categories
// route handlers.
//
// Tier/category stay as `text` columns in the DB (not pgEnum) so adding
// values doesn't require a migration round-trip — see the businesses
// schema header for the full rationale. The Zod boundary at this file
// is the validation layer.

import { z } from "zod";
import { BusinessImageSchema } from "./business-image";

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
/** Legacy type kept for seeding helpers and existing tests. */
export type BusinessCategory = string;

export const BusinessTierSchema = z.enum(VALID_TIERS);
export const BusinessCategorySchema = z.string().min(1);

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
  /** Editorial rating 0–5. Step granularity (0.5) is enforced by the admin UI,
   *  not the API. NULL = unrated; 0 also renders as "no rating" per PRD F11. */
  rating: z.number().min(0).max(5).nullable(),
  tier: BusinessTierSchema,
  verified: z.boolean(),
  /** ISO 8601; NULL = active, non-NULL = archived at this moment. */
  deleted_at: z.string().nullable(),
  /** ISO 8601 */
  created_at: z.string(),
  /** ISO 8601 */
  updated_at: z.string(),
  /** Gallery images ordered by sort_order. Empty array for businesses with no gallery. */
  images: BusinessImageSchema.array().default([]),
  /** IDs of extra categories from the business_category join table. Empty when none. */
  extra_category_ids: z.string().array().default([]),
});
export type Business = z.infer<typeof BusinessSchema>;

export const BusinessUpdateInputSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1).optional(),
    category: BusinessCategorySchema.optional(),
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
    rating: z.number().min(0).max(5).nullable().optional(),
    extra_category_ids: z.string().array().optional(),
  })
  .strict();
export type BusinessUpdateInput = z.infer<typeof BusinessUpdateInputSchema>;

export const BusinessUpdateOutputSchema = z.object({
  business: BusinessSchema,
});
export type BusinessUpdateOutput = z.infer<typeof BusinessUpdateOutputSchema>;

/** Input contract for GET /api/v1/businesses. Used by both the route and the
 *  shared apiClient/apiServerFetch callers.
 *
 *  When `category` is set together with any of `q`, `page > 1`, `pageSize`,
 *  or `verified`, the op switches into the paginated path backed by
 *  services.getBusinessesByCategoryPaged. Otherwise the existing
 *  featured/category/fallback branches return the full result with
 *  synthesized pagination metadata so the strict output schema validates
 *  for every caller. */
export const BusinessListInputSchema = z
  .object({
    /** When true, returns only tier1/tier2 businesses ordered by tier. */
    featured: z.coerce.boolean().optional(),
    category: BusinessCategorySchema.optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    /** Scoped keyword search (name / description / address, ILIKE). */
    q: z.string().trim().max(100).optional(),
    /** 1-indexed. Coerced from string so ?page=2 works straight from URL.
     *  Defaults to 1 in the op handler. */
    page: z.coerce.number().int().min(1).optional(),
    /** Cards per page on the listings view. Defaults to 12 in the op handler. */
    pageSize: z.coerce.number().int().min(1).max(50).optional(),
    /** When true, only returns rows with verified=true. */
    verified: z.coerce.boolean().optional(),
    /** Admin-only flag honored by listAllBusinessesAdminOp; ignored by the
     *  public op which always filters archived rows. */
    includeArchived: z.coerce.boolean().optional(),
  })
  .strict();
export type BusinessListInput = z.infer<typeof BusinessListInputSchema>;

export const BusinessListOutputSchema = z.object({
  items: z.array(BusinessSchema),
  /** Total matching rows. For non-paginated branches this equals items.length. */
  total: z.number().int().nonnegative(),
  /** Echo of the page that was returned. */
  page: z.number().int().min(1),
  /** Echo of the page size that was used. */
  pageSize: z.number().int().min(1),
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

/** Archive request: just the id. The action and timestamp are inferred. */
export const BusinessArchiveInputSchema = z
  .object({ id: z.string().min(1) })
  .strict();
export type BusinessArchiveInput = z.infer<typeof BusinessArchiveInputSchema>;

/** Restore is symmetric. */
export const BusinessRestoreInputSchema = z
  .object({ id: z.string().min(1) })
  .strict();
export type BusinessRestoreInput = z.infer<typeof BusinessRestoreInputSchema>;
