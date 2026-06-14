// /api/v1/admin/community/posts/[id]/edit — F20 v2 admin edit.
//
// PATCH body: { title?: string, body?: string | null }. At least one must
// be present; the validator's .refine() returns 400 otherwise. Status is
// never changed by an edit — approve/reject remain the only state-change
// actions.

import { editCommunityPostOp } from "@/server/operations/community"

export const runtime = "nodejs"

export const PATCH = editCommunityPostOp.runFromRequest
