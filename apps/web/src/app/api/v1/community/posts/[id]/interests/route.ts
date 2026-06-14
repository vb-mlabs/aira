// /api/v1/community/posts/[id]/interests — F20 "I can help" signal.
//
// GET    → list of respondents (post author only; 403 for others)
// POST   → add an "I can help" record with optional message
// DELETE → remove the caller's own "I can help" record

import {
  addInterestOp,
  listInterestsOp,
  removeInterestOp,
} from "@/server/operations/community"

export const runtime = "nodejs"

export const GET = listInterestsOp.runFromRequest
export const POST = addInterestOp.runFromRequest
export const DELETE = removeInterestOp.runFromRequest
