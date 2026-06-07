import "server-only"

// Businesses operations.
//
// Two ops back the community directory listing pages: listBusinessesOp
// (filterable by ?featured / ?category / ?limit) and getBusinessByIdOp.
// Both read through @aira/services/businesses — no auth-check in the
// service layer; defineOperation's permission: "user" gate covers it.

import { businesses as businessesService } from "@aira/services"
import {
  BusinessListInputSchema,
  BusinessListOutputSchema,
  BusinessDetailInputSchema,
  BusinessDetailOutputSchema,
} from "@aira/validators/businesses"
import { defineOperation } from "./index"

export const listBusinessesOp = defineOperation({
  name: "businesses.list",
  input: BusinessListInputSchema,
  output: BusinessListOutputSchema,
  permission: "user",
  handler: async (db, _ctx, input) => {
    // featured wins over category — passing both yields featured-only
    // (intentional: the home tile + the category page are distinct callers).
    if (input.featured) {
      const items = await businessesService.getFeaturedBusinesses(
        db,
        input.limit,
      )
      return { items }
    }
    if (input.category) {
      const items = await businessesService.getBusinessesByCategory(
        db,
        input.category,
      )
      return { items: typeof input.limit === "number" ? items.slice(0, input.limit) : items }
    }
    // No filter — return featured as a sensible default rather than dumping
    // the whole table. Keeps the "GET with no query" call cheap.
    const items = await businessesService.getFeaturedBusinesses(db, input.limit)
    return { items }
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
