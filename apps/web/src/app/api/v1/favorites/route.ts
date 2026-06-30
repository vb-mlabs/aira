// /api/v1/favorites — personal favorites collection.
//
// POST → favorite a business by id. Body: { business_id }. Idempotent.

import { addFavoriteOp } from "@/server/operations/favorites"

export const runtime = "nodejs"

export const POST = addFavoriteOp.runFromRequest
