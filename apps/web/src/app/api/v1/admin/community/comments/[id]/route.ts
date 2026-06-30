// /api/v1/admin/community/comments/[commentId] — admin moderation.
//
// PATCH → flip status between visible and hidden ({ action: "hide" |
//         "restore" }). Audit row written inside the same transaction.

import { adminModerateCommunityCommentOp } from "@/server/operations/community-comments"

export const runtime = "nodejs"

export const PATCH = adminModerateCommunityCommentOp.runFromRequest
