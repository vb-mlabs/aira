// Category aggregates — count of currently-visible businesses per category.
//
// "Categories" are an enum of strings, not their own table. This service
// exists so the count contract has a domain home (and is reachable as
// /api/v1/categories) without the businesses module growing a categories
// shape.

import { sql } from "drizzle-orm";
import { businesses } from "@aira/db/schema";
import type { Database } from "@aira/db/client";
import {
  VALID_CATEGORIES,
  type BusinessCategory,
} from "@aira/validators/businesses";

export async function getBusinessCountsByCategory(
  db: Database,
): Promise<Record<BusinessCategory, number>> {
  const rows = await db
    .select({
      category: businesses.category,
      count: sql<number>`count(*)::int`,
    })
    .from(businesses)
    .groupBy(businesses.category);

  const counts = Object.fromEntries(
    VALID_CATEGORIES.map((c) => [c, 0]),
  ) as Record<BusinessCategory, number>;
  for (const row of rows) {
    if (isValidCategory(row.category)) counts[row.category] = row.count;
  }
  return counts;
}

function isValidCategory(value: string): value is BusinessCategory {
  return (VALID_CATEGORIES as readonly string[]).includes(value);
}
