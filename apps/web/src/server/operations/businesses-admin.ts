import "server-only"

// Admin-permission operations for the businesses domain.
//
// Sibling to operations/businesses.ts (which holds the public ops). The
// split mirrors the services convention: same domain, two surfaces, one
// per permission level. Admin ops here go through the idle-timeout
// freshness gate via defineOperation's "admin" permission.

import { businesses as businessesService } from "@aira/services"
import {
  BusinessUpdateInputSchema,
  BusinessUpdateOutputSchema,
  BusinessArchiveInputSchema,
  BusinessRestoreInputSchema,
  BusinessListInputSchema,
  BusinessListOutputSchema,
  BusinessDetailInputSchema,
  BusinessDetailOutputSchema,
} from "@aira/validators/businesses"
import { ApiError } from "@aira/api"
import { defineOperation } from "./index"

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
 *  archived when ?includeArchived=1. No pagination. Output shape reuses
 *  BusinessListOutputSchema with synthesized total/page/pageSize so the
 *  admin list page can read items.length and friends uniformly. */
export const listAllBusinessesAdminOp = defineOperation({
  name: "admin.businesses.list",
  input: BusinessListInputSchema,
  output: BusinessListOutputSchema,
  permission: "admin",
  handler: async (db, _ctx, input) => {
    const items = await businessesService.getAllBusinesses(db, {
      includeArchived: input.includeArchived ?? false,
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
 *  loads archived rows (for Restore). Public consumers use
 *  getBusinessByIdOp from operations/businesses.ts. */
export const getBusinessByIdAdminOp = defineOperation({
  name: "admin.businesses.getById",
  input: BusinessDetailInputSchema,
  output: BusinessDetailOutputSchema,
  permission: "admin",
  handler: async (db, _ctx, { id }) => {
    const business = await businessesService.getBusinessByIdIncludingArchived(
      db,
      id,
    )
    return { business }
  },
})
