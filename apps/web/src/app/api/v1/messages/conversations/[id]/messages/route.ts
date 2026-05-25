// GET  /api/messages/conversations/[id]/messages?after=<cursor> — thread poll.
// POST /api/messages/conversations/[id]/messages { body }            — send.
//
// GET stays route-direct: the cursor-paginated thread listing wants raw
// query-string handling and the participant check throws ApiError so the
// route only has to convert errors to responses. POST is op-wrapped — the
// operation handles validation + permission so the route stays trivial.

import { NextResponse } from "next/server"
import { ApiError, isApiError } from "@mlabs/api"
import { buildContext } from "@mlabs/api/server"
import { messages } from "@mlabs/services"
import { db } from "@/lib/db"
import { getSessionFromHeaders } from "@/lib/auth/server"
import { sendMessageOp } from "@/server/operations/messages"

export const runtime = "nodejs"

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(req: Request, routeCtx: RouteContext) {
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

  const { id: conversationId } = await routeCtx.params
  const url = new URL(req.url)
  const cursor = url.searchParams.get("after")

  try {
    const { items } = await messages.listMessages(db, ctx, {
      conversationId,
      cursor,
    })
    return NextResponse.json({ items })
  } catch (err) {
    if (isApiError(err)) return err.toResponse()
    throw err
  }
}

export const POST = sendMessageOp.runFromRequest
