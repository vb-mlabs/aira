import "server-only";

import { asc, count, eq, max } from "drizzle-orm";
import { businessImages } from "@aira/db/schema";
import type { Database } from "@aira/db/client";
import { ApiError } from "@aira/api";
import type { BusinessImage } from "@aira/validators";

const MAX_IMAGES = 3;

export async function listBusinessImages(
  db: Database,
  businessId: string,
): Promise<BusinessImage[]> {
  const rows = await db
    .select()
    .from(businessImages)
    .where(eq(businessImages.business_id, businessId))
    .orderBy(asc(businessImages.sort_order));
  return rows.map(toImage);
}

export async function addBusinessImage(
  db: Database,
  businessId: string,
  url: string,
): Promise<BusinessImage> {
  const [agg] = await db
    .select({ cnt: count(), maxOrder: max(businessImages.sort_order) })
    .from(businessImages)
    .where(eq(businessImages.business_id, businessId));

  if (Number(agg?.cnt ?? 0) >= MAX_IMAGES) {
    throw ApiError.badRequest(
      "images.limit_reached",
      `Maximum ${MAX_IMAGES} images per business`,
    );
  }

  const nextOrder = (agg?.maxOrder ?? -1) + 1;

  const [row] = await db
    .insert(businessImages)
    .values({ business_id: businessId, url, sort_order: nextOrder })
    .returning();

  return toImage(row);
}

/** Deletes the image row and returns the stored URL for object-storage cleanup. */
export async function removeBusinessImage(
  db: Database,
  imageId: string,
): Promise<string> {
  const [deleted] = await db
    .delete(businessImages)
    .where(eq(businessImages.id, imageId))
    .returning({ url: businessImages.url });

  if (!deleted) {
    throw ApiError.notFound("images.not_found", "Image not found");
  }

  return deleted.url;
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
