// /api/v1/categories — count-per-category map driving the browse landing.
// withCounts query param is reserved for future "categories list without
// counts" mode; today's only consumer always wants counts.
// tree=1 returns the CategoryTree for the AppSidebar and admin tree manager.

import {
  listCategoriesWithCountsOp,
  listCategoriesTreeOp,
} from "@/server/operations/categories"
import type { NextRequest } from "next/server"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  const tree = req.nextUrl.searchParams.get("tree")
  if (tree === "1") return listCategoriesTreeOp.runFromRequest(req)
  return listCategoriesWithCountsOp.runFromRequest(req)
}
