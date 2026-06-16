// /api/v1/admin/community/posts/[id]
//
// PATCH  → moderate (approve | reject)
// DELETE → hard-delete the post + cascade through post_interest; audit row
//          captures a full snapshot (title, body, status, author_id,
//          interest_count) so the deletion is reconstructable.

import {
  adminModerateCommunityPostOp,
  deleteCommunityPostOp,
} from "@/server/operations/community"

export const runtime = "nodejs"

export const PATCH = adminModerateCommunityPostOp.runFromRequest
export const DELETE = deleteCommunityPostOp.runFromRequest
