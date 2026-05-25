// GET /api/notifications/unread-count — feeds the bell.
// Auth-gated. Returns 401 for unauthenticated polling — the bell only renders
// inside the (app) shell anyway, so a 401 here means the session has expired
// in the background; the client treats it as "no badge, retry later."
//
// Phase 5.5 (A5) — conditional GET: callers send If-Modified-Since with the
// timestamp from the previous successful response. If
// `users.notifications_updated_at <= ifModifiedSince`, we return 304 and skip
// the count query entirely. The freshness column is bumped by an AFTER INSERT
// trigger on notifications (migration 0005), so the timestamp can never get
// ahead of the actual row.
//
// Documented exception: this route doesn't go through defineOperation. The
// HTTP-caching logic (304 + Last-Modified) sits outside the input/output
// schema model and short-circuits the count query — wrapping that through
// the operation adapter wouldn't avoid the duplication. The route still
// uses the @mlabs/services notifications domain for both queries, so the
// service contract is consistent with operation-wrapped routes.

import { NextResponse } from "next/server"
import { ApiError } from "@mlabs/api"
import { buildContext } from "@mlabs/api/server"
import { notifications } from "@mlabs/services"
import { db } from "@/lib/db"
import { getSessionFromHeaders } from "@/lib/auth/server"

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

  // Freshness check — single primary-key lookup, sub-ms.
  const { ts: updatedAt } = await notifications.getFreshness(db, ctx)

  const ifModifiedSinceHeader = req.headers.get("if-modified-since")
  if (updatedAt && ifModifiedSinceHeader) {
    const since = Date.parse(ifModifiedSinceHeader)
    // HTTP dates are second-precision; compare at the same resolution to avoid
    // sub-second flapping (a row written at T.123 looks newer than T.000).
    if (!Number.isNaN(since) && updatedAt.getTime() <= since) {
      return new NextResponse(null, {
        status: 304,
        headers: { "Last-Modified": updatedAt.toUTCString() },
      })
    }
  }

  const { count } = await notifications.getUnreadCount(db, ctx)
  return NextResponse.json(
    { count },
    {
      headers: updatedAt
        ? { "Last-Modified": updatedAt.toUTCString() }
        : undefined,
    },
  )
}
