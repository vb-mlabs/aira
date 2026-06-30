// /api/v1/categories/[slug] — single category lookup. Returns
// { category: null } on miss rather than HTTP 404 so callers (mobile's
// useCategory hook) can distinguish "not found" from "request failed."

import { getCategoryBySlugOp } from "@/server/operations/categories"

export const runtime = "nodejs"

export const GET = getCategoryBySlugOp.runFromRequest
