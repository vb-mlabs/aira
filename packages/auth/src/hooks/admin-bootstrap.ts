import "server-only"

// First-fork admin bootstrap: when INITIAL_ADMIN_EMAIL signs up, auto-promote
// to admin. Idempotent — if the env var is unset or the email doesn't match,
// this is a no-op. After the first admin exists, subsequent promotions happen
// through the admin UI.

import { eq } from "drizzle-orm"
import type { Database } from "@aira/db/client"
import { user as defaultUserTable } from "@aira/db/schema"
import { createAudit, type AuditFn } from "@aira/db/audit"

export interface AdminBootstrapLogger {
  info: (message: string, meta?: Record<string, unknown>) => void
}

export interface CreateAdminBootstrapHookOptions {
  db: Database
  /** Lower-cased on each call; pass the raw env value. Null/undefined = no-op. */
  initialAdminEmail?: string | undefined
  /** Optional logger; defaults to console.info. */
  logger?: AdminBootstrapLogger
  /** Override the user table (mainly for tests). */
  userTable?: typeof defaultUserTable
  /** Optional audit fn override (mainly for tests). Defaults to createAudit(db).
   *  Production callers don't need to set this. */
  audit?: AuditFn
}

interface CreatedUser {
  id: string
  email: string
}

export function createAdminBootstrapHook({
  db,
  initialAdminEmail,
  logger,
  userTable = defaultUserTable,
  audit,
}: CreateAdminBootstrapHookOptions) {
  const log =
    logger ??
    ({
      info: (m, meta) => console.info(m, meta),
    } satisfies AdminBootstrapLogger)
  // Audit fn used to record the promotion. audit-before-action: if the audit
  // write throws, the role UPDATE doesn't happen (clean — no promotion + no
  // false audit row). If the role UPDATE throws after the audit lands, the
  // audit row outlives the failed promotion — accepted risk, same trade-off
  // as the existing admin/service.changeRole flow. Better Auth runs the
  // user.create.after hook post-commit of the user INSERT, so neither
  // direction can roll back the new user account itself.
  const audit_ = audit ?? createAudit(db)

  return async function afterUserCreate(user: CreatedUser): Promise<void> {
    const target = initialAdminEmail?.toLowerCase()
    if (!target) return
    if (user.email.toLowerCase() !== target) return
    await audit_({
      actorId: null,
      action: "user.role_changed",
      target: { type: "user", id: user.id },
      meta: {
        kind: "user.role_changed",
        from: "end_user",
        to: "admin",
      },
    })
    await db
      .update(userTable)
      .set({ role: "admin" })
      .where(eq(userTable.id, user.id))
    log.info("Initial admin promoted via INITIAL_ADMIN_EMAIL", {
      userId: user.id,
      email: user.email,
    })
  }
}
