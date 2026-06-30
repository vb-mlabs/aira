// /api/v1/favorites/[business_id] — remove a single favorite.
//
// DELETE → unfavorite. Idempotent: removing a non-favorited business
// also returns success. The defineOperation adapter merges the
// [business_id] path param into the op's input by key, matching the
// snake-case convention used elsewhere for column-aligned identifiers
// (see [job_name] under /admin/cron).

import { removeFavoriteOp } from "@/server/operations/favorites"

export const runtime = "nodejs"

export const DELETE = removeFavoriteOp.runFromRequest
