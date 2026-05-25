import "server-only"

// First-fork admin bootstrap: when INITIAL_ADMIN_EMAIL signs up, auto-promote
// to admin. Idempotent — if the env var is unset or the email doesn't match,
// this is a no-op. After the first admin exists, subsequent promotions happen
// through the admin UI.

import { eq } from "drizzle-orm"
import type { Database } from "@mlabs/db/client"
import { user as defaultUserTable } from "@mlabs/db/schema"

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
}: CreateAdminBootstrapHookOptions) {
  const log =
    logger ??
    ({
      info: (m, meta) => console.info(m, meta),
    } satisfies AdminBootstrapLogger)

  return async function afterUserCreate(user: CreatedUser): Promise<void> {
    const target = initialAdminEmail?.toLowerCase()
    if (!target) return
    if (user.email.toLowerCase() !== target) return
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
