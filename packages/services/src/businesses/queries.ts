// Read-side queries for the community business directory.
//
// Pure: takes `db` as the first argument; no auth (the op layer enforces
// permission: "user" before invoking these), no Next imports, no captured
// singletons. Mirrors the rest of the @aira/services convention.

import { and, asc, count, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { businesses } from "@aira/db/schema";
import type { Database } from "@aira/db/client";
import {
  VALID_TIERS,
  VALID_CATEGORIES,
  type Business,
  type BusinessTier,
  type BusinessCategory,
} from "@aira/validators/businesses";

// Tier ordering uses an explicit CASE so renaming tiers can't silently
// reorder rows (no implicit alpha sort on the column).
const TIER_ORDER = sql`CASE ${businesses.tier} WHEN 'tier1' THEN 1 WHEN 'tier2' THEN 2 ELSE 3 END`;

export async function getFeaturedBusinesses(
  db: Database,
  limit = 6,
): Promise<Business[]> {
  const rows = await db
    .select()
    .from(businesses)
    .where(inArray(businesses.tier, ["tier1", "tier2"]))
    .orderBy(TIER_ORDER, asc(businesses.name))
    .limit(limit);
  return rows.map(toBusiness);
}

export async function getBusinessesByCategory(
  db: Database,
  category: string,
): Promise<Business[]> {
  if (!isValidCategory(category)) return [];
  const rows = await db
    .select()
    .from(businesses)
    .where(eq(businesses.category, category))
    .orderBy(TIER_ORDER, asc(businesses.name));
  return rows.map(toBusiness);
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

/** Paginated variant of getBusinessesByCategory with scoped keyword
 *  search (name + description + address, case-insensitive ILIKE) and an
 *  optional verified filter. Runs the items query and the count query
 *  in parallel via Promise.all. */
export async function getBusinessesByCategoryPaged(
  db: Database,
  input: PagedBusinessesInput,
): Promise<PagedBusinessesResult> {
  if (!isValidCategory(input.category)) {
    return { items: [], total: 0 };
  }

  // Build the predicate set once and reuse it for both the SELECT and
  // the COUNT. Empty-after-trim q skips the search predicate entirely.
  const trimmed = input.q?.trim();
  const pattern = trimmed ? `%${trimmed}%` : null;
  const predicates = [eq(businesses.category, input.category)];
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
    items: rows.map(toBusiness),
    total: countRows[0]?.value ?? 0,
  };
}

export async function getBusinessById(
  db: Database,
  id: string,
): Promise<Business | null> {
  const [row] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.id, id))
    .limit(1);
  return row ? toBusiness(row) : null;
}

function isValidCategory(value: string): value is BusinessCategory {
  return (VALID_CATEGORIES as readonly string[]).includes(value);
}

function isValidTier(value: string): value is BusinessTier {
  return (VALID_TIERS as readonly string[]).includes(value);
}

function toBusiness(row: typeof businesses.$inferSelect): Business {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    // DB rows are unvalidated text; coerce to the union or fall back to a
    // safe default. Invalid rows simply render under tier3 / their raw
    // category — they don't crash the page.
    category: isValidCategory(row.category) ? row.category : "shopping",
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
    created_at: new Date(row.created_at).toISOString(),
    updated_at: new Date(row.updated_at).toISOString(),
  };
}
