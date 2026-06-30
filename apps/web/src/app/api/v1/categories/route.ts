// /api/v1/categories — count-per-category map driving the browse landing.
// withCounts query param is reserved for future "categories list without
// counts" mode; today's only consumer always wants counts.
// tree=1 returns the CategoryTree for the AppSidebar and admin tree manager.
// roots=1 returns { categories, counts } — the flat root list paired with
//   per-slug counts. Drives the mobile Categories tab in one round-trip
//   so HTTP clients have parity with web's in-process apiServerFetch.

import {
  listCategoriesRootsOp,
  listCategoriesTreeOp,
  listCategoriesWithCountsOp,
} from "@/server/operations/categories"
import type { NextRequest } from "next/server"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  if (params.get("tree") === "1") return listCategoriesTreeOp.runFromRequest(req)
  if (params.get("roots") === "1") return listCategoriesRootsOp.runFromRequest(req)
  return listCategoriesWithCountsOp.runFromRequest(req)
}
