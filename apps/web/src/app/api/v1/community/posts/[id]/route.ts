// /api/v1/community/posts/[id] — single community post detail +
// author-side edit/delete.
//
// GET    → returns { post, is_author }. post is null for non-authors
//          trying to read a pending/rejected row.
// PATCH  → author edits own post (title/body/phone/email). Edits on an
//          approved row revert status to pending — see editMyPost.
// DELETE → author deletes own post; cascades to interests + comments.

import {
  deleteMyCommunityPostOp,
  editMyCommunityPostOp,
  getCommunityPostOp,
} from "@/server/operations/community"

export const runtime = "nodejs"

export const GET = getCommunityPostOp.runFromRequest
export const PATCH = editMyCommunityPostOp.runFromRequest
export const DELETE = deleteMyCommunityPostOp.runFromRequest
