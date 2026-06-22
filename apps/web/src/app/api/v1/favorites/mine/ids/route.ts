// /api/v1/favorites/mine/ids — slim id-only projection.
//
// GET → { ids: string[] }. Used by listing surfaces (home / directory /
// category) to decorate cards with their fav state without paying for the
// full Business hydration.

import { listMyFavoriteIdsOp } from "@/server/operations/favorites"

export const runtime = "nodejs"

export const GET = listMyFavoriteIdsOp.runFromRequest
