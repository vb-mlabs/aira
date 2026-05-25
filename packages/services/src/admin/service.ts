import "server-only"

// Admin domain — privileged mutations against the user table.
//
// Authorization invariant: every entry point trusts ctx.user.role to already
// be "admin". The operation adapter at apps/web/src/server/operations/admin.ts
// enforces this via `permission: "admin"` BEFORE the service runs. Calling a
// service function with a non-admin ctx is a bug — these functions don't
// guard against it.
//
// Self-protection rules (encoded as ApiError throws, not return shapes):
//   changeRole — can't change your own role; can't demote the last admin
//   banUser    — can't ban yourself; idempotent on already-banned user
//   unbanUser  — idempotent on non-banned user
//
// audit() lives in this module (audit BEFORE the mutation,
// keeps the log authoritative on partial failures). Cross-domain notification
// fan-out goes through the public surface at @mlabs/services/notifications.

import { eq, sql } from "drizzle-orm"
import { user as userTable, session as sessionTable } from "@mlabs/db/schema"
import { createAudit } from "@mlabs/db/audit"
import type { Database } from "@mlabs/db/client"
import { ApiError } from "@mlabs/api"
import type { CallerContext } from "@mlabs/api/context"
import { createNotification } from "../notifications"

export type AdminResult = {
  ok: true
  /** Human-readable confirmation surfaced inline in the admin UI. */
  message: string
}

export interface PasswordResetTarget {
  /** Email of the user the admin asked to reset. The op handler uses this
   *  to call Better Auth's request-context API; we can't make that call
   *  from inside the service because it needs the live request Headers. */
  email: string
}

function auditClient(ctx: CallerContext): "web" | "mobile" {
  return ctx.source === "mobile" ? "mobile" : "web"
}

export async function changeRole(
  db: Database,
  ctx: CallerContext,
  args: { targetId: string; role: "user" | "admin" },
): Promise<AdminResult> {
  const { targetId, role } = args

  if (targetId === ctx.userId) {
    throw ApiError.badRequest(
      "admin.self_role_change",
      "You cannot change your own role.",
    )
  }

  const [target] = await db
    .select({ id: userTable.id, role: userTable.role })
    .from(userTable)
    .where(eq(userTable.id, targetId))
    .limit(1)
  if (!target) throw ApiError.notFound("admin.user_not_found", "User not found.")

  const currentRole = target.role === "admin" ? "admin" : "user"
  if (currentRole === role) {
    return { ok: true, message: "No change." }
  }

  if (currentRole === "admin" && role === "user") {
    // Demote — refuse if this is the last admin. Race window with a
    // concurrent demote is theoretical (admins coordinate); flagged as
    // v1.1 hardening (FOR UPDATE) in /plan-eng-review.
    const [row] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(userTable)
      .where(eq(userTable.role, "admin"))
    const count = row?.n ?? 0
    if (count <= 1) {
      throw ApiError.badRequest(
        "admin.last_admin",
        "Cannot demote the last admin.",
      )
    }
  }

  const audit = createAudit(db)
  await audit({
    actorId: ctx.userId,
    action: "user.role_changed",
    target: { type: "user", id: targetId },
    meta: { kind: "user.role_changed", from: currentRole, to: role },
    client: auditClient(ctx),
  })

  await db.update(userTable).set({ role }).where(eq(userTable.id, targetId))

  return { ok: true, message: `Role updated to ${role}.` }
}

