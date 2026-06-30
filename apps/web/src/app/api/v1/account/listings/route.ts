// GET /api/v1/account/listings
//
// Returns every business linked to the caller via owner_user_id —
// active and archived. Powers /account/listings. Caller-scoped; permission:
// "user" inside the op.

import { listMyBusinessesOp } from "@/server/operations/businesses"

export const runtime = "nodejs"

export const GET = listMyBusinessesOp.runFromRequest
