// /api/v1/community/posts/[id]/comments — comment thread for a post.
//
// GET  → list of top-level comments + their replies, oldest first.
// POST → create a new comment ({ body, parent_id? }). parent_id must
//        point at a top-level comment (1-level cap enforced server-side).

import {
  createCommunityCommentOp,
  listCommunityCommentsOp,
} from "@/server/operations/community-comments"

export const runtime = "nodejs"

export const GET = listCommunityCommentsOp.runFromRequest
export const POST = createCommunityCommentOp.runFromRequest