export async function banUser(
  db: Database,
  ctx: CallerContext,
  args: { targetId: string; reason?: string },
): Promise<AdminResult> {
  const { targetId, reason } = args

  if (targetId === ctx.userId) {
    throw ApiError.badRequest("admin.self_ban", "You cannot ban yourself.")
  }

  const [target] = await db
    .select({ id: userTable.id, banned_at: userTable.banned_at })
    .from(userTable)
    .where(eq(userTable.id, targetId))
    .limit(1)
  if (!target) throw ApiError.notFound("admin.user_not_found", "User not found.")
  if (target.banned_at) {
    // Idempotent — already banned. No-op but report success so a double-
    // click doesn't flash an error in the UI.
    return { ok: true, message: "User is already banned." }
  }

  const audit = createAudit(db)
  await audit({
    actorId: ctx.userId,
    action: "user.banned",
    target: { type: "user", id: targetId },
    meta: { kind: "user.banned", reason },
    client: auditClient(ctx),
  })

  // Atomic transaction — either everything lands or nothing does. Used to
  // be db.batch() but the neon-serverless WS Pool driver doesn't expose it;
  // db.transaction() is the cross-driver equivalent with stronger semantics
  // (real BEGIN/COMMIT vs neon-http's pseudo-atomic batched HTTP request).
  await db.transaction(async (tx) => {
    await tx
      .update(userTable)
      .set({ banned_at: sql`now()`, banned_reason: reason ?? null })
      .where(eq(userTable.id, targetId))
    await tx.delete(sessionTable).where(eq(sessionTable.userId, targetId))
  })

  // Trailing audit for the session revocations, scoped under the same actor
  // so the timeline reads cleanly on user-detail.
  await audit({
    actorId: ctx.userId,
    action: "session.revoked",
    target: { type: "user", id: targetId },
    meta: { kind: "session.revoked", reason: "admin" },
    client: auditClient(ctx),
  })

  return { ok: true, message: "User banned. All sessions revoked." }
}

export async function unbanUser(
  db: Database,
  ctx: CallerContext,
  args: { targetId: string },
): Promise<AdminResult> {
  const { targetId } = args

  const [target] = await db
    .select({ banned_at: userTable.banned_at })
    .from(userTable)
    .where(eq(userTable.id, targetId))
    .limit(1)
  if (!target) throw ApiError.notFound("admin.user_not_found", "User not found.")
  if (!target.banned_at) {
    return { ok: true, message: "User is not banned." }
  }

  const audit = createAudit(db)
  await audit({
    actorId: ctx.userId,
    action: "user.unbanned",
    target: { type: "user", id: targetId },
    meta: { kind: "user.unbanned" },
    client: auditClient(ctx),
  })

  await db
    .update(userTable)
    .set({ banned_at: null, banned_reason: null })
    .where(eq(userTable.id, targetId))

  return { ok: true, message: "User unbanned." }
}

/**
 * Prepares the password reset: looks up the target, audits the intent, and
 * returns the email for the op handler to feed Better Auth. The actual
 * `auth.api.requestPasswordReset` call lives at the op layer because it
 * needs the live request Headers — services don't touch next/headers.
 */
export async function preparePasswordReset(
  db: Database,
  ctx: CallerContext,
  args: { targetId: string },
): Promise<PasswordResetTarget> {
  const { targetId } = args

  const [target] = await db
    .select({ id: userTable.id, email: userTable.email })
    .from(userTable)
    .where(eq(userTable.id, targetId))
    .limit(1)
  if (!target) throw ApiError.notFound("admin.user_not_found", "User not found.")

  const audit = createAudit(db)
  await audit({
    actorId: ctx.userId,
    action: "user.password_reset_sent",
    target: { type: "user", id: targetId },
    meta: { kind: "user.password_reset_sent" },
    client: auditClient(ctx),
  })

  return { email: target.email }
}

export async function sendAdminNotification(
  db: Database,
  ctx: CallerContext,
  args: { targetId: string; title: string; message: string; href?: string },
): Promise<AdminResult> {
  const { targetId, title, message, href } = args

  const [target] = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.id, targetId))
    .limit(1)
  if (!target) throw ApiError.notFound("admin.user_not_found", "User not found.")

  const audit = createAudit(db)
  await audit({
    actorId: ctx.userId,
    action: "user.admin_notified",
    target: { type: "user", id: targetId },
    meta: { kind: "user.admin_notified", title },
    client: auditClient(ctx),
  })

  await createNotification(db, ctx, {
    userId: targetId,
    body: {
      kind: "generic",
      title,
      message,
      href: href || undefined,
    },
  })

  return { ok: true, message: "Notification sent." }
}
