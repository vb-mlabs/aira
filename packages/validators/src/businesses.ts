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

// VALID_TIERS / TIER_LABELS / BusinessTier / BusinessTierSchema were
// removed in the placement-single-axis refactor (2026-07-13). Placement
// is now controlled entirely by sponsorship; membership subscriptions
// just gate whether a business is listed. See
// packages/validators/src/sponsorship-tiers.ts for the display_slot enum
// that replaces the tier concept.

export const VALID_BUSINESS_TYPES = [
  "storefront",
  "home_based",
  "service_at_client",
  "online_only",
  "mixed",
] as const;
export type BusinessType = (typeof VALID_BUSINESS_TYPES)[number];

export const VALID_YEARS_OPERATING = [
  "under_1",
  "1_to_3",
  "3_to_5",
  "5_plus",
] as const;
export type YearsOperating = (typeof VALID_YEARS_OPERATING)[number];

/** Category slugs are sourced at runtime from the `category` DB table
 *  (admin-editable via /admin/settings/categories). The hardcoded
 *  VALID_CATEGORIES const that used to live here was removed on
 *  2026-06-16 — see .mstack/plans/2026-06-16-category-drift-fix.md.
 *  This stays as `string` because Zod can't validate against a runtime
 *  catalog; the `category` table's slug uniqueness + the rename guard
 *  in updateCategoryOp keep the contract enforced. */
export type BusinessCategory = string;

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
  verified: z.boolean(),
  city_id: z.string().nullable(),
  business_type: z.string().nullable(),
  years_operating: z.string().nullable(),
  /** Opaque FK to user.id — the business owner. Surfaced on the public
   *  schema so the admin extension can project it; carries no PII on its
   *  own. Mutated only via the audited assignBusinessOwner /
   *  unassignBusinessOwner service path; deliberately NOT included in
   *  BusinessUpdateInputSchema so generic admin edits cannot mutate it. */
  owner_user_id: z.string().nullable(),
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
  /** Human-readable display name resolved from `category` (a slug) via the
   *  categories table. Populated by listing queries; NULL when no matching
   *  category row exists (stale slug, deleted category). Consumers fall
   *  back to `category` (the slug) or a hardcoded meta map for known
   *  seeded slugs. */
  category_name: z.string().nullable().default(null),
  /** Populated by listing queries when the business has an active,
   *  in-window sponsorship — the display_slot from its sponsorship's
   *  tier row. NULL when the business has no active sponsorship. Drives
   *  the two-section (Sponsored / Regular) layout on listing pages.
   *  Detail-only endpoints leave this NULL. */
  sponsored_slot: z.enum(["top", "mid", "regular"]).nullable().default(null),
});
export type Business = z.infer<typeof BusinessSchema>;

/** Admin-extended business shape — adds the contact_person field (free-text
 *  name of the admin's point of contact for the listing). Used on every
 *  admin output (admin list, admin detail, admin create/update outputs).
 *  Public BusinessSchema deliberately omits contact_person so the value
 *  cannot reach unauthenticated callers via /api/v1/businesses; the data
 *  layer also strips it on public projections (see queries.ts). */
export const BusinessAdminSchema = BusinessSchema.extend({
  contact_person: z.string().nullable(),
  /** Admin-only free-text log of the verification decision. NULL when
   *  the admin has verified without capturing context, OR when the
   *  row predates this field entirely. Never surfaced on the public
   *  BusinessSchema — kept out of /api/v1/businesses payloads by the
   *  query projection in packages/services/src/businesses/queries.ts. */
  verification_notes: z.string().nullable(),
});
export type BusinessAdmin = z.infer<typeof BusinessAdminSchema>;

/** Business owner — denormalised user projection returned from
 *  getBusinessOwner. Used by the admin business-detail op output and by
 *  the admin list page's per-row Owner column. Carries user PII (name,
 *  email) so callers must scope this to admin surfaces only. */
