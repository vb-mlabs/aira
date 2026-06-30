// Personal favorites — read/write queries for the business_favorite table.
//
// Pure: takes `db` as the first argument; no auth (the op layer enforces
// `permission: "user"` before invoking these). Mirrors the @aira/services
// convention.

import { and, desc, eq, getTableColumns } from "drizzle-orm";
import { businesses, businessFavorite } from "@aira/db/schema";
import type { Database } from "@aira/db/client";
import type { Business } from "@aira/validators";
import { attachRelations } from "../businesses/queries";

// Same is_paid_active flag the public business queries select alongside the
// row so toBusiness can demote pending-only listings to tier3 for display.
// Inlined here (rather than imported) to keep the favorites module
// independent of the businesses module's internals beyond the public mapper.
import { sql } from "drizzle-orm";
const IS_PAID_ACTIVE = sql<boolean>`EXISTS (
  SELECT 1 FROM business_subscription bs
  WHERE bs.business_id = businesses.id
  AND bs.payment_status = 'paid'
  AND now() BETWEEN bs.start_date AND bs.end_date
)`;

/** Insert a favorite. Idempotent via the (business_id, user_id) unique
 *  index — re-favoriting an already-favorited business is a no-op. */
export async function addFavorite(
  db: Database,
  userId: string,
  businessId: string,
): Promise<void> {
  await db
    .insert(businessFavorite)
    .values({
      business_id: businessId,
      user_id: userId,
    })
    .onConflictDoNothing();
}

/** Remove a favorite. Idempotent — unfavoriting a row that doesn't exist
 *  succeeds silently. */
export async function removeFavorite(
  db: Database,
  userId: string,
  businessId: string,
): Promise<void> {
  await db
    .delete(businessFavorite)
    .where(
      and(
        eq(businessFavorite.business_id, businessId),
        eq(businessFavorite.user_id, userId),
      ),
    );
}

/** Hydrated Business rows the user has favorited, ordered most-recent-first
 *  by the join's created_at. Archived rows (deleted_at IS NOT NULL) flow
 *  through so /account/favorites can render them with an "Archived" badge;
 *  the F14 hard-purge cron eventually removes the FK-cascaded fav row. */
export async function listMyFavorites(
  db: Database,
  userId: string,
): Promise<Business[]> {
  const rows = await db
    .select({
      ...getTableColumns(businesses),
      is_paid_active: IS_PAID_ACTIVE,
      fav_created_at: businessFavorite.created_at,
    })
    .from(businessFavorite)
    .innerJoin(businesses, eq(businesses.id, businessFavorite.business_id))
    .where(eq(businessFavorite.user_id, userId))
    .orderBy(desc(businessFavorite.created_at));
  return attachRelations(db, rows);
}

/** The slim id-only projection — used by listing pages to decorate cards
 *  with their fav state without paying for full Business hydration. */
export async function listMyFavoriteIds(
  db: Database,
  userId: string,
): Promise<string[]> {
  const rows = await db
    .select({ business_id: businessFavorite.business_id })
    .from(businessFavorite)
    .where(eq(businessFavorite.user_id, userId));
  return rows.map((r) => r.business_id);
}
