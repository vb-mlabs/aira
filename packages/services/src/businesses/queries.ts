// Read-side queries for the community business directory.
//
// Pure: takes `db` as the first argument; no auth (the op layer enforces
// permission: "user" before invoking these), no Next imports, no captured
// singletons. Mirrors the rest of the @aira/services convention.

import { and, asc, count, desc, eq, getTableColumns, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import { businesses, businessImages, businessCategories, categories, businessSubscriptions, user } from "@aira/db/schema";
import type { Database } from "@aira/db/client";
import { ApiError } from "@aira/api";
import {
  type Business,
  type BusinessAdmin,
  type BusinessCreateInput,
  type BusinessOwner,
  type BusinessImage,
} from "@aira/validators";

// Visibility gate for category/directory listings: accepts paid OR pending
// (within window). Pending shows up so businesses that registered but haven't
// completed payment still appear. Placement (whether they show in the
// Sponsored section) is entirely driven by sponsorship — subscription no
// longer grants placement (placement-single-axis refactor 2026-07-13).
const VISIBLE = sql`EXISTS (
  SELECT 1 FROM business_subscription bs
  WHERE bs.business_id = businesses.id
  AND bs.payment_status IN ('paid', 'pending')
  AND now() BETWEEN bs.start_date AND bs.end_date
)`;

// Sponsored sort helpers for /listings/[cat] — correlated subqueries to
// avoid duplicate rows from a LEFT JOIN when a business holds multiple
// sponsorship rows (defense-in-depth; dedup at migration time collapses
// live rows to one-per-business, but historical expired/cancelled rows can
// still be plural).
//
// Under the per-business sponsorship model, none of these correlate to the
// category being viewed — a sponsored business is sponsored everywhere it
// appears. The outer query on the listing page already filters businesses
// by category (primary + business_category join), so the sponsored halo
// naturally follows the business's category membership.
const SPONSORED_FLAG = sql`CASE WHEN EXISTS (
  SELECT 1 FROM sponsorship sp
  WHERE sp.business_id = businesses.id
  AND sp.status = 'active'
  AND now() BETWEEN sp.start_date AND sp.end_date
) THEN 0 ELSE 1 END`;

// Display slot precedence — 1 = top, 2 = mid, 3 = regular. Placeholder 9
// for sponsored rows whose tier or display_slot lookup is null (defensive;
// with the schema NOT NULL constraint this should never fire).
const SPONSORED_SLOT_ORDER = sql`COALESCE((
  SELECT MIN(
    CASE st.display_slot
      WHEN 'top' THEN 1
      WHEN 'mid' THEN 2
      WHEN 'regular' THEN 3
      ELSE 9
    END
  )
  FROM sponsorship sp
  LEFT JOIN sponsorship_tier st ON st.id = sp.tier_id
  WHERE sp.business_id = businesses.id
  AND sp.status = 'active'
  AND now() BETWEEN sp.start_date AND sp.end_date
), 9)`;

const SPONSORED_TIER_PRIORITY = sql`COALESCE((
  SELECT MIN(st.priority)
  FROM sponsorship sp
  LEFT JOIN sponsorship_tier st ON st.id = sp.tier_id
  WHERE sp.business_id = businesses.id
  AND sp.status = 'active'
  AND now() BETWEEN sp.start_date AND sp.end_date
), 99999)`;

const SPONSORED_AMOUNT_CENTS = sql`COALESCE((
  SELECT MAX(sp.amount_cents)
  FROM sponsorship sp
  WHERE sp.business_id = businesses.id
  AND sp.status = 'active'
  AND now() BETWEEN sp.start_date AND sp.end_date
), 0)`;

// Predicate: business has at least one active, in-window sponsorship.
// Powers the homepage Featured tile (getFeaturedRandom) and gates the
// per-category Featured section (getFeaturedRandomForCategory).
const HAS_ACTIVE_SPONSORSHIP = sql<boolean>`EXISTS (
  SELECT 1 FROM sponsorship sp
  WHERE sp.business_id = businesses.id
  AND sp.status = 'active'
  AND now() BETWEEN sp.start_date AND sp.end_date
)`;

// ─── Relation helpers ────────────────────────────────────────────────────────

async function fetchImages(
  db: Database,
  ids: string[],
): Promise<Map<string, BusinessImage[]>> {
  if (ids.length === 0) return new Map();
  const rows = await db
    .select()
    .from(businessImages)
    .where(inArray(businessImages.business_id, ids))
    .orderBy(asc(businessImages.sort_order));
  const out = new Map<string, BusinessImage[]>();
  for (const row of rows) {
    const list = out.get(row.business_id) ?? [];
    list.push(toImage(row));
    out.set(row.business_id, list);
  }
  return out;
}

async function fetchExtraCategoryIds(
  db: Database,
  ids: string[],
): Promise<Map<string, string[]>> {
  if (ids.length === 0) return new Map();
  const rows = await db
    .select({
      business_id: businessCategories.business_id,
      category_id: businessCategories.category_id,
    })
    .from(businessCategories)
    .where(inArray(businessCategories.business_id, ids));
  const out = new Map<string, string[]>();
  for (const row of rows) {
    const list = out.get(row.business_id) ?? [];
    list.push(row.category_id);
    out.set(row.business_id, list);
  }
  return out;
}

// Row shape accepted by attachRelations. `is_paid_active` used to travel
// alongside the row to demote pending-only businesses to tier3 for
// display — under the placement-single-axis refactor, placement is
// entirely sponsorship-driven, so the shape is now just the raw row.
type BusinessRowWithVisibility = typeof businesses.$inferSelect;

/** Rejects when the given category slug does not resolve to an active
 *  level-2 (subcategory) row. Shared enforcement for createBusiness and
 *  updateBusiness — a business's primary `category` column must point
 *  at a subcategory, never a root. Empty/undefined slugs are treated as
 *  "no change" by callers, so this only runs when the caller passes a
 *  concrete slug. */
export async function assertCategoryIsSubcategory(
  db: Database,
  slug: string,
): Promise<void> {
  const trimmed = slug.trim();
  if (trimmed === "") {
    throw ApiError.badRequest(
      "businesses.category_required",
      "Category is required.",
    );
  }
  const [row] = await db
    .select({ level: categories.level })
    .from(categories)
    .where(eq(categories.slug, trimmed))
    .limit(1);
  if (!row) {
    throw ApiError.badRequest(
      "businesses.category_not_found",
      `Unknown category "${trimmed}".`,
    );
  }
  if (row.level !== 2) {
    throw ApiError.badRequest(
      "businesses.category_must_be_subcategory",
      "Businesses can only be assigned to subcategories, not primary categories.",
    );
  }
}

export async function attachRelations(
  db: Database,
  rows: BusinessRowWithVisibility[],
): Promise<Business[]> {
  const ids = rows.map((r) => r.id);
  const [imagesMap, catsMap] = await Promise.all([
    fetchImages(db, ids),
    fetchExtraCategoryIds(db, ids),
  ]);
  return rows.map((row) =>
    toBusiness(row, imagesMap.get(row.id) ?? [], catsMap.get(row.id) ?? []),
  );
}

// Admin variant — same shape as attachRelations but emits BusinessAdmin
// rows (i.e. with contact_person). Used exclusively by admin-only queries
// (getBusinessByIdIncludingArchived, getAllBusinesses, createBusiness).
// Public read paths must continue to use attachRelations so contact_person
// never reaches an unauthenticated payload.
async function attachRelationsAdmin(
  db: Database,
  rows: BusinessRowWithVisibility[],
): Promise<BusinessAdmin[]> {
  const ids = rows.map((r) => r.id);
  const [imagesMap, catsMap] = await Promise.all([
    fetchImages(db, ids),
    fetchExtraCategoryIds(db, ids),
  ]);
  return rows.map((row) =>
    toBusinessAdmin(
      row,
      imagesMap.get(row.id) ?? [],
      catsMap.get(row.id) ?? [],
    ),
  );
}

// ─── Public queries ──────────────────────────────────────────────────────────

/** Uniform-random pick from all businesses that hold an active sponsorship
 *  in any category. Powers the homepage Featured tile. Order is `random()`
 *  so each request returns a fresh selection; deliberately not seeded.
 *
 *  Business-unique via an EXISTS predicate (not a sponsorship JOIN), so a
 *  business with multiple concurrent sponsorships still appears at most
 *  once in the returned set. */
export async function getFeaturedRandom(
  db: Database,
  limit: number,
): Promise<Business[]> {
  const rows = await db
    .select({ ...getTableColumns(businesses) })
    .from(businesses)
    .where(and(isNull(businesses.deleted_at), HAS_ACTIVE_SPONSORSHIP))
    .orderBy(sql`random()`)
    .limit(limit);
  return attachRelations(db, rows);
}

/** Category-scoped variant. Uniform-random pick from businesses that (a)
 *  hold an active sponsorship AND (b) are listed in the given category
 *  (primary category OR the business_category extras join). Under the
 *  per-business sponsorship model, sponsorship is no longer scoped to a
 *  category — it follows the business's category membership. Powers the
 *  primary category page's Featured section. */
export async function getFeaturedRandomForCategory(
  db: Database,
  categorySlug: string,
  limit: number,
): Promise<Business[]> {
  const slugs = await getSlugAndActiveChildSlugs(db, categorySlug);
  const extraCatSubquery = db
    .select({ business_id: businessCategories.business_id })
    .from(businessCategories)
    .innerJoin(categories, eq(businessCategories.category_id, categories.id))
    .where(inArray(categories.slug, slugs));
  const rows = await db
    .select({ ...getTableColumns(businesses) })
    .from(businesses)
    .where(
      and(
        isNull(businesses.deleted_at),
        or(
          inArray(businesses.category, slugs),
          inArray(businesses.id, extraCatSubquery),
        ),
        HAS_ACTIVE_SPONSORSHIP,
      ),
    )
    .orderBy(sql`random()`)
    .limit(limit);
  return attachRelations(db, rows);
}

export async function getBusinessesByCategory(
  db: Database,
  category: string,
): Promise<Business[]> {
  const rows = await db
    .select({ ...getTableColumns(businesses) })
    .from(businesses)
    .where(
      and(
        eq(businesses.category, category),
        isNull(businesses.deleted_at),
        VISIBLE,
      ),
    )
    .orderBy(
      SPONSORED_FLAG,
      SPONSORED_SLOT_ORDER,
      SPONSORED_TIER_PRIORITY,
      desc(SPONSORED_AMOUNT_CENTS),
      asc(businesses.name),
    );
  return attachRelations(db, rows);
}

/** Admin-only: returns ALL businesses (or only active when includeArchived
 *  is false). No pagination — admin's a small audience and the table
 *  doesn't grow that fast. Returns BusinessAdmin (with contact_person);
 *  public callers must NOT route through this. */
export async function getAllBusinesses(
  db: Database,
  opts: { includeArchived: boolean } = { includeArchived: false },
): Promise<BusinessAdmin[]> {
  const where = opts.includeArchived ? undefined : isNull(businesses.deleted_at);
  const builder = db
    .select()
    .from(businesses)
    .orderBy(asc(businesses.name));
  const rows = await (where ? builder.where(where) : builder);
  return attachRelationsAdmin(db, rows);
}

export interface PagedBusinessesInput {
  category: string;
  q?: string;
  page: number;
  pageSize: number;
  verified?: boolean;
}

export interface PagedBusinessesResult {
  items: Business[];
  total: number;
}

/** Expands a category slug to include its active children's slugs. When
 *  the input slug is a root (level=1), returns [rootSlug, ...childSlugs];
 *  when a subcategory (level=2) or unknown slug, returns just [slug].
 *  Used by getBusinessesByCategoryPaged so a query for a root category
 *  returns businesses across all its subs — the "All Listings" flow from
 *  the SubcategoryPicker relies on this. */
export async function getSlugAndActiveChildSlugs(
  db: Database,
  slug: string,
): Promise<string[]> {
  const [parent] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.slug, slug))
    .limit(1);
  if (!parent) return [slug];
  const children = await db
    .select({ slug: categories.slug })
    .from(categories)
    .where(
      and(eq(categories.parent_id, parent.id), eq(categories.active, true)),
    );
  return [slug, ...children.map((c) => c.slug)];
}

