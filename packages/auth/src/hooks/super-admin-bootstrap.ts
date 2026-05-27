import "server-only"

// First-fork super-admin bootstrap: when INITIAL_SUPER_ADMIN_EMAIL signs up,
// auto-promote to super_admin. Idempotent — if the env var is unset or the
// email doesn't match, this is a no-op. After the first super_admin exists,
// subsequent promotions happen through the admin UI (super-admin-only flow
// added in a later sprint).
//
// Mirrors admin-bootstrap.ts. Kept as a separate hook so each is
// single-purpose and unit-testable in isolation. Composition happens in
// createAuth() — both hooks run on the same user.create.after callback;
// env validation in apps/web/src/config/env.ts asserts the two emails
// differ when both are set.

import { eq } from "drizzle-orm"
import type { Database } from "@aira/db/client"
import { user as defaultUserTable } from "@aira/db/schema"
import { createAudit, type AuditFn } from "@aira/db/audit"

export interface SuperAdminBootstrapLogger {
  info: (message: string, meta?: Record<string, unknown>) => void
}

export interface CreateSuperAdminBootstrapHookOptions {
  db: Database
  /** Lower-cased on each call; pass the raw env value. Null/undefined = no-op. */
  initialSuperAdminEmail?: string | undefined
  /** Optional logger; defaults to console.info. */
  logger?: SuperAdminBootstrapLogger
  /** Override the user table (mainly for tests). */
  userTable?: typeof defaultUserTable
  /** Optional audit fn override (mainly for tests). Defaults to createAudit(db). */
  audit?: AuditFn
}

interface CreatedUser {
  id: string
  email: string
}

export function createSuperAdminBootstrapHook({
  db,
  initialSuperAdminEmail,
  logger,
  userTable = defaultUserTable,
  audit,
}: CreateSuperAdminBootstrapHookOptions) {
  const log =
    logger ??
    ({
      info: (m, meta) => console.info(m, meta),
    } satisfies SuperAdminBootstrapLogger)
  // audit-before-action: see admin-bootstrap.ts for the trade-off rationale.
  const audit_ = audit ?? createAudit(db)

  return async function afterUserCreate(user: CreatedUser): Promise<void> {
    const target = initialSuperAdminEmail?.toLowerCase()
    if (!target) return
    if (user.email.toLowerCase() !== target) return
    await audit_({
      actorId: null,
      action: "user.role_changed",
      target: { type: "user", id: user.id },
      meta: {
        kind: "user.role_changed",
        from: "end_user",
        to: "super_admin",
      },
    })
    await db
      .update(userTable)
      .set({ role: "super_admin" })
      .where(eq(userTable.id, user.id))
    log.info("Initial super-admin promoted via INITIAL_SUPER_ADMIN_EMAIL", {
      userId: user.id,
      email: user.email,
    })
  }
}
