// Server-side auth helpers for use in Server Components, Server Actions, and
// route handlers. Never import this from client code.

import "server-only"
import { eq } from "drizzle-orm"
import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { ApiError } from "@aira/api"
import type { CallerContext, CallerSource, Permission } from "@aira/api"
import { session as sessionTable } from "@aira/db/schema"
import { db } from "@/lib/db"
import { audit } from "@/lib/db/audit"
import { auth } from "./index"
import { extractBearerToken, verifyAccessToken } from "./jwt"

// Sprint 1 — admin sliding idle-timeout. requireAdmin() and
// requireSuperAdmin() enforce this window on every admin Server Component
// render. End-users skip the check (they inherit the 7d Better Auth
// expiresIn). The same helper is reused by defineOperation (T8) for
// cookie-authed admin API/Server-Action calls.
const ADMIN_IDLE_MS = 30 * 60 * 1000

// Re-exported session shape so callers don't need to know whether the session
// came from a cookie, a Better Auth bearer (session token), or a stateless JWT.
export type AuthSession = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>

/**
 * Returns the current session + user, or null if unauthenticated.
 *
 * Phase 5.5 — three accepted transports, tried in order:
 *   1. JWT access token (Authorization: Bearer <jwt>) — stateless verify, no DB hit.
 *   2. Bearer session token (Authorization: Bearer <session-token>) — handled
 *      by better-auth's bearer plugin (single DB query).
 *   3. Session cookie — web's existing path (single DB query).
 *
 * The bearer plugin already merges path 2 into auth.api.getSession(), so this
 * function only needs to handle path 1 explicitly and then fall through.
 */
export async function getSession() {
  const h = await headers()
  return getSessionFromHeaders(h)
}

/**
 * Same three-transport resolution as getSession() but takes an explicit
 * Headers object instead of reading from next/headers. Used by the
 * @aira/api operation adapter which passes Request.headers in directly.
 */
export async function getSessionFromHeaders(
  h: Headers,
): Promise<AuthSession | null> {
  // Path 1: JWT bearer (mobile's primary credential).
  const bearer = extractBearerToken(h.get("authorization"))
  if (bearer) {
    const payload = await verifyAccessToken(bearer)
    if (payload) {
      // Synthesize a minimal session shape. Callers that need full session data
      // (e.g., session.expiresAt, last-seen IP) should hit the refresh endpoint
      // path which uses the underlying Better Auth session.
      return {
        user: {
          id: payload.sub,
          email: payload.email,
          role: payload.role,
        },
        session: {
          // JWT carries no session-row identifier; callers shouldn't rely on
          // these fields when authed via JWT.
          token: bearer,
          userId: payload.sub,
          expiresAt: payload.exp ? new Date(payload.exp * 1000) : new Date(),
        },
      } as unknown as AuthSession
      // If verification failed (expired/invalid), fall through to better-auth
      // which will return null for an unknown bearer token. Mobile sees 401,
      // hits /api/auth/refresh with the long-lived session token, gets a new JWT.
    }
  }

  // Paths 2 + 3: Better Auth bearer-plugin or cookie.
  return auth.api.getSession({ headers: h })
}

/**
 * Server-component helper: enforces auth, returns the user, or redirects
 * to /login. Use in Server Components or Server Actions inside (app)/* routes.
 */
export async function requireUser() {
  const session = await getSession()
  if (!session?.user) {
    redirect("/login")
  }
  return session.user
}

/**
 * Build a fully-formed CallerContext for server-component / Server-Action
 * callers that talk to @aira/services directly (i.e. outside the operation
 * adapter, which builds its own ctx from the inbound Request).
 *
 * Wraps requireUser() — redirects to /login if unauthed. The requestId is
 * freshly minted here because pages and Server Actions have no inbound
 * X-Request-Id header to forward.
 */
export async function getCallerContext(
  source: CallerSource = "web",
): Promise<CallerContext> {
  const u = await requireUser()
  // DB role is user_role enum ("end_user" | "admin" | "super_admin"). Map
  // through to the Permission union — admin and super_admin pass through
  // unchanged so downstream ops can distinguish the two; everything else
  // collapses to "user". The operation layer's hasPermission() enforces
  // the hierarchy so an admin-permission op still accepts a super_admin
  // caller.
  const dbRole = (u as { role?: string }).role
  const role: Permission =
    dbRole === "super_admin"
      ? "super_admin"
      : dbRole === "admin"
        ? "admin"
        : "user"
  return {
    userId: u.id,
    user: { id: u.id, email: u.email, role },
    requestId: crypto.randomUUID(),
    source,
  }
}

/**
 * Phase 5.5: REST-friendly variant of requireUser.
 *
 * Returns either the user OR a 401 NextResponse — never throws redirect().
 * Use this in /api/* route handlers that mobile reaches (mobile can't follow
 * 307 redirects to /login; it expects 401 JSON in the locked ApiErrorResponse
 * shape).
 *
 * Usage:
 *   const auth = await requireUserJSON()
 *   if (auth instanceof Response) return auth   // 401
 *   const user = auth                            // narrowed
 */
export async function requireUserJSON(): Promise<
  AuthSession["user"] | Response
> {
  const session = await getSession()
  if (!session?.user) {
    return ApiError.unauthorized().toResponse()
  }
  return session.user
}