/** Paginated variant with scoped keyword search (name + description +
 *  address, ILIKE) and an optional verified filter.
 *
 *  Multi-category: matches businesses whose primary category equals the
 *  slug OR who have an extra category (via business_category join) with
 *  the same slug. When the slug is a root category, the match is
 *  expanded to include all active child subcategories (so "All Listings"
 *  under a root returns everything in its subs too). Runs items + count
 *  in parallel. */
export async function getBusinessesByCategoryPaged(
  db: Database,
  input: PagedBusinessesInput,
): Promise<PagedBusinessesResult> {
  const trimmed = input.q?.trim();
  const pattern = trimmed ? `%${trimmed}%` : null;

  // Expand slug to include children when it's a root. For subcategories
  // and unknown slugs this is a single-item list, so the query shape is
  // uniform.
  const slugs = await getSlugAndActiveChildSlugs(db, input.category);

  // Subquery: businesses that carry any of these slugs as an extra
  // category (root + child slugs).
  const extraCatSubquery = db
    .select({ business_id: businessCategories.business_id })
    .from(businessCategories)
    .innerJoin(categories, eq(businessCategories.category_id, categories.id))
    .where(inArray(categories.slug, slugs));

  const categoryPredicate = or(
    inArray(businesses.category, slugs),
    inArray(businesses.id, extraCatSubquery),
  );

  const predicates = [categoryPredicate!, isNull(businesses.deleted_at), VISIBLE];
  if (input.verified) predicates.push(eq(businesses.verified, true));
  if (pattern) {
    const searchPredicate = or(
      ilike(businesses.name, pattern),
      ilike(businesses.description, pattern),
      ilike(businesses.address, pattern),
    );
    if (searchPredicate) predicates.push(searchPredicate);
  }
  const where = and(...predicates);

  const offset = (input.page - 1) * input.pageSize;

  const [rows, countRows] = await Promise.all([
    db
      .select({ ...getTableColumns(businesses) })
      .from(businesses)
      .where(where)
      .orderBy(
        SPONSORED_FLAG,
        SPONSORED_SLOT_ORDER,
        SPONSORED_TIER_PRIORITY,
        desc(SPONSORED_AMOUNT_CENTS),
        asc(businesses.name),
      )
      .limit(input.pageSize)
      .offset(offset),
    db.select({ value: count() }).from(businesses).where(where),
  ]);

  return {
    items: await attachRelations(db, rows),
    total: Number(countRows[0]?.value ?? 0),
  };
}

