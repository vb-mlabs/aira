// /api/v1/community/posts — F20 Community Requests Board.
//
// GET  → paginated list of approved posts (search via ?q, page via ?page)
// POST → create a new post (status=pending; enforces 1-active-post limit)

import {
  createCommunityPostOp,
  listCommunityPostsOp,
} from "@/server/operations/community"

export const runtime = "nodejs"

export const GET = listCommunityPostsOp.runFromRequest
export const POST = createCommunityPostOp.runFromRequest
