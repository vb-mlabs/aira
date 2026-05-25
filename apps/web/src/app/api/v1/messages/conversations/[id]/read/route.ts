// POST /api/messages/conversations/[id]/read — mark as read.
//
// Called by the thread page on mount (and after a new message arrives while
// the thread is in view). Cascades to notifications via the service.

import { markConversationReadOp } from "@/server/operations/messages"

export const runtime = "nodejs"

export const POST = markConversationReadOp.runFromRequest
