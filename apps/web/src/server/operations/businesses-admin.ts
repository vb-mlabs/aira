import "server-only"

// Admin-permission operations for the businesses domain.
//
// Sibling to operations/businesses.ts (which holds the public ops). The
// split mirrors the services convention: same domain, two surfaces, one
// per permission level. Admin ops here go through the idle-timeout
// freshness gate via defineOperation's "admin" permission.

import { and, desc, eq, gte, lte, inArray, sql } from "drizzle-orm"
import { businessSubscriptions } from "@aira/db/schema"
import { businesses as businessesService } from "@aira/services"
import { brand } from "@aira/config"
import {
  BusinessCreateInputSchema,
  BusinessUpdateInputSchema,
  BusinessUpdateOutputSchema,
  BusinessArchiveInputSchema,
  BusinessRestoreInputSchema,
  BusinessListInputSchema,
  BusinessListOutputSchema,
  BusinessDetailInputSchema,
  BusinessDetailOutputSchema,
  BusinessSchema,
  BusinessOwnerSchema,
  BusinessAdminDetailOutputSchema,
  AssignBusinessOwnerInputSchema,
  UnassignBusinessOwnerInputSchema,
} from "@aira/validators/businesses"
import { z } from "zod"
import { ApiError } from "@aira/api"
import { sendNotificationEmail, buildAuthUrl } from "@/lib/email"
import { logger } from "@/lib/logger"
import { defineOperation } from "./index"

const AdminBusinessItemSchema = BusinessSchema.extend({
  latest_payment_status: z.enum(["paid", "pending", "overdue"]).nullable(),
  latest_subscription_end_date: z.string().nullable(),
  latest_subscription_days_remaining: z.number().int().nullable(),
  /** Resolved owner record via getBusinessOwnerLookup. null when
   *  owner_user_id is null OR when the referenced user has been
   *  deleted/anonymised (INNER JOIN drops those rows). */
  owner: BusinessOwnerSchema.nullable(),
})

const AdminBusinessListInputSchema = BusinessListInputSchema.extend({
  renewing: z.coerce.number().int().min(1).max(365).optional(),
})

