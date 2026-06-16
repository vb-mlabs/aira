// Composition root for the web app's @aira/api operations.
//
// One createOperations() factory closes over the shared deps (db, session
// resolver, logger). All domain-specific operation files import the
// `defineOperation` it returns. Route handlers and Server Actions consume
// the operations from those domain files.
//
// Phase 5 moves this to apps/web/src/server/operations/.

import "server-only"
import { ApiError } from "@aira/api"
import { createOperations } from "@aira/api/server"
import type {
  GetSession,
  OperationSession,
} from "@aira/api/server"
import { db } from "@/lib/db"
import {
  adminSessionIsStale,
  getSessionFromHeaders,
} from "@/lib/auth/server"
import { logger } from "@/lib/logger"

const getSession: GetSession = async (headers) => {
  const session = await getSessionFromHeaders(headers)
  if (!session?.user) return null
  // Narrow to the operation-shaped session — id/email/role only. Better
  // Auth's union includes additional fields we don't need at the boundary;
  // the cast keeps the operation's contract tight without leaking the
  // raw shape. DB role enum is end_user|admin|super_admin; the operation
  // layer's Permission union mirrors admin|super_admin (everything else
  // collapses to "user"). defineOperation's hasPermission() enforces the
  // hierarchy super_admin ≥ admin ≥ user so admin-permission ops still
  // accept super_admin callers.
  const u = session.user as { id: string; email: string; role?: string }
  const role: OperationSession["user"]["role"] =
    u.role === "super_admin"
      ? "super_admin"
      : u.role === "admin"
        ? "admin"
        : "user"
  return { user: { id: u.id, email: u.email, role } }
}

// Cookie-authed admin operations enforce the same 30-min idle-timeout that
// requireAdmin() applies at the layout level. JWT (mobile) and unauthenticated
// paths are filtered out by defineOperation before this is called — see
// OperationDeps.enforceAdminFreshness JSDoc in packages/api/src/operation.ts.
async function enforceAdminFreshness(headers: Headers): Promise<void> {
  const session = await getSessionFromHeaders(headers)
  if (!session) return // unauthenticated — defineOperation handles separately
  const sessionId = (session.session as { id?: string }).id
  if (await adminSessionIsStale(sessionId)) {
    // Distinct code from auth.unauthenticated so apiServerFetch can branch
    // and auto-redirect cookie-authed admin RSCs to /login?reason=idle.
    throw ApiError.idleTimeout()
  }
}

export const { defineOperation } = createOperations({
  db,
  getSession,
  enforceAdminFreshness,
  logger: {
    error: (m, meta) => logger.error(m, meta),
    warn: (m, meta) => logger.warn(m, meta),
    info: (m, meta) => logger.info(m, meta),
  },
})
