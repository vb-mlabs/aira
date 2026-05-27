// Read-side queries for the community business directory.
//
// VALID_TIERS / VALID_CATEGORIES are re-exported from ../types so callers
// at the API/route boundary can validate inputs against the same source.
// Tier ordering uses an explicit CASE so renaming tiers can't silently
// reorder rows.

import "server-only"
import { asc, eq, inArray, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { businesses } from "@aira/db/schema"
import {
  VALID_TIERS,
  VALID_CATEGORIES,
  type Business,
  type BusinessTier,
  type BusinessCategory,
} from "../types"

export { VALID_TIERS, VALID_CATEGORIES }

const TIER_ORDER = sql`CASE ${businesses.tier} WHEN 'tier1' THEN 1 WHEN 'tier2' THEN 2 ELSE 3 END`

export async function getFeaturedBusinesses(limit = 6): Promise<Business[]> {
  const rows = await db
    .select()
    .from(businesses)
    .where(inArray(businesses.tier, ["tier1", "tier2"]))
    .orderBy(TIER_ORDER, asc(businesses.name))
    .limit(limit)
  return rows.map(toBusiness)
}

export async function getBusinessesByCategory(
  category: string,
): Promise<Business[]> {
  if (!isValidCategory(category)) return []
  const rows = await db
    .select()
    .from(businesses)
    .where(eq(businesses.category, category))
    .orderBy(TIER_ORDER, asc(businesses.name))
  return rows.map(toBusiness)
}

export async function getBusinessById(id: string): Promise<Business | null> {
  const [row] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.id, id))
    .limit(1)
  return row ? toBusiness(row) : null
}

export async function getBusinessCountsByCategory(): Promise<
  Record<BusinessCategory, number>
> {
  const rows = await db
    .select({
      category: businesses.category,
      count: sql<number>`count(*)::int`,
    })
    .from(businesses)
    .groupBy(businesses.category)

  const counts = Object.fromEntries(
    VALID_CATEGORIES.map((c) => [c, 0]),
  ) as Record<BusinessCategory, number>
  for (const row of rows) {
    if (isValidCategory(row.category)) counts[row.category] = row.count
  }
  return counts
}

function isValidCategory(value: string): value is BusinessCategory {
  return (VALID_CATEGORIES as readonly string[]).includes(value)
}

function isValidTier(value: string): value is BusinessTier {
  return (VALID_TIERS as readonly string[]).includes(value)
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
    tier: isValidTier(row.tier) ? row.tier : "tier3",
    verified: row.verified,
    created_at: new Date(row.created_at).toISOString(),
    updated_at: new Date(row.updated_at).toISOString(),
  }
}
