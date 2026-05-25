import "server-only"

// Users domain — account-level mutations (delete, etc.). Read paths for
// admin tooling live in @mlabs/services/admin (when that lands).
//
// Phase 4 covers deleteAccount only. PATCH /api/profile (name) + POST
// /api/profile/password are deferred to Phase 5 because they're tightly
// coupled to Better Auth's request-context API (auth.api.updateUser /
// changePassword take a Headers object derived from the live request),
// and untangling that boundary is easier once src/ → apps/web/src/ lands
// and the auth composition root can be reshaped.

import { eq } from "drizzle-orm"
import { user as userTable, session as sessionTable } from "@mlabs/db/schema"
import { createAudit } from "@mlabs/db/audit"
import type { Database } from "@mlabs/db/client"
import type { CallerContext } from "@mlabs/api/context"

export interface DeleteAccountResult {
  ok: true
  /**
   * The image URL the user had at the time of deletion (if any). The route
   * passes this to its storage cleanup step — services don't own storage
   * delete because the storage adapter lives at the app composition layer.
   */
  previousImage: string | null
}

/**
 * Anonymize-in-place delete. Preserves audit_log FK + historical
 * references (messages.sender_id is ON DELETE SET NULL) so existing rows
 * survive with sender = "Deleted user".
 *
 * Side effects (audit + db update + session revoke) flow through the same
 * (db, ctx) so a future composing service can wrap them in a transaction.
 */
export async function deleteAccount(
  db: Database,
  ctx: CallerContext,
  _args: Record<string, never> = {},
): Promise<DeleteAccountResult> {
  const audit = createAudit(db)

  // audit BEFORE the action: a failed audit blocks the change.
  await audit({
    actorId: ctx.userId,
    action: "user.deleted_anonymized",
    target: { type: "user", id: ctx.userId },
    meta: { kind: "user.deleted_anonymized" },
    client: ctx.source === "mobile" ? "mobile" : "web",
  })

  const [prev] = await db
    .select({ image: userTable.image })
    .from(userTable)
    .where(eq(userTable.id, ctx.userId))
    .limit(1)
  const previousImage = prev?.image ?? null

  await db
    .update(userTable)
    .set({
      name: "Deleted user",
      email: `deleted-${ctx.userId}@example.invalid`,
      emailVerified: false,
      image: null,
    })
    .where(eq(userTable.id, ctx.userId))

  await audit({
    actorId: ctx.userId,
    action: "session.revoked",
    target: { type: "user", id: ctx.userId },
    meta: { kind: "session.revoked", reason: "account_deleted" },
    client: ctx.source === "mobile" ? "mobile" : "web",
  })
  await db.delete(sessionTable).where(eq(sessionTable.userId, ctx.userId))

  return { ok: true, previousImage }
}
