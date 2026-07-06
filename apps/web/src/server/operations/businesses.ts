import "server-only"

// Businesses operations.
//
// listBusinessesOp is the unified read endpoint behind GET /api/v1/businesses.
// It supports three modes, branched on the input:
//   1. Paginated category browse (when ?category is set with any of
//      ?q, ?page, ?pageSize, ?verified) → getBusinessesByCategoryPaged
//   2. Full category list (when only ?category is set) → getBusinessesByCategory
//   3. Featured (when ?featured=1, or no filter at all) — uniform-random
//      pick from the strict sponsored pool. `category` alongside `featured`
//      scopes to sponsorships in that category. `limit` is clamped at 5.
//
// Every branch returns { items, total, page, pageSize } so the strict
// output schema validates everywhere — non-paginated branches synthesize
// the metadata from items.length.

import { z } from "zod"
import { businesses as businessesService } from "@aira/services"
import {
  BusinessListInputSchema,
  BusinessListOutputSchema,
  BusinessDetailInputSchema,
  BusinessDetailOutputSchema,
  BusinessCountOutputSchema,
  BusinessSchema,
  type BusinessListOutput,
} from "@aira/validators/businesses"
import { defineOperation } from "./index"

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 12
// Product spec: home Featured tile + primary category Featured section
// both surface exactly 5 businesses. Clamp here so callers can't pass a
// higher `limit` and blow past the design.
const FEATURED_LIMIT = 5

/** Synthesize pagination metadata for the non-paginated branches so the
 *  strict output schema validates uniformly. */
function withFullPageMeta(items: BusinessListOutput["items"]): BusinessListOutput {
  return {
    items,
    total: items.length,
    page: 1,
    pageSize: items.length || 1,
  }
}

export const listBusinessesOp = defineOperation({
  name: "businesses.list",
  input: BusinessListInputSchema,
  output: BusinessListOutputSchema,
  permission: "user",
  handler: async (db, _ctx, input) => {
    // Paginated all-directory browse (no category). Triggered when pagination
    // params are present but no category is set — powers /directory.
    const wantsAllPaged =
      !input.category &&
      !input.featured &&
      (input.q !== undefined ||
        input.page !== undefined ||
        input.pageSize !== undefined ||
        input.verified !== undefined)

    if (wantsAllPaged) {
      const page = input.page ?? DEFAULT_PAGE
      const pageSize = input.pageSize ?? DEFAULT_PAGE_SIZE
      const { items, total } = await businessesService.getAllBusinessesPaged(db, {
        q: input.q,
        page,
        pageSize,
        verified: input.verified,
      })
      return { items, total, page, pageSize }
    }

    // Paginated category browse. Triggered as soon as any pagination /
    // search / filter input is present alongside a category — the
    // existing simple-category branch stays for callers that just want
    // the full list (admin pages still rely on it).
    const wantsPaginated =
      !!input.category &&
      (input.q !== undefined ||
        input.page !== undefined ||
        input.pageSize !== undefined ||
        input.verified !== undefined)

    if (wantsPaginated && input.category) {
      const page = input.page ?? DEFAULT_PAGE
      const pageSize = input.pageSize ?? DEFAULT_PAGE_SIZE
      const { items, total } =
        await businessesService.getBusinessesByCategoryPaged(db, {
          category: input.category,
          q: input.q,
          page,
          pageSize,
          verified: input.verified,
        })
      return { items, total, page, pageSize }
    }

    // Featured branch — uniform-random pick from businesses that hold an
    // active sponsorship in scope. Home tile is cross-category; primary
    // category page passes a category slug to scope to sponsorships in
    // that category. Product spec locks the visible set at 5, so limit is
    // clamped even if a caller passes higher.
    if (input.featured) {
      const cappedLimit = Math.min(input.limit ?? FEATURED_LIMIT, FEATURED_LIMIT)
      const items = input.category
        ? await businessesService.getFeaturedRandomForCategory(
            db,
            input.category,
            cappedLimit,
          )
        : await businessesService.getFeaturedRandom(db, cappedLimit)
      return withFullPageMeta(items)
    }
    if (input.category) {
      const items = await businessesService.getBusinessesByCategory(
        db,
        input.category,
      )
      const trimmed =
        typeof input.limit === "number" ? items.slice(0, input.limit) : items
      return withFullPageMeta(trimmed)
    }
    // No filter — return the same random featured pool as the home tile
    // rather than dumping the whole table. Keeps the "GET with no query"
    // call cheap and consistent with the featured contract.
    const cappedLimit = Math.min(input.limit ?? FEATURED_LIMIT, FEATURED_LIMIT)
    const items = await businessesService.getFeaturedRandom(db, cappedLimit)
    return withFullPageMeta(items)
  },
})

export const getBusinessByIdOp = defineOperation({
  name: "businesses.getById",
  input: BusinessDetailInputSchema,
  output: BusinessDetailOutputSchema,
  permission: "user",
  handler: async (db, _ctx, { id }) => {
    const business = await businessesService.getBusinessById(db, id)
    return { business }
  },
})

/** Active-businesses count. Powers the /home Businesses stat card via
 *  apiServerFetch — the RSC used to import @aira/services directly and
 *  call countActiveBusinesses(db), which bypassed the /api/v1/* boundary
 *  documented in CLAUDE.md. This op restores that boundary. */
export const countActiveBusinessesOp = defineOperation({
  name: "businesses.countActive",
  input: z.object({}).strict(),
  output: BusinessCountOutputSchema,
  permission: "user",
  handler: async (db) => {
    const count = await businessesService.countActiveBusinesses(db)
    return { count }
  },
})

/** G1 — caller's own owned businesses. Returns active AND archived rows so
 *  /account/listings can render an "Archived" badge alongside live ones.
 *  Scoped implicitly: businessesService.getBusinessesOwnedBy filters on
 *  owner_user_id = ctx.userId; no need for a separate authz check. */
export const listMyBusinessesOp = defineOperation({
  name: "businesses.listMine",
  input: z.object({}).strict(),
  output: z.object({ items: z.array(BusinessSchema) }),
  permission: "user",
  handler: async (db, ctx) => {
    const items = await businessesService.getBusinessesOwnedBy(db, ctx.userId)
    return { items }
  },
})
