// Read-side queries for the community business directory.
//
// Pure: takes `db` as the first argument; no auth (the op layer enforces
// permission: "user" before invoking these), no Next imports, no captured
// singletons. Mirrors the rest of the @aira/services convention.

import { and, asc, count, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import { businesses } from "@aira/db/schema";
import type { Database } from "@aira/db/client";
import {
  VALID_TIERS,
  type Business,
  type BusinessTier,
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
    .where(
      and(
        inArray(businesses.tier, ["tier1", "tier2"]),
        isNull(businesses.deleted_at),
      ),
    )
    .orderBy(TIER_ORDER, asc(businesses.name))
    .limit(limit);
  return rows.map(toBusiness);
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
  return rows.map(toBusiness);
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
  // Build the predicate set once and reuse it for both the SELECT and
  // the COUNT. Empty-after-trim q skips the search predicate entirely.
  const trimmed = input.q?.trim();
  const pattern = trimmed ? `%${trimmed}%` : null;
  const predicates = [
    eq(businesses.category, input.category),
    isNull(businesses.deleted_at),
  ];
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
    .where(and(eq(businesses.id, id), isNull(businesses.deleted_at)))
    .limit(1);
  return row ? toBusiness(row) : null;
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
  return row ? toBusiness(row) : null;
}

export async function countActiveBusinesses(db: Database): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(businesses)
    .where(isNull(businesses.deleted_at));
  return row?.value ?? 0;
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
  };
}
