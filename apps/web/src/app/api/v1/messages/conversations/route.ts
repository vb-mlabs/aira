// GET  /api/messages/conversations — inbox listing (10s poll).
// POST /api/messages/conversations { otherEmail } — open or create 1:1.
//
// GET stays route-direct so the If-Modified-Since 304 short-circuit can run
// before the heavy inbox-list aggregation (same pattern as
// /api/notifications/unread-count). POST is op-wrapped — the operation
// handles auth, Zod, permission, and ApiError translation.

import { NextResponse } from "next/server"
import { ApiError } from "@mlabs/api"
import { buildContext } from "@mlabs/api/server"
import { messages } from "@mlabs/services"
import { db } from "@/lib/db"
import { getSessionFromHeaders } from "@/lib/auth/server"
import { openOrCreate1to1Op } from "@/server/operations/messages"

export const runtime = "nodejs"

export async function GET(req: Request) {
  const session = await getSessionFromHeaders(req.headers)
  if (!session?.user) {
    return ApiError.unauthorized().toResponse()
  }
  const u = session.user as { id: string; email: string; role?: string }
  const role: "user" | "admin" = u.role === "admin" ? "admin" : "user"
  const ctx = buildContext({
    headers: req.headers,
    session: { user: { id: u.id, email: u.email, role } },
    requestId: req.headers.get("x-request-id") ?? crypto.randomUUID(),
  })

  const { ts: updatedAt } = await messages.getConversationsFreshness(db, ctx)

  const ifModifiedSinceHeader = req.headers.get("if-modified-since")
  if (updatedAt && ifModifiedSinceHeader) {
    const since = Date.parse(ifModifiedSinceHeader)
    if (!Number.isNaN(since) && updatedAt.getTime() <= since) {
      return new NextResponse(null, {
        status: 304,
        headers: { "Last-Modified": updatedAt.toUTCString() },
      })
    }
  }

  const { items } = await messages.listConversations(db, ctx)
  return NextResponse.json(
    { items },
    {
      headers: updatedAt
        ? { "Last-Modified": updatedAt.toUTCString() }
        : undefined,
    },
  )
}

export const POST = openOrCreate1to1Op.runFromRequest