export interface AllBusinessesPagedInput {
  q?: string;
  page: number;
  pageSize: number;
  verified?: boolean;
}

/** Paginated directory view — all active/visible businesses across every
 *  category. Same sort order (tier1 → tier2 → tier3, then name) as the
 *  category-scoped variant but without a category predicate. */
export async function getAllBusinessesPaged(
  db: Database,
  input: AllBusinessesPagedInput,
): Promise<PagedBusinessesResult> {
  const trimmed = input.q?.trim();
  const pattern = trimmed ? `%${trimmed}%` : null;

  const predicates = [isNull(businesses.deleted_at), VISIBLE];
  if (input.verified) predicates.push(eq(businesses.verified, true));
  if (pattern) {
    const searchPredicate = or(
      ilike(businesses.name, pattern),
      ilike(businesses.description, pattern),
      ilike(businesses.address, pattern),
    );
    if (searchPredicate) predicates.push(searchPredicate);
  }
  const where = and(...predicates);
  const offset = (input.page - 1) * input.pageSize;

  const [rows, countRows] = await Promise.all([
    db
      .select({ ...getTableColumns(businesses) })
      .from(businesses)
      .where(where)
      .orderBy(asc(businesses.name))
      .limit(input.pageSize)
      .offset(offset),
    db.select({ value: count() }).from(businesses).where(where),
  ]);

  return {
    items: await attachRelations(db, rows),
    total: Number(countRows[0]?.value ?? 0),
  };
}

