// /api/v1/admin/community/posts/[id]/interests — F20 v2 admin respondent
// visibility.
//
// GET returns the same shape as the public listInterests but skips the
// author-only guard. The op's permission: "admin" gate is the real ACL.
// Distinct path from /api/v1/community/posts/[id]/interests (which keeps
// its 403-for-non-author contract).

import { adminListInterestsOp } from "@/server/operations/community"

export const runtime = "nodejs"

export const GET = adminListInterestsOp.runFromRequest