const AdminBusinessListOutputSchema = z.object({
  items: z.array(AdminBusinessItemSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
})

export const createBusinessAdminOp = defineOperation({
  name: "admin.businesses.create",
  input: BusinessCreateInputSchema,
  output: z.object({ business: BusinessSchema }),
  permission: "admin",
  handler: async (db, _ctx, input) => {
    const business = await businessesService.createBusiness(db, input)
    return { business }
  },
})

export const updateBusinessOp = defineOperation({
  name: "admin.businesses.update",
  input: BusinessUpdateInputSchema,
  output: BusinessUpdateOutputSchema,
  permission: "admin",
  handler: async (db, _ctx, { id, ...data }) => {
    const business = await businessesService.updateBusiness(db, id, data)
    if (!business) throw ApiError.notFound("businesses.not_found", "Business not found")
    return { business }
  },
})

export const archiveBusinessOp = defineOperation({
  name: "admin.businesses.archive",
  input: BusinessArchiveInputSchema,
  output: BusinessUpdateOutputSchema,
  permission: "admin",
  handler: async (db, ctx, { id }) => {
    const business = await businessesService.archiveBusiness(db, ctx, id)
    if (!business) throw ApiError.notFound("businesses.not_found", "Business not found")
    return { business }
  },
})

export const restoreBusinessOp = defineOperation({
  name: "admin.businesses.restore",
  input: BusinessRestoreInputSchema,
  output: BusinessUpdateOutputSchema,
  permission: "admin",
  handler: async (db, ctx, { id }) => {
    const business = await businessesService.restoreBusiness(db, ctx, id)
    if (!business) throw ApiError.notFound("businesses.not_found", "Business not found")
    return { business }
  },
})

/** Admin list — returns ALL active businesses by default, or active +
 *  archived when ?includeArchived=1. Accepts optional ?renewing=N to filter
 *  to businesses whose latest subscription expires within N days. */
export const listAllBusinessesAdminOp = defineOperation({
  name: "admin.businesses.list",
  input: AdminBusinessListInputSchema,
  output: AdminBusinessListOutputSchema,
  permission: "admin",
  handler: async (db, _ctx, input) => {
    const allItems = await businessesService.getAllBusinesses(db, {
      includeArchived: input.includeArchived ?? false,
    })

    // Fetch latest subscription per business in one query using DISTINCT ON.
    const latestSubs = await db.execute<{
      business_id: string
      payment_status: "paid" | "pending" | "overdue"
      end_date: string
    }>(sql`
      SELECT DISTINCT ON (business_id) business_id, payment_status, end_date
      FROM business_subscription
      ORDER BY business_id, end_date DESC
    `)

    // Pre-compute days_remaining server-side so the admin businesses
    // caption avoids the RSC/client Date.now() hydration drift that
    // renewal-queue-table.tsx works around with suppressHydrationWarning
    // (2026-06-14 lesson). Mirrors business-subscriptions/queries.ts:130
    // and subscription-followups/queries.ts:151.
    const nowMs = Date.now()
    const DAY_MS = 86_400_000

    const subMap = new Map(
      latestSubs.rows.map((r) => [r.business_id, r]),
    )

    // Renewing filter: keep only businesses whose latest sub end_date falls
    // within the requested window AND payment_status IN ('paid','overdue').
    let filtered = allItems
    if (input.renewing) {
      const now = new Date()
      const cutoff = new Date(now.getTime() + input.renewing * 24 * 60 * 60 * 1000)
      filtered = allItems.filter((b) => {
        const sub = subMap.get(b.id)
        if (!sub) return false
        if (sub.payment_status !== "paid" && sub.payment_status !== "overdue") return false
        const end = new Date(sub.end_date)
        return end > now && end <= cutoff
      })
    }

    // Resolve owner records for the page in one batched query. Returns
    // an empty Map when no business on the page has an owner; getOwner
    // defaults to null below.
    const ownerLookup = await businessesService.getBusinessOwnerLookup(
      db,
      filtered.map((b) => b.id),
    )

    const items = filtered.map((b) => {
      const sub = subMap.get(b.id)
      return {
        ...b,
        latest_payment_status: sub?.payment_status ?? null,
        latest_subscription_end_date: sub?.end_date ?? null,
        latest_subscription_days_remaining: sub
          ? Math.ceil((new Date(sub.end_date).getTime() - nowMs) / DAY_MS)
          : null,
        owner: ownerLookup.get(b.id) ?? null,
      }
    })

    return {
      items,
      total: items.length,
      page: 1,
      pageSize: items.length || 1,
    }
  },
})

/** Admin detail — bypasses the soft-delete filter so the edit page
 *  loads archived rows (for Restore). Returns the joined owner record
 *  alongside the business so the detail page's Owner section can render
 *  in one fetch. Public consumers use getBusinessByIdOp from
 *  operations/businesses.ts (no owner field — opaque FK only). */
export const getBusinessByIdAdminOp = defineOperation({
  name: "admin.businesses.getById",
  input: BusinessDetailInputSchema,
  output: BusinessAdminDetailOutputSchema,
  permission: "admin",
  handler: async (db, _ctx, { id }) => {
    const [business, owner] = await Promise.all([
      businessesService.getBusinessByIdIncludingArchived(db, id),
      businessesService.getBusinessOwner(db, id),
    ])
    return { business, owner }
  },
})

// ─── G1: owner assignment ─────────────────────────────────────────────────

/** Compose the in-app notification body for the link event. Brand
 *  interpolation lives at the apps/web boundary (the service stays
 *  config-free). Kept as a local helper so the strings can't drift
 *  between the notification body and the email body. */
function ownerAssignmentCopy(businessName: string): {
  title: string
  message: string
  href: string
} {
  return {
    title: "You've been listed as a business owner",
    message: `An admin at ${brand.name} has listed you as the owner of ${businessName}.`,
    href: "/account/listings",
  }
}

export const assignBusinessOwnerOp = defineOperation({
  name: "admin.businesses.assignOwner",
  input: AssignBusinessOwnerInputSchema,
  output: z.object({ owner: BusinessOwnerSchema }),
  permission: "admin",
  handler: async (db, ctx, { id, owner_user_id }) => {
    // Pre-fetch the business name for the notification + email copy. The
    // service will re-check existence, but we need the name *before* we
    // call so the strings are correct.
    const biz = await businessesService.getBusinessByIdIncludingArchived(
      db,
      id,
    )
    if (!biz) {
      throw ApiError.notFound("businesses.not_found", "Business not found")
    }
    const copy = ownerAssignmentCopy(biz.name)

    const result = await businessesService.assignBusinessOwner(db, ctx, {
      id,
      ownerUserId: owner_user_id,
      notification: copy,
    })

    // Best-effort email — assignment is already committed, audit + bell
    // row are already written. A Postmark failure logs to error_log and
    // does NOT roll back the assignment. Matches the post_interest + new
    // message email patterns.
    try {
      await sendNotificationEmail({
        to: result.owner.email,
        title: copy.title,
        body: copy.message,
        ctaLabel: "View your listings",
        ctaUrl: buildAuthUrl("/account/listings"),
      })
    } catch (err) {
      logger.error("email send failed", {
        kind: "email.business_owner_assigned",
        recipient_user_id: result.owner.id,
        business_id: id,
        message: String(err),
      })
    }

    return { owner: result.owner }
  },
})

export const unassignBusinessOwnerOp = defineOperation({
  name: "admin.businesses.unassignOwner",
  input: UnassignBusinessOwnerInputSchema,
  output: z.object({ ok: z.literal(true) }),
  permission: "admin",
  handler: async (db, ctx, { id }) => {
    await businessesService.unassignBusinessOwner(db, ctx, { id })
    return { ok: true as const }
  },
})
