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
import { logger } from "@/lib/logger"
import { toNextJsHandler } from "better-auth/next-js"

const handlers = toNextJsHandler(auth.handler)

// ── Sign-out debugging (temp; remove after the iOS cookie-residue
// hypothesis is confirmed or ruled out). Records what auth transports
// each auth-path request carries — bearer vs cookie vs both vs neither
// — so we can see whether iOS is still forwarding a session cookie to
// /api/auth/get-session after mobile sign-out wipes the SecureStore
// bearer tokens and Updates.reloadAsync restarts the runtime.
function summariseAuthTransport(req: Request) {
  const auth = req.headers.get("authorization")
  const cookie = req.headers.get("cookie")
  const sessionCookiePresent = cookie
    ? /(?:^|;\s*)(?:__Secure-|__Host-)?better-auth\.session_token=/.test(cookie)
    : false
  return {
    bearer: auth ? auth.slice(0, 15) + "…" : null,
    cookieAny: !!cookie,
    cookieSession: sessionCookiePresent,
    xClient: req.headers.get("x-client"),
    ua: (req.headers.get("user-agent") ?? "").slice(0, 60),
  }
}

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

export async function GET(request: Request): Promise<Response> {
  const path = new URL(request.url).pathname
  if (path.endsWith("/get-session")) {
    logger.info("auth-debug get-session", {
      path,
      transport: summariseAuthTransport(request),
    })
  }
  // Verify-email debug: log token shape on request + status/body on
  // response. Both real users on iOS + Android hit "Link expired"
  // within minutes of signup; token TTL is 2h and the mobile client
  // uses GET (OTA #6 fix), so this shouldn't be firing. Trace the
  // actual failure code so we can stop guessing.
  const isVerify = path.endsWith("/verify-email")
  let verifyReqSnapshot:
    | { tokenTail: string | null; tokenLen: number; queryKeys: string[] }
    | null = null
  if (isVerify) {
    const url = new URL(request.url)
    const token = url.searchParams.get("token")
    verifyReqSnapshot = {
      tokenTail: token ? `…${token.slice(-16)}` : null,
      tokenLen: token?.length ?? 0,
      queryKeys: Array.from(url.searchParams.keys()),
    }
    logger.info("auth-debug verify-email request", {
      transport: summariseAuthTransport(request),
      ...verifyReqSnapshot,
    })
  }
  const res = await handlers.GET(request)
  if (isVerify) {
    // Peek at the JSON body (Better Auth returns { status, user } on ok
    // and { code, message } on error). Clone so the caller still gets
    // the un-consumed stream.
    let bodyPeek: unknown = null
    try {
      bodyPeek = await res.clone().json()
    } catch {
      /* non-JSON response, e.g. redirect — skip */
    }
    logger.info("auth-debug verify-email response", {
      status: res.status,
      body: bodyPeek,
      ...verifyReqSnapshot,
    })
  }
  return res
}

export async function POST(request: Request): Promise<Response> {
  // Match either /api/auth/sign-out or /api/auth/sign-out/...; pathname
  // includes leading /api/auth so endsWith on /sign-out covers both web and
  // mobile sign-outs (both POST here). Audit BEFORE delegating: if the
  // audit write fails, Better Auth doesn't get a chance to invalidate —
  // the failed-audit rule is "no false negatives" (we'd rather sign-out
  // appear to fail than write that it happened when it didn't).
  const path = new URL(request.url).pathname
  if (path.endsWith("/sign-out")) {
    logger.info("auth-debug sign-out request", {
      transport: summariseAuthTransport(request),
    })
    await writeLogoutAudit(request)
  }
  // Trace stale-bundle POSTs to /verify-email — pre-OTA-6 mobile clients
  // sent POST for verify. Better Auth's endpoint is GET-only so this
  // returns 405/404, leaving no other trace. Distinguishing "user on
  // old bundle" from "real token error" is the point of the log.
  if (path.endsWith("/verify-email")) {
    logger.warn("auth-debug verify-email POST (client on stale bundle?)", {
      transport: summariseAuthTransport(request),
    })
  }
  const res = await handlers.POST(request)
  if (path.endsWith("/sign-out")) {
    logger.info("auth-debug sign-out response", {
      status: res.status,
      setCookie: res.headers.get("set-cookie")?.slice(0, 120) ?? null,
    })
  }
  return res
}
