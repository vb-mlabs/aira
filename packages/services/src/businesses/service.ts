import { eq } from "drizzle-orm";
import { businesses } from "@aira/db/schema";
import type { Database } from "@aira/db/client";
import type { Business, BusinessUpdateInput } from "@aira/validators/businesses";
import { getBusinessById } from "./queries";

type UpdateData = Omit<BusinessUpdateInput, "id">;

export async function updateBusiness(
  db: Database,
  id: string,
  data: UpdateData,
): Promise<Business | null> {
  const updatePayload: Partial<typeof businesses.$inferInsert> = {};

  if (data.name !== undefined) updatePayload.name = data.name;
  if (data.description !== undefined) updatePayload.description = data.description;
  if (data.phone !== undefined) updatePayload.phone = data.phone;
  if (data.website !== undefined) updatePayload.website = data.website;
  if (data.address !== undefined) updatePayload.address = data.address;
  if (data.tier !== undefined) updatePayload.tier = data.tier;
  if (data.facebook_url !== undefined) updatePayload.facebook_url = data.facebook_url;
  if (data.instagram_url !== undefined) updatePayload.instagram_url = data.instagram_url;
  if (data.whatsapp_number !== undefined) updatePayload.whatsapp_number = data.whatsapp_number;
  if (data.hours !== undefined) updatePayload.hours = data.hours;
  if (data.aira_review !== undefined) updatePayload.aira_review = data.aira_review;
  if (data.rating !== undefined) updatePayload.rating = data.rating;

  if (Object.keys(updatePayload).length === 0) {
    return getBusinessById(db, id);
  }

  await db
    .update(businesses)
    .set(updatePayload)
    .where(eq(businesses.id, id));

  return getBusinessById(db, id);
}
