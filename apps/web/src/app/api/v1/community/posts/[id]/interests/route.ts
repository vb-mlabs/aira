// /api/v1/community/posts/[id]/interests — F20 "I'm interested" signal.
//
// GET    → list of respondents (post author only; 403 for others)
// POST   → add an "I'm interested" record with optional message
// DELETE → remove the caller's own "I'm interested" record

import {
  addInterestOp,
  listInterestsOp,
  removeInterestOp,
} from "@/server/operations/community"

export const runtime = "nodejs"

export const GET = listInterestsOp.runFromRequest
export const POST = addInterestOp.runFromRequest
export const DELETE = removeInterestOp.runFromRequest
