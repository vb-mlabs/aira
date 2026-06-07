// /api/v1/businesses/[id] — single business detail. Returns { business: null }
// on 404 (rather than 404 itself) so callers can distinguish "not found"
// from "request failed."

import { getBusinessByIdOp } from "@/server/operations/businesses"

export const runtime = "nodejs"

export const GET = getBusinessByIdOp.runFromRequest
