import "server-only";

// Admin mutations against the businesses table.
//
// Authorization invariant: every entry point assumes ctx.user.role is
// already "admin" (or that admin is not required — updateBusiness keeps
// the previous shape and is called via admin-permission ops). The
// operation adapter enforces this BEFORE the service runs.
//
// Audit convention follows admin/service.ts: call audit() BEFORE the
// mutation. If audit fails, the mutation does NOT run. The accepted
// failure mode is "audit row exists but mutation rolled back" (annoying
// but not dangerous) rather than "mutation succeeded with no trail"
// (worse).

import { and, eq, inArray, isNotNull, isNull, lt, notInArray } from "drizzle-orm";
import { businesses, businessCategories } from "@aira/db/schema";
import { createAudit } from "@aira/db/audit";
import type { Database } from "@aira/db/client";
import type { CallerContext } from "@aira/api/context";
import { ApiError } from "@aira/api";
import type { Business, BusinessUpdateInput } from "@aira/validators/businesses";
import {
  createBusiness,
  getBusinessByIdIncludingArchived,
} from "./queries";

type UpdateData = Omit<BusinessUpdateInput, "id">;

function auditClient(ctx: CallerContext): "web" | "mobile" {
  return ctx.source === "mobile" ? "mobile" : "web";
}

export async function updateBusiness(
  db: Database,
  id: string,
  data: UpdateData,
): Promise<Business | null> {
  const updatePayload: Partial<typeof businesses.$inferInsert> = {};

  if (data.name !== undefined) updatePayload.name = data.name;
  if (data.category !== undefined) updatePayload.category = data.category;
  if (data.description !== undefined) updatePayload.description = data.description;
  if (data.phone !== undefined) updatePayload.phone = data.phone;
  if (data.website !== undefined) updatePayload.website = data.website;
  if (data.address !== undefined) updatePayload.address = data.address;
  // tier is intentionally NOT written here — the column is now a
  // denormalised cache maintained by the subscription service via
  // recomputeBusinessTier. The BusinessUpdateInputSchema strips the field
  // at the validator boundary; this is defense-in-depth.
  if (data.facebook_url !== undefined) updatePayload.facebook_url = data.facebook_url;
  if (data.instagram_url !== undefined) updatePayload.instagram_url = data.instagram_url;
  if (data.whatsapp_number !== undefined) updatePayload.whatsapp_number = data.whatsapp_number;
  if (data.hours !== undefined) updatePayload.hours = data.hours;
  if (data.aira_review !== undefined) updatePayload.aira_review = data.aira_review;
  if (data.rating !== undefined) updatePayload.rating = data.rating;
  if (data.city_id !== undefined) updatePayload.city_id = data.city_id;
  if (data.business_type !== undefined) updatePayload.business_type = data.business_type;
  if (data.years_operating !== undefined) updatePayload.years_operating = data.years_operating;

  const hasBusinessUpdate = Object.keys(updatePayload).length > 0;
  const hasCategoryUpdate = data.extra_category_ids !== undefined;

  if (!hasBusinessUpdate && !hasCategoryUpdate) {
    return getBusinessByIdIncludingArchived(db, id);
  }

  await db.transaction(async (tx) => {
    if (hasBusinessUpdate) {
      await tx.update(businesses).set(updatePayload).where(eq(businesses.id, id));
    }

    if (hasCategoryUpdate) {
      const newIds = data.extra_category_ids!;
      if (newIds.length === 0) {
        // Clear all extra categories.
        await tx
          .delete(businessCategories)
          .where(eq(businessCategories.business_id, id));
      } else {
        // Remove rows no longer in the desired set.
        await tx
          .delete(businessCategories)
          .where(
            and(
              eq(businessCategories.business_id, id),
              notInArray(businessCategories.category_id, newIds),
            ),
          );
        // Upsert new entries (ignore conflicts from existing rows).
        await tx
          .insert(businessCategories)
          .values(
            newIds.map((category_id) => ({
              business_id: id,
              category_id,
            })),
          )
          .onConflictDoNothing();
      }
    }
  });

  // Use the including-archived variant so admin edits on archived rows
  // still return the updated row instead of null (per the F13 decision
  // that updateBusiness doesn't block archived edits).
  return getBusinessByIdIncludingArchived(db, id);
}

export async function archiveBusiness(
  db: Database,
  ctx: CallerContext,
  id: string,
): Promise<Business | null> {
  const audit = createAudit(db);
  await audit({
    actorId: ctx.userId,
    action: "business.archived",
    target: { type: "business", id },
    meta: { kind: "business.archived" },
    client: auditClient(ctx),
  });

  // Conditional update so a double-archive (or archiving a missing id)
  // returns 0 rows → notFound. Idempotent in spirit.
  const result = await db
    .update(businesses)
    .set({ deleted_at: new Date() })
    .where(and(eq(businesses.id, id), isNull(businesses.deleted_at)))
    .returning({ id: businesses.id });

  if (result.length === 0) {
    throw ApiError.notFound(
      "businesses.not_found",
      "Business not found or already archived",
    );
  }

  return getBusinessByIdIncludingArchived(db, id);
}

export async function setBusinessFeatureImage(
  db: Database,
  id: string,
  url: string,
): Promise<Business | null> {
  await db
    .update(businesses)
    .set({ image_url: url })
    .where(eq(businesses.id, id));
  return getBusinessByIdIncludingArchived(db, id);
}

export async function clearBusinessFeatureImage(
  db: Database,
  id: string,
): Promise<{ oldUrl: string | null }> {
  const [row] = await db
    .select({ image_url: businesses.image_url })
    .from(businesses)
    .where(eq(businesses.id, id));
  const oldUrl = row?.image_url ?? null;
  if (oldUrl !== null) {
    await db
      .update(businesses)
      .set({ image_url: null })
      .where(eq(businesses.id, id));
  }
  return { oldUrl };
}

export async function purgeArchivedBusinesses(
  db: Database,
  { olderThanDays }: { olderThanDays: number },
): Promise<{ deleted: number }> {
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000)
  const result = await db
    .delete(businesses)
    .where(and(isNotNull(businesses.deleted_at), lt(businesses.deleted_at, cutoff)))
    .returning({ id: businesses.id })
  return { deleted: result.length }
}

export async function restoreBusiness(
  db: Database,
  ctx: CallerContext,
  id: string,
): Promise<Business | null> {
  const audit = createAudit(db);
  await audit({
    actorId: ctx.userId,
    action: "business.restored",
    target: { type: "business", id },
    meta: { kind: "business.restored" },
    client: auditClient(ctx),
  });

  const result = await db
    .update(businesses)
    .set({ deleted_at: null })
    .where(and(eq(businesses.id, id), isNotNull(businesses.deleted_at)))
    .returning({ id: businesses.id });

  if (result.length === 0) {
    throw ApiError.notFound(
      "businesses.not_found",
      "Business not found or not archived",
    );
  }

  return getBusinessByIdIncludingArchived(db, id);
}
