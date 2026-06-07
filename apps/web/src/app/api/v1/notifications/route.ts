// GET /api/v1/notifications — most recent inbox rows for the caller
// (latest INBOX_LIMIT, newest first; scoped by ctx.userId — see the
// notifications service's auth comment).
//
// Mobile's apps/mobile/features/notifications/api.ts has been targeting
// this URL for some time but the route file didn't exist — calls 404'd.
// This task lands the route alongside the wire shape both clients now
// share via @aira/validators/notifications.

import { listInboxOp } from "@/server/operations/notifications"

export const runtime = "nodejs"

export const GET = listInboxOp.runFromRequest
