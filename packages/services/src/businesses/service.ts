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
import { businesses, businessCategories, user as userTable } from "@aira/db/schema";
import { createAudit } from "@aira/db/audit";
import type { Database } from "@aira/db/client";
import type { CallerContext } from "@aira/api/context";
import { ApiError } from "@aira/api";
import type {
  Business,
  BusinessAdmin,
  BusinessOwner,
  BusinessUpdateInput,
} from "@aira/validators/businesses";
import { createNotification } from "../notifications";
import {
  createBusiness,
  getBusinessByIdIncludingArchived,
  getBusinessOwner,
} from "./queries";

type UpdateData = Omit<BusinessUpdateInput, "id">;

function auditClient(ctx: CallerContext): "web" | "mobile" {
  return ctx.source === "mobile" ? "mobile" : "web";
}

export async function updateBusiness(
  db: Database,
  ctx: CallerContext,
  id: string,
  data: UpdateData,
): Promise<BusinessAdmin | null> {
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
  if (data.verified !== undefined) updatePayload.verified = data.verified;
  if (data.city_id !== undefined) updatePayload.city_id = data.city_id;
  if (data.business_type !== undefined) updatePayload.business_type = data.business_type;
  if (data.years_operating !== undefined) updatePayload.years_operating = data.years_operating;
  if (data.contact_person !== undefined) updatePayload.contact_person = data.contact_person;

  const hasBusinessUpdate = Object.keys(updatePayload).length > 0;
  const hasCategoryUpdate = data.extra_category_ids !== undefined;

  if (!hasBusinessUpdate && !hasCategoryUpdate) {
    return getBusinessByIdIncludingArchived(db, id);
  }

  // contact_person diff audit. Read the old value before the mutation;
  // emit business.contact_person_changed only when it actually changes.
  // Audit BEFORE the mutation (matches archive/restore convention so a
  // failed audit blocks the write).
  if (data.contact_person !== undefined) {
    const [existing] = await db
      .select({ contact_person: businesses.contact_person })
      .from(businesses)
      .where(eq(businesses.id, id))
      .limit(1);
    const oldValue = existing?.contact_person ?? null;
    const newValue = data.contact_person;
    if (oldValue !== newValue) {
      const audit = createAudit(db);
      await audit({
        actorId: ctx.userId,
        action: "business.contact_person_changed",
        target: { type: "business", id },
        meta: {
          kind: "business.contact_person_changed",
          from: oldValue,
          to: newValue,
        },
        client: auditClient(ctx),
      });
    }
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

// ─── G1: Owner assignment ───────────────────────────────────────────────────
//
// The op layer composes the in-app notification copy (brand.name lives at
// the apps/web boundary via @aira/config). The service receives ready-to-
// use strings and decides the recipient. Email send-out also lives at the
// op layer — best-effort, post-commit; an email failure must NOT roll back
// the assignment.

export interface AssignBusinessOwnerArgs {
  id: string;
  ownerUserId: string;
  /** Pre-composed notification copy. Op layer interpolates brand.name +
   *  business.name; service stays config-free. */
  notification: {
    title: string;
    message: string;
    href?: string;
  };
}

export interface AssignBusinessOwnerResult {
  business: Business;
  owner: BusinessOwner;
  /** null on first-time assignment; non-null when a re-assign overwrote
   *  an existing FK. Used by the op layer to write the audit meta
   *  correctly and (later) to skip emailing the previous owner. */
  previousOwnerUserId: string | null;
}

export async function assignBusinessOwner(
  db: Database,
  ctx: CallerContext,
  args: AssignBusinessOwnerArgs,
): Promise<AssignBusinessOwnerResult> {
  const { id, ownerUserId, notification } = args;

  // Resolve the business (404 if not found OR archived — owners can't be
  // assigned to deleted rows).
  const [biz] = await db
    .select({
      id: businesses.id,
      owner_user_id: businesses.owner_user_id,
      deleted_at: businesses.deleted_at,
    })
    .from(businesses)
    .where(eq(businesses.id, id))
    .limit(1);
  if (!biz) {
    throw ApiError.notFound("businesses.not_found", "Business not found");
  }
  if (biz.deleted_at !== null) {
    throw ApiError.badRequest(
      "businesses.archived",
      "Cannot assign an owner to an archived business",
    );
  }

  // Resolve the target user (404 if not found). Email is needed for the
  // audit meta and the email payload upstream.
  const [target] = await db
    .select({
      id: userTable.id,
      name: userTable.name,
      email: userTable.email,
    })
    .from(userTable)
    .where(eq(userTable.id, ownerUserId))
    .limit(1);
  if (!target) {
    throw ApiError.notFound("admin.user_not_found", "User not found");
  }

  const previousOwnerUserId = biz.owner_user_id;

  // Audit BEFORE mutation — same convention as archiveBusiness /
  // restoreBusiness. A failed audit blocks the assignment so the trail
  // stays authoritative.
  const audit = createAudit(db);
  await audit({
    actorId: ctx.userId,
    action: "business.owner_assigned",
    target: { type: "business", id },
    meta: {
      kind: "business.owner_assigned",
      owner_user_id: target.id,
      owner_email: target.email,
      prev_owner_user_id: previousOwnerUserId,
    },
    client: auditClient(ctx),
  });

  await db
    .update(businesses)
    .set({ owner_user_id: target.id })
    .where(eq(businesses.id, id));

  // In-app notification — fired AFTER the FK write so a notification
  // failure can't roll back the assignment (createNotification has its
  // own retry/best-effort semantics for the row insert). Mirrors how
  // messages.service fans out: assignment success is recoverable even
  // if the bell stays empty for a moment.
  await createNotification(db, ctx, {
    userId: target.id,
    body: {
      kind: "generic",
      title: notification.title,
      message: notification.message,
      href: notification.href,
    },
  });

  const fresh = await getBusinessByIdIncludingArchived(db, id);
  if (!fresh) {
    // Vanishingly unlikely (we just updated this row) but the type
    // contract demands a value. A concurrent archive between our update
    // and re-read is the only way here.
    throw ApiError.notFound("businesses.not_found", "Business disappeared");
  }
  return {
    business: fresh,
    owner: { id: target.id, name: target.name, email: target.email },
    previousOwnerUserId,
  };
}

export async function unassignBusinessOwner(
  db: Database,
  ctx: CallerContext,
  args: { id: string },
): Promise<{ business: Business; previousOwnerUserId: string | null }> {
  const { id } = args;

  const [biz] = await db
    .select({
      id: businesses.id,
      owner_user_id: businesses.owner_user_id,
    })
    .from(businesses)
    .where(eq(businesses.id, id))
    .limit(1);
  if (!biz) {
    throw ApiError.notFound("businesses.not_found", "Business not found");
  }

  // Idempotent: unassigning a business that has no owner is a successful
  // no-op. No audit row written — there's nothing to record.
  if (biz.owner_user_id === null) {
    const fresh = await getBusinessByIdIncludingArchived(db, id);
    if (!fresh) {
      throw ApiError.notFound("businesses.not_found", "Business not found");
    }
    return { business: fresh, previousOwnerUserId: null };
  }

  const previousOwnerUserId = biz.owner_user_id;
  const audit = createAudit(db);
  await audit({
    actorId: ctx.userId,
    action: "business.owner_unassigned",
    target: { type: "business", id },
    meta: {
      kind: "business.owner_unassigned",
      prev_owner_user_id: previousOwnerUserId,
    },
    client: auditClient(ctx),
  });

  await db
    .update(businesses)
    .set({ owner_user_id: null })
    .where(eq(businesses.id, id));

  const fresh = await getBusinessByIdIncludingArchived(db, id);
  if (!fresh) {
    throw ApiError.notFound("businesses.not_found", "Business disappeared");
  }
  return { business: fresh, previousOwnerUserId };
}

// Re-export getBusinessOwner for callers (admin op) that import from the
// public surface — it's a query but it sits in the owner-assignment story.
export { getBusinessOwner };