export async function getBusinessById(
  db: Database,
  id: string,
): Promise<Business | null> {
  const [row] = await db
    .select({ ...getTableColumns(businesses) })
    .from(businesses)
    .where(and(eq(businesses.id, id), isNull(businesses.deleted_at), VISIBLE))
    .limit(1);
  if (!row) return null;
  const [result] = await attachRelations(db, [row]);
  return result ?? null;
}

/** Admin-only sibling: bypasses the soft-delete filter so the admin edit
 *  page can load (and Restore) an archived row. Public consumers use
 *  getBusinessById which still 404s on archived. Returns BusinessAdmin
 *  (with contact_person); the public sibling deliberately doesn't. */
export async function getBusinessByIdIncludingArchived(
  db: Database,
  id: string,
): Promise<BusinessAdmin | null> {
  const [row] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.id, id))
    .limit(1);
  if (!row) return null;
  const [result] = await attachRelationsAdmin(db, [row]);
  return result ?? null;
}

export async function countActiveBusinesses(db: Database): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(businesses)
    .where(isNull(businesses.deleted_at));
  return Number(row?.value ?? 0);
}

// ─── Owner-side queries (G1) ────────────────────────────────────────────────

/** Resolve the owner record for a single business. Returns null when the
 *  business has no linked owner OR the referenced user has been deleted
 *  (the FK SET NULLs on user delete, so the second case also yields null
 *  via the JOIN). Used by the admin business-detail op to populate the
 *  Owner section alongside the business itself. */
