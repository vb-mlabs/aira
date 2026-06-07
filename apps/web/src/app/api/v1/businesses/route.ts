// /api/v1/businesses — community directory list.
//
// Query params: ?featured=true | ?category=<slug> | ?limit=<n>
// Auth: required (cookie on web, bearer on mobile). The op encodes the
// filter precedence (featured wins over category; no filter falls back
// to featured).

import { listBusinessesOp } from "@/server/operations/businesses"

export const runtime = "nodejs"

export const GET = listBusinessesOp.runFromRequest
