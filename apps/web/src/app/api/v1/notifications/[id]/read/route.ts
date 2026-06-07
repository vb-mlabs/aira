// POST /api/v1/notifications/[id]/read
//
// Authz model — no enumeration: markRead(id) updates with the predicate
// (id = $1 AND user_id = $me). If 0 rows match (bogus id OR belongs to
// another user OR is already read), the service returns { changed: 0 }.
// An attacker probing IDs sees the same response for "doesn't exist" and
// "exists but not yours".

import { markReadOp } from "@/server/operations/notifications"

export const runtime = "nodejs"

export const POST = markReadOp.runFromRequest
