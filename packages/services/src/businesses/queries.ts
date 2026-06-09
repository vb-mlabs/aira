// Read-side queries for the community business directory.
//
// Pure: takes `db` as the first argument; no auth (the op layer enforces
// permission: "user" before invoking these), no Next imports, no captured
// singletons. Mirrors the rest of the @aira/services convention.

import { and, asc, count, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import { businesses, businessImages, businessCategories, categories } from "@aira/db/schema";
import type { Database } from "@aira/db/client";
import {
  VALID_TIERS,
  type Business,
  type BusinessTier,
  type BusinessImage,
} from "@aira/validators";

// Tier ordering uses an explicit CASE so renaming tiers can't silently
// reorder rows (no implicit alpha sort on the column).
const TIER_ORDER = sql`CASE ${businesses.tier} WHEN 'tier1' THEN 1 WHEN 'tier2' THEN 2 ELSE 3 END`;

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

async function attachRelations(
  db: Database,
  rows: (typeof businesses.$inferSelect)[],
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

// ─── Public queries ──────────────────────────────────────────────────────────

export async function getFeaturedBusinesses(
  db: Database,
  limit = 6,
): Promise<Business[]> {
  const rows = await db
    .select()
    .from(businesses)
    .where(
      and(
        inArray(businesses.tier, ["tier1", "tier2"]),
        isNull(businesses.deleted_at),
      ),
    )
    .orderBy(TIER_ORDER, asc(businesses.name))
    .limit(limit);
  return attachRelations(db, rows);
}

export async function getBusinessesByCategory(
  db: Database,
  category: string,
): Promise<Business[]> {
  const rows = await db
    .select()
    .from(businesses)
    .where(
      and(
        eq(businesses.category, category),
        isNull(businesses.deleted_at),
      ),
    )
    .orderBy(TIER_ORDER, asc(businesses.name));
  return attachRelations(db, rows);
}

/** Admin-only: returns ALL businesses (or only active when includeArchived
 *  is false). No pagination — admin's a small audience and the table
 *  doesn't grow that fast. */
export async function getAllBusinesses(
  db: Database,
  opts: { includeArchived: boolean } = { includeArchived: false },
): Promise<Business[]> {
  const where = opts.includeArchived ? undefined : isNull(businesses.deleted_at);
  const builder = db
    .select()
    .from(businesses)
    .orderBy(TIER_ORDER, asc(businesses.name));
  const rows = await (where ? builder.where(where) : builder);
  return attachRelations(db, rows);
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

/** Paginated variant with scoped keyword search (name + description +
 *  address, ILIKE) and an optional verified filter.
 *
 *  Multi-category: matches businesses whose primary category equals the
 *  slug OR who have an extra category (via business_category join) with
 *  the same slug. Runs items + count in parallel. */
export async function getBusinessesByCategoryPaged(
  db: Database,
  input: PagedBusinessesInput,
): Promise<PagedBusinessesResult> {
  const trimmed = input.q?.trim();
  const pattern = trimmed ? `%${trimmed}%` : null;

  // Subquery: businesses that carry this slug as an extra category.
  const extraCatSubquery = db
    .select({ business_id: businessCategories.business_id })
    .from(businessCategories)
    .innerJoin(categories, eq(businessCategories.category_id, categories.id))
    .where(eq(categories.slug, input.category));

  const categoryPredicate = or(
    eq(businesses.category, input.category),
    inArray(businesses.id, extraCatSubquery),
  );

  const predicates = [categoryPredicate!, isNull(businesses.deleted_at)];
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
      .select()
      .from(businesses)
      .where(where)
      .orderBy(TIER_ORDER, asc(businesses.name))
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
    .select()
    .from(businesses)
    .where(and(eq(businesses.id, id), isNull(businesses.deleted_at)))
    .limit(1);
  if (!row) return null;
  const [result] = await attachRelations(db, [row]);
  return result ?? null;
}

/** Admin-only sibling: bypasses the soft-delete filter so the admin edit
 *  page can load (and Restore) an archived row. Public consumers use
 *  getBusinessById which still 404s on archived. */
export async function getBusinessByIdIncludingArchived(
  db: Database,
  id: string,
): Promise<Business | null> {
  const [row] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.id, id))
    .limit(1);
  if (!row) return null;
  const [result] = await attachRelations(db, [row]);
  return result ?? null;
}

export async function countActiveBusinesses(db: Database): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(businesses)
    .where(isNull(businesses.deleted_at));
  return Number(row?.value ?? 0);
}

// ─── Mappers ─────────────────────────────────────────────────────────────────

function isValidTier(value: string): value is BusinessTier {
  return (VALID_TIERS as readonly string[]).includes(value);
}

function toImage(row: typeof businessImages.$inferSelect): BusinessImage {
  return {
    id: row.id,
    business_id: row.business_id,
    url: row.url,
    sort_order: row.sort_order,
    created_at: new Date(row.created_at).toISOString(),
  };
}

function toBusiness(
  row: typeof businesses.$inferSelect,
  images: BusinessImage[],
  extra_category_ids: string[],
): Business {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    // DB rows are unvalidated text; coerce to the union or fall back to a
    // safe default. Invalid rows simply render under tier3 / their raw
    // category — they don't crash the page.
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
    tier: isValidTier(row.tier) ? row.tier : "tier3",
    verified: row.verified,
    deleted_at: row.deleted_at ? row.deleted_at.toISOString() : null,
    created_at: new Date(row.created_at).toISOString(),
    updated_at: new Date(row.updated_at).toISOString(),
    images,
    extra_category_ids,
  };
}
