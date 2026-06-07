// /api/v1/categories — count-per-category map driving the browse landing.
// withCounts query param is reserved for future "categories list without
// counts" mode; today's only consumer always wants counts.

import { listCategoriesWithCountsOp } from "@/server/operations/categories"

export const runtime = "nodejs"

export const GET = listCategoriesWithCountsOp.runFromRequest
