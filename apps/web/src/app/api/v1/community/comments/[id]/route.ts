// /api/v1/community/comments/[commentId] — delete a comment.
//
// DELETE → author or admin can hard-delete. Top-level deletes cascade
//          to replies via the FK.

import { deleteCommunityCommentOp } from "@/server/operations/community-comments"

export const runtime = "nodejs"

export const DELETE = deleteCommunityCommentOp.runFromRequest
