import "server-only";

import { asc, count, eq } from "drizzle-orm";
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
  sortOrder: number,
): Promise<BusinessImage> {
  const [countRow] = await db
    .select({ value: count() })
    .from(businessImages)
    .where(eq(businessImages.business_id, businessId));

  if (Number(countRow?.value ?? 0) >= MAX_IMAGES) {
    throw ApiError.badRequest(
      "images.limit_reached",
      `Maximum ${MAX_IMAGES} images per business`,
    );
  }

  const [row] = await db
    .insert(businessImages)
    .values({ business_id: businessId, url, sort_order: sortOrder })
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
