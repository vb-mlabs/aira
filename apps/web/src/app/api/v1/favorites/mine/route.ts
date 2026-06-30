// /api/v1/favorites/mine — full hydrated list of the caller's favorited
// businesses, ordered most-recent-first.
//
// GET → { items: BusinessSchema[] }. Used by /account/favorites.

import { listMyFavoritesOp } from "@/server/operations/favorites"

export const runtime = "nodejs"

export const GET = listMyFavoritesOp.runFromRequest