export async function getBusinessOwner(
  db: Database,
  businessId: string,
): Promise<BusinessOwner | null> {
  const [row] = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
    })
    .from(businesses)
    .innerJoin(user, eq(user.id, businesses.owner_user_id))
    .where(eq(businesses.id, businessId))
    .limit(1);
  return row ?? null;
}

/** Return every business linked to a user — active and archived. Drives
 *  the read-only /account/listings page. Empty array when the user owns
 *  nothing. Archived rows are surfaced with the deleted_at timestamp so
 *  the UI can label them. */
export async function getBusinessesOwnedBy(
  db: Database,
  userId: string,
): Promise<Business[]> {
  const rows = await db
    .select()
    .from(businesses)
    .where(eq(businesses.owner_user_id, userId))
    .orderBy(asc(businesses.name));
  return attachRelations(db, rows);
}

/** Batch lookup — given a set of business ids, return a Map keyed by
 *  business id with the resolved owner record. Businesses with no
 *  owner are absent from the map (callers default to null via
 *  `map.get(id) ?? null`). Used by the admin list page to populate the
 *  Owner column without doing N+1 lookups. */
export async function getBusinessOwnerLookup(
  db: Database,
  businessIds: string[],
): Promise<Map<string, BusinessOwner>> {
  if (businessIds.length === 0) return new Map();
  const rows = await db
    .select({
      business_id: businesses.id,
      id: user.id,
      name: user.name,
      email: user.email,
    })
    .from(businesses)
    .innerJoin(user, eq(user.id, businesses.owner_user_id))
    .where(inArray(businesses.id, businessIds));
  const out = new Map<string, BusinessOwner>();
  for (const row of rows) {
    out.set(row.business_id, {
      id: row.id,
      name: row.name,
      email: row.email,
    });
  }
  return out;
}

