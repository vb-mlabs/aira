// Read-side queries for the community business directory.
//
// Pure: takes `db` as the first argument; no auth (the op layer enforces
// permission: "user" before invoking these), no Next imports, no captured
// singletons. Mirrors the rest of the @aira/services convention.

import { asc, eq, inArray, sql } from "drizzle-orm";
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
    tier: isValidTier(row.tier) ? row.tier : "tier3",
    verified: row.verified,
    created_at: new Date(row.created_at).toISOString(),
    updated_at: new Date(row.updated_at).toISOString(),
  };
}
