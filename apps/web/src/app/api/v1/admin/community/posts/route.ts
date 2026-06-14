// /api/v1/admin/community/posts — F20 admin moderation queue.
//
// GET supports ?status=<pending|approved|expired|rejected> + pagination.

import { adminListCommunityPostsOp } from "@/server/operations/community"

export const runtime = "nodejs"

export const GET = adminListCommunityPostsOp.runFromRequest
