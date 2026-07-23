// /api/v1/community/posts — F20 Community Requests Board.
//
// GET  → paginated list of approved posts (search via ?q, page via ?page)
// POST → create a new post (status=pending; enforces the active-post cap
//        at MAX_ACTIVE_POSTS_PER_USER — see @aira/validators/community)

import {
  createCommunityPostOp,
  listCommunityPostsOp,
} from "@/server/operations/community"

export const runtime = "nodejs"

export const GET = listCommunityPostsOp.runFromRequest
export const POST = createCommunityPostOp.runFromRequest
