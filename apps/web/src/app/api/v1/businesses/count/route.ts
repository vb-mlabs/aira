// /api/v1/businesses/count — active-businesses count for the /home stat card.
//
// Auth: required (cookie on web, bearer on mobile). The op enforces this
// via permission: "user".

import { countActiveBusinessesOp } from "@/server/operations/businesses"

export const runtime = "nodejs"

export const GET = countActiveBusinessesOp.runFromRequest
