// /api/v1/community/posts/limits — the caller's active-post count vs.
// MAX_ACTIVE_POSTS_PER_USER. Consumed by the web board RSC and mobile
// board's TanStack Query to render the proactive cap-reached state
// on the composer CTA.

import { getMyCommunityPostLimitsOp } from "@/server/operations/community"

export const runtime = "nodejs"

export const GET = getMyCommunityPostLimitsOp.runFromRequest