/**
 * REST-friendly admin auth check for route handlers that can't use
 * defineOperation (multipart uploads, CSV, binary responses).
 *
 * Mirrors requireAdmin() — same role check + idle-timeout — but returns
 * a Response on failure instead of throwing redirect/notFound. Use in
 * /api/* handlers that must serve non-JSON or non-standard responses.
 *
 * Usage:
 *   const auth = await requireAdminJSON(req)
 *   if (auth instanceof Response) return auth
 *   // auth is AuthSession["user"]
 */
export async function requireAdminJSON(
  req: Request,
): Promise<AuthSession["user"] | Response> {
  const session = await getSessionFromHeaders(req.headers)
  if (!session?.user) return ApiError.unauthorized().toResponse()
  const role = (session.user as { role?: string }).role ?? "end_user"
  if (role !== "admin" && role !== "super_admin") {
    return ApiError.forbidden("Admin access required").toResponse()
  }
  const sessionId = (session.session as { id?: string }).id
  if (await adminSessionIsStale(sessionId)) return ApiError.idleTimeout().toResponse()
  return session.user
}

/**
 * Server-component helper: enforces auth + admin role.
 *
 * Non-admin authenticated users get notFound() — same response as any
 * nonexistent route, no enumeration of /admin/* existence (locked
 * decision in /plan-eng-review for W8).
 *
 * Reads `role` directly from the session-cached user object, populated by
 * Better Auth's additionalFields wiring in auth/index.ts. No extra DB
 * query per admin request.
 */
/**
 * Returns true if the admin session is stale (idle > 30 min). Fresh sessions
 * are bumped (`last_activity_at = now()`) as a side effect — that's how the
 * sliding window slides. Pass `undefined` for JWT-synthesized sessions or
 * any path where there's no session row id to look up; the function returns
 * false in those cases (their freshness is governed by JWT expiry instead).
 *
 * Reads `last_activity_at` directly from the session table rather than off
 * the Better Auth session shape, because Better Auth's session config
 * `additionalFields` doesn't surface custom columns on the returned session
 * object (verified by QA on 2026-05-26 — see
 * .mstack/qa/2026-05-26-1020/report.md issue 1). One SELECT + (if fresh)
 * one UPDATE per admin request — cheap.
 *
 * Exported so packages/api's defineOperation (T8) can reuse the same check
 * for cookie-authed admin operations. Don't call from end-user paths —
 * end-users get the 7d Better Auth default with no extra check.
 */
export async function adminSessionIsStale(
  sessionId: string | undefined,
): Promise<boolean> {
  if (!sessionId) return false
  const [row] = await db
    .select({ lastActivityAt: sessionTable.lastActivityAt })
    .from(sessionTable)
    .where(eq(sessionTable.id, sessionId))
    .limit(1)
  if (!row) return false // session row gone (e.g. logged out concurrently)
  const idleMs = Date.now() - row.lastActivityAt.getTime()
  if (idleMs > ADMIN_IDLE_MS) return true
  await db
    .update(sessionTable)
    .set({ lastActivityAt: new Date() })
    .where(eq(sessionTable.id, sessionId))
  return false
}

/**
 * Sign out the current session, write an idle_timeout audit row, and
 * redirect to /login?reason=idle. Throws (via Next.js redirect). Only
 * called when adminSessionIsStale() returned true.
 *
 * Audit order: revoke → audit → redirect (per the review's accepted-risk
 * decision — fail closed on user state takes precedence over audit
 * fidelity).
 */
async function bounceStaleAdmin(authSession: AuthSession): Promise<never> {
  const userId = authSession.user.id
  const sessionId = (authSession.session as { id?: string }).id
  await auth.api.signOut({ headers: await headers() })
  await audit({
    actorId: userId,
    action: "session.revoked",
    target: sessionId ? { type: "session", id: sessionId } : undefined,
    meta: { kind: "session.revoked", reason: "idle_timeout" },
  })
  redirect("/login?reason=idle")
}

export async function requireAdmin() {
  // Inlined requireUser() because we need the full session below (not just
  // the user) to check last_activity_at.
  const authSession = await getSession()
  if (!authSession?.user) redirect("/login")
  // DB role is the user_role enum: end_user | admin | super_admin.
  // super_admin subsumes admin perms — accept both. Non-admin = 404 (locked
  // W8 decision: don't enumerate /admin/* via 403 vs 404 differentiation).
  const role = (authSession.user as { role?: string }).role ?? "end_user"
  if (role !== "admin" && role !== "super_admin") {
    notFound()
  }
  const sessionId = (authSession.session as { id?: string }).id
  if (await adminSessionIsStale(sessionId)) {
    await bounceStaleAdmin(authSession)
  }
  return authSession.user
}

/**
 * Server-component helper: enforces auth + super_admin role only.
 *
 * Same 404 semantics as requireAdmin() — admins and end-users both get
 * notFound(), to avoid leaking the existence of super-admin-only surfaces.
 * Use for screens that promote/demote admins or manage other super_admins.
 * Inherits the same 30-min idle-timeout as requireAdmin().
 */
export async function requireSuperAdmin() {
  const authSession = await getSession()
  if (!authSession?.user) redirect("/login")
  const role = (authSession.user as { role?: string }).role ?? "end_user"
  if (role !== "super_admin") {
    notFound()
  }
  const sessionId = (authSession.session as { id?: string }).id
  if (await adminSessionIsStale(sessionId)) {
    await bounceStaleAdmin(authSession)
  }
  return authSession.user
}
