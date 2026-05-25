// Composition root for the web app's @mlabs/api operations.
//
// One createOperations() factory closes over the shared deps (db, session
// resolver, logger). All domain-specific operation files import the
// `defineOperation` it returns. Route handlers and Server Actions consume
// the operations from those domain files.
//
// Phase 5 moves this to apps/web/src/server/operations/.

import "server-only"
import { createOperations } from "@mlabs/api/server"
import type {
  GetSession,
  OperationSession,
} from "@mlabs/api/server"
import { db } from "@/lib/db"
import { getSessionFromHeaders } from "@/lib/auth/server"
import { logger } from "@/lib/logger"

const getSession: GetSession = async (headers) => {
  const session = await getSessionFromHeaders(headers)
  if (!session?.user) return null
  // Narrow to the operation-shaped session — id/email/role only. Better
  // Auth's union includes additional fields we don't need at the boundary;
  // the cast keeps the operation's contract tight without leaking the
  // raw shape.
  const u = session.user as { id: string; email: string; role?: string }
  const role: OperationSession["user"]["role"] =
    u.role === "admin" ? "admin" : "user"
  return { user: { id: u.id, email: u.email, role } }
}

export const { defineOperation } = createOperations({
  db,
  getSession,
  logger: {
    error: (m, meta) => logger.error(m, meta),
    warn: (m, meta) => logger.warn(m, meta),
    info: (m, meta) => logger.info(m, meta),
  },
})