export const BusinessOwnerSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});
export type BusinessOwner = z.infer<typeof BusinessOwnerSchema>;

/** Admin owner-assignment input. owner_user_id is the picked user;
 *  business id comes from the [id] route param. */
export const AssignBusinessOwnerInputSchema = z
  .object({
    id: z.string().min(1),
    owner_user_id: z.string().min(1),
  })
  .strict();
export type AssignBusinessOwnerInput = z.infer<
  typeof AssignBusinessOwnerInputSchema
>;

export const UnassignBusinessOwnerInputSchema = z
  .object({ id: z.string().min(1) })
  .strict();
export type UnassignBusinessOwnerInput = z.infer<
  typeof UnassignBusinessOwnerInputSchema
>;

/** Admin detail output — extends the public BusinessDetail shape with a
 *  separately-fetched owner record. owner is null when owner_user_id is
 *  null or when the referenced user has been deleted/anonymised. */
export const BusinessAdminDetailOutputSchema = z.object({
  business: BusinessAdminSchema.nullable(),
  owner: BusinessOwnerSchema.nullable(),
});
export type BusinessAdminDetailOutput = z.infer<
  typeof BusinessAdminDetailOutputSchema
>;

export const BusinessUpdateInputSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1).optional(),
    category: BusinessCategorySchema.optional(),
    description: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    website: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
    facebook_url: z.string().nullable().optional(),
    instagram_url: z.string().nullable().optional(),
    whatsapp_number: z.string().nullable().optional(),
    hours: z.string().nullable().optional(),
    aira_review: z.string().nullable().optional(),
    rating: z.number().min(0).max(5).nullable().optional(),
    verified: z.boolean().optional(),
    extra_category_ids: z.string().array().optional(),
    city_id: z.string().nullable().optional(),
    business_type: z.string().nullable().optional(),
    years_operating: z.string().nullable().optional(),
    contact_person: z
      .string()
      .trim()
      .max(120)
      .nullable()
      .optional(),
    /** Admin-only verification-decision log. Cap of 1000 chars — enough
     *  for a call summary + licence numbers + timestamp, well under any
     *  DB / render pathology. Trimmed empty string is coerced to null
     *  at the UI boundary before hitting this schema. */
    verification_notes: z
      .string()
      .trim()
      .max(1000)
      .nullable()
      .optional(),
  })
  .strict();
export type BusinessUpdateInput = z.infer<typeof BusinessUpdateInputSchema>;

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const BusinessCreateInputSchema = z
  .object({
    name: z.string().min(1),
    slug: z.string().min(1).regex(slugPattern, "Slug must be lowercase kebab-case"),
    category: BusinessCategorySchema,
    description: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
    city_id: z.string().nullable().optional(),
    business_type: z.string().nullable().optional(),
    years_operating: z.string().nullable().optional(),
    instagram_url: z.string().nullable().optional(),
    facebook_url: z.string().nullable().optional(),
    website: z.string().nullable().optional(),
    whatsapp_number: z.string().nullable().optional(),
    contact_person: z
      .string()
      .trim()
      .max(120)
      .nullable()
      .optional(),
  })
  .strict();
export type BusinessCreateInput = z.infer<typeof BusinessCreateInputSchema>;

export const BusinessUpdateOutputSchema = z.object({
  business: BusinessAdminSchema,
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
    /** When true, returns a randomised selection of businesses with an
     *  active sponsorship in scope. Combined with `category`, scopes to
     *  sponsorships whose category_id matches. `limit` is clamped at 5
     *  by the op regardless of the value supplied. */
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

/** Output contract for GET /api/v1/businesses/count. Tiny by design — just
 *  the count of active (non-archived) businesses. Used by /home's stat
 *  card so the RSC doesn't have to import the service directly (which
 *  would bypass the /api/v1/* boundary). */
export const BusinessCountOutputSchema = z.object({
  count: z.number().int().nonnegative(),
});
export type BusinessCountOutput = z.infer<typeof BusinessCountOutputSchema>;

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
