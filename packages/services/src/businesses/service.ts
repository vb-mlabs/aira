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

import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { businesses } from "@aira/db/schema";
import { createAudit } from "@aira/db/audit";
import type { Database } from "@aira/db/client";
import type { CallerContext } from "@aira/api/context";
import { ApiError } from "@aira/api";
import type { Business, BusinessUpdateInput } from "@aira/validators/businesses";
import {
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
  if (data.tier !== undefined) updatePayload.tier = data.tier;
  if (data.facebook_url !== undefined) updatePayload.facebook_url = data.facebook_url;
  if (data.instagram_url !== undefined) updatePayload.instagram_url = data.instagram_url;
  if (data.whatsapp_number !== undefined) updatePayload.whatsapp_number = data.whatsapp_number;
  if (data.hours !== undefined) updatePayload.hours = data.hours;
  if (data.aira_review !== undefined) updatePayload.aira_review = data.aira_review;
  if (data.rating !== undefined) updatePayload.rating = data.rating;

  if (Object.keys(updatePayload).length === 0) {
    return getBusinessByIdIncludingArchived(db, id);
  }

  await db
    .update(businesses)
    .set(updatePayload)
    .where(eq(businesses.id, id));

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
