// Catch-all route handler for Better Auth. Handles /api/auth/sign-up,
// /api/auth/sign-in, /api/auth/sign-out, /api/auth/forget-password,
// /api/auth/reset-password, /api/auth/verify-email, etc.
//
// All routing logic lives in better-auth itself; we just bridge the Next.js
// Request/Response shape and (Sprint 1) intercept /api/auth/sign-out to
// write a session.revoked audit row before delegating. Wrapping the route
// (vs using Better Auth's session.delete.before hook) lets us tag the
// audit with reason: "logout" specifically — the database hook would also
// fire for cascade deletions (password change, admin revoke, idle timeout)
// which already have their own explicit audit rows.

import { auth } from "@/lib/auth"
import { audit } from "@/lib/db/audit"
import { getSessionFromHeaders } from "@/lib/auth/server"
import { clientFromHeaders } from "@aira/db/audit"
import { toNextJsHandler } from "better-auth/next-js"

const handlers = toNextJsHandler(auth.handler)

async function writeLogoutAudit(req: Request): Promise<void> {
  const session = await getSessionFromHeaders(req.headers)
  if (!session?.user) return // already signed out — nothing to record
  const sessionId = (session.session as { id?: string }).id
  await audit({
    actorId: session.user.id,
    action: "session.revoked",
    target: sessionId ? { type: "session", id: sessionId } : undefined,
    meta: { kind: "session.revoked", reason: "logout" },
    client: clientFromHeaders(req.headers),
  })
}

export const GET = handlers.GET

export async function POST(request: Request): Promise<Response> {
  // Match either /api/auth/sign-out or /api/auth/sign-out/...; pathname
  // includes leading /api/auth so endsWith on /sign-out covers both web and
  // mobile sign-outs (both POST here). Audit BEFORE delegating: if the
  // audit write fails, Better Auth doesn't get a chance to invalidate —
  // the failed-audit rule is "no false negatives" (we'd rather sign-out
  // appear to fail than write that it happened when it didn't).
  const path = new URL(request.url).pathname
  if (path.endsWith("/sign-out")) {
    await writeLogoutAudit(request)
  }
  return handlers.POST(request)
}