// ─── Mappers ─────────────────────────────────────────────────────────────────

function toImage(row: typeof businessImages.$inferSelect): BusinessImage {
  return {
    id: row.id,
    business_id: row.business_id,
    url: row.url,
    sort_order: row.sort_order,
    created_at: new Date(row.created_at).toISOString(),
  };
}

export function toBusiness(
  row: BusinessRowWithVisibility,
  images: BusinessImage[],
  extra_category_ids: string[],
): Business {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    category: row.category,
    description: row.description,
    phone: row.phone,
    website: row.website,
    address: row.address,
    image_url: row.image_url,
    facebook_url: row.facebook_url ?? null,
    instagram_url: row.instagram_url ?? null,
    whatsapp_number: row.whatsapp_number ?? null,
    hours: row.hours ?? null,
    aira_review: row.aira_review ?? null,
    rating: row.rating ?? null,
    verified: row.verified,
    city_id: row.city_id ?? null,
    business_type: row.business_type ?? null,
    years_operating: row.years_operating ?? null,
    owner_user_id: row.owner_user_id ?? null,
    deleted_at: row.deleted_at ? row.deleted_at.toISOString() : null,
    created_at: new Date(row.created_at).toISOString(),
    updated_at: new Date(row.updated_at).toISOString(),
    images,
    extra_category_ids,
  };
}

// Admin row → BusinessAdmin. Spreads the public projection so the field
// list stays in lock-step with toBusiness, then appends admin-only
// fields (contact_person, verification_notes). Keep additions HERE,
// never on toBusiness, or they leak to unauthenticated callers.
function toBusinessAdmin(
  row: BusinessRowWithVisibility,
  images: BusinessImage[],
  extra_category_ids: string[],
): BusinessAdmin {
  return {
    ...toBusiness(row, images, extra_category_ids),
    contact_person: row.contact_person ?? null,
    verification_notes: row.verification_notes ?? null,
  };
}

export async function createBusiness(
  db: Database,
  input: BusinessCreateInput,
): Promise<BusinessAdmin> {
  // Enforce sub-only for the primary category slot. Primary categories
  // are pure navigation surfaces (they only *feature* sponsored
  // listings — see 2026-07-06-featured-business-selection); businesses
  // live under subcategories. Two layers of defense: this service
  // check + a UI filter on the admin picker that hides level-1 rows.
  await assertCategoryIsSubcategory(db, input.category);

  const existing = await db
    .select({ id: businesses.id })
    .from(businesses)
    .where(eq(businesses.slug, input.slug))
    .limit(1);
  if (existing.length > 0) {
    throw new ApiError({
      status: 409,
      code: "businesses.slug_taken",
      message: "Slug already in use",
    });
  }
  const [row] = await db
    .insert(businesses)
    .values({
      id: crypto.randomUUID(),
      name: input.name,
      slug: input.slug,
      category: input.category,
      description: input.description ?? null,
      phone: input.phone ?? null,
      address: input.address ?? null,
      city_id: input.city_id ?? null,
      business_type: input.business_type ?? null,
      years_operating: input.years_operating ?? null,
      instagram_url: input.instagram_url ?? null,
      facebook_url: input.facebook_url ?? null,
      website: input.website ?? null,
      whatsapp_number: input.whatsapp_number ?? null,
      contact_person: input.contact_person ?? null,
    })
    .returning();
  if (!row) throw new Error("Insert returned no row");
  const [result] = await attachRelationsAdmin(db, [row]);
  return result!;
}
