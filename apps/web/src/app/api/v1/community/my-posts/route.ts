// /api/v1/community/my-posts — author's own posts across all statuses.
//
// GET → list (pending + approved + expired + rejected, newest first).

import { listMyCommunityPostsOp } from "@/server/operations/community"

export const runtime = "nodejs"

export const GET = listMyCommunityPostsOp.runFromRequest
