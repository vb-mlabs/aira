// /api/v1/community/posts/[id] — single community post detail.
//
// Returns { post, is_author }. `post` is null for non-authors trying to
// read a pending/rejected row.

import { getCommunityPostOp } from "@/server/operations/community"

export const runtime = "nodejs"

export const GET = getCommunityPostOp.runFromRequest
