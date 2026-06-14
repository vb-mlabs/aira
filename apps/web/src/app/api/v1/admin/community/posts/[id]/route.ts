// /api/v1/admin/community/posts/[id] — moderate a single post.
//
// PATCH body: { action: "approve" | "reject", rejected_reason?: string }

import { adminModerateCommunityPostOp } from "@/server/operations/community"

export const runtime = "nodejs"

export const PATCH = adminModerateCommunityPostOp.runFromRequest
