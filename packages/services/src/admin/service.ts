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
// fan-out goes through the public surface at @aira/services/notifications.

import { and, eq, inArray, isNull, sql } from "drizzle-orm"
import {
  user as userTable,
  session as sessionTable,
  businesses,
  businessCategories,
  notifications as notificationsTable,
  userDevice,
} from "@aira/db/schema"
import { createAudit } from "@aira/db/audit"
import type { Database } from "@aira/db/client"
import { ApiError } from "@aira/api"
import type { CallerContext } from "@aira/api/context"
import type {
  BroadcastTarget,
  PreviewUserBroadcastOutput,
  UserBroadcastTarget,
} from "@aira/validators"
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
  args: { targetId: string; role: "end_user" | "admin" },
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

  // super_admin is an unsupported target for this UI — admins cannot demote
  // super_admins via the user-management screen. Bootstrap is the only path
  // to super_admin (T5), and demotions out of super_admin go through a
  // separate flow added in a later sprint.
  if (target.role === "super_admin") {
    throw ApiError.badRequest(
      "admin.super_admin_target",
      "Super-admin role cannot be changed from this screen.",
    )
  }
  const currentRole: "end_user" | "admin" =
    target.role === "admin" ? "admin" : "end_user"
  if (currentRole === role) {
    return { ok: true, message: "No change." }
  }

  if (currentRole === "admin" && role === "end_user") {
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

// ─── G1: Business-owner fan-out broadcast ─────────────────────────────────
//
// Targets distinct linked non-banned owners of active businesses. F21
// added the audience picker on top of this — resolveTargetUserIds is the
// shared SELECT every audience branch routes through; the by_city /
// by_categories / by_businesses branches just add WHERE clauses to the
// all_linked_owners base query.
//
// `business_category` is the source of truth for category targeting (the
// new normalized N:M from the admin Edit Categories work). The legacy
// `businesses.category` text column is intentionally not used here — the
// broadcast modal's category picker draws from listCategoriesTreeOp which
// returns categories.id values.
//
// Empty recipient sets STILL leave an audit row (recipient_count: 0) —
// auditability beats noise per the locked review decision.

export async function resolveTargetUserIds(
  db: Database,
  target: BroadcastTarget,
): Promise<string[]> {
  const activeOwner = and(
    isNull(businesses.deleted_at),
    isNull(userTable.banned_at),
  )

  switch (target.kind) {
    case "all_linked_owners": {
      const rows = await db
        .selectDistinct({ id: userTable.id })
        .from(businesses)
        .innerJoin(userTable, eq(userTable.id, businesses.owner_user_id))
        .where(activeOwner)
      return rows.map((r) => r.id)
    }
    case "by_city": {
      const rows = await db
        .selectDistinct({ id: userTable.id })
        .from(businesses)
        .innerJoin(userTable, eq(userTable.id, businesses.owner_user_id))
        .where(and(activeOwner, eq(businesses.city_id, target.city_id)))
      return rows.map((r) => r.id)
    }
    case "by_categories": {
      const rows = await db
        .selectDistinct({ id: userTable.id })
        .from(businesses)
        .innerJoin(userTable, eq(userTable.id, businesses.owner_user_id))
        .innerJoin(
          businessCategories,
          eq(businessCategories.business_id, businesses.id),
        )
        .where(
          and(
            activeOwner,
            inArray(businessCategories.category_id, target.category_ids),
          ),
        )
      return rows.map((r) => r.id)
    }
    case "by_businesses": {
      const rows = await db
        .selectDistinct({ id: userTable.id })
        .from(businesses)
        .innerJoin(userTable, eq(userTable.id, businesses.owner_user_id))
        .where(
          and(activeOwner, inArray(businesses.id, target.business_ids)),
        )
      return rows.map((r) => r.id)
    }
  }
}

export interface BusinessOwnerBroadcastArgs {
  title: string
  message: string
  target: BroadcastTarget
}

export interface BusinessOwnerBroadcastResult {
  ok: true
  recipient_count: number
  /** F21 — devices_* placeholders zeroed by the in-app-only fan-out path.
   *  sendPushBroadcast (task 6) wraps this and populates the real counters
   *  after the Expo Push Service round-trip. */
  devices_attempted: number
  devices_completed: number
  devices_pending: number
  /** F21 — user_id → notification_id map for the rows inserted by this
   *  broadcast. sendPushBroadcast joins this against the device list to
   *  emit one notification_delivery row per (user, device). Empty on
   *  zero-recipient broadcasts. */
  notifications: Array<{ user_id: string; notification_id: string }>
}

export async function sendBusinessOwnerBroadcast(
  db: Database,
  ctx: CallerContext,
  args: BusinessOwnerBroadcastArgs,
): Promise<BusinessOwnerBroadcastResult> {
  const { title, message, target } = args

  const recipientIds = await resolveTargetUserIds(db, target)
  const recipient_count = recipientIds.length

  // Audit BEFORE the fan-out — same convention as every other admin
  // action. recipient_count is captured in meta so empty broadcasts
  // leave a trace.
  const audit = createAudit(db)
  await audit({
    actorId: ctx.userId,
    action: "business.broadcast_sent",
    // Broadcast has no single target — it's a fan-out to N owners.
    // target stays undefined so target_type / target_id are NULL in the
    // audit_log row. Recipient list is captured by recipient_count + the
    // existing user.id index on notifications.
    target: undefined,
    meta: {
      kind: "business.broadcast_sent",
      title,
      recipient_count,
    },
    client: auditClient(ctx),
  })

  if (recipient_count === 0) {
    return {
      ok: true,
      recipient_count: 0,
      devices_attempted: 0,
      devices_completed: 0,
      devices_pending: 0,
      notifications: [],
    }
  }

  // Bulk-insert in one statement; createNotification is 1:1 and would
  // round-trip N times here. .returning gives sendPushBroadcast the
  // per-user notification ids it needs for the delivery log without a
  // second SELECT.
  const inserted = await db
    .insert(notificationsTable)
    .values(
      recipientIds.map((userId) => ({
        user_id: userId,
        type: "business_broadcast",
        body: {
          kind: "business_broadcast" as const,
          title,
          message,
        },
      })),
    )
    .returning({
      notification_id: notificationsTable.id,
      user_id: notificationsTable.user_id,
    })

  return {
    ok: true,
    recipient_count,
    devices_attempted: 0,
    devices_completed: 0,
    devices_pending: 0,
    notifications: inserted,
  }
}

// ─── Admin user-direct broadcast (with per-platform diagnostics) ──────────
//
// Sibling to sendBusinessOwnerBroadcast, scoped to user_device rows
// directly (no business-owner join). Primary use is triaging push
// delivery — an admin can send an iOS-only test blast and read back
// per-platform ticket outcomes to distinguish send-side vs receive-side
// failures.
//
// Filters banned users out (isNull(banned_at)) for parity with
// resolveTargetUserIds. by_platform additionally narrows the device
// filter so a user with both iOS + Android devices only receives the
// blast on the requested platform.

/** One-shot audience count for the compose-step preview. Returns
 *  user_count + device_count split by platform, so the compose UI can
 *  render "42 users — 30 iOS, 12 Android (55 devices)" without a
 *  second round-trip. */
export async function previewUserBroadcastCounts(
  db: Database,
  target: UserBroadcastTarget,
): Promise<PreviewUserBroadcastOutput> {
  const conditions = [isNull(userTable.banned_at)]
  if (target.kind === "by_platform") {
    conditions.push(eq(userDevice.platform, target.platform))
  }

  const rows = await db
    .select({
      user_id: userDevice.user_id,
      platform: userDevice.platform,
    })
    .from(userDevice)
    .innerJoin(userTable, eq(userTable.id, userDevice.user_id))
    .where(and(...conditions))

  // Distinct users overall + per-platform. A user with one iOS and one
  // Android device counts once toward user_count but toward BOTH
  // by_platform user tallies.
  const allUsers = new Set<string>()
  const iosUsers = new Set<string>()
  const androidUsers = new Set<string>()
  let iosDevices = 0
  let androidDevices = 0

  for (const row of rows) {
    allUsers.add(row.user_id)
    if (row.platform === "ios") {
      iosUsers.add(row.user_id)
      iosDevices += 1
    } else if (row.platform === "android") {
      androidUsers.add(row.user_id)
      androidDevices += 1
    }
    // Any other platform value (should be impossible per DevicePlatform
    // enum enforced on write) is deliberately dropped from device
    // buckets so counts stay iOS + Android only.
  }

  return {
    user_count: allUsers.size,
    device_count: iosDevices + androidDevices,
    by_platform: {
      ios: { users: iosUsers.size, devices: iosDevices },
      android: { users: androidUsers.size, devices: androidDevices },
    },
  }
}

/** Distinct user ids matching the audience — used by the send path to
 *  drive the notification bulk-insert. Same filter semantics as
 *  previewUserBroadcastCounts (banned users excluded; by_platform
 *  narrows to users owning at least one device on the target
 *  platform). */
export async function resolveUserBroadcastAudience(
  db: Database,
  target: UserBroadcastTarget,
): Promise<string[]> {
  const conditions = [isNull(userTable.banned_at)]
  if (target.kind === "by_platform") {
    conditions.push(eq(userDevice.platform, target.platform))
  }
  const rows = await db
    .selectDistinct({ id: userDevice.user_id })
    .from(userDevice)
    .innerJoin(userTable, eq(userTable.id, userDevice.user_id))
    .where(and(...conditions))
  return rows.map((r) => r.id)
}

export interface UserBroadcastArgs {
  title: string
  message: string
  target: UserBroadcastTarget
}

export interface UserBroadcastResult {
  recipient_count: number
  /** user_id → notification_id map for the rows inserted by this
   *  broadcast. sendUserPushBroadcast joins this against the device
   *  list to emit one notification_delivery row per (user, device).
   *  Empty on zero-recipient broadcasts. */
  notifications: Array<{ user_id: string; notification_id: string }>
}

/** Audit + in-app notification fan-out. Push delivery is a separate
 *  concern (sendUserPushBroadcast wraps this + does the Expo round-
 *  trip). Zero-recipient broadcasts still write the audit row for the
 *  attempt trace. */
export async function sendUserBroadcast(
  db: Database,
  ctx: CallerContext,
  args: UserBroadcastArgs,
): Promise<UserBroadcastResult> {
  const { title, message, target } = args

  const recipientIds = await resolveUserBroadcastAudience(db, target)
  const recipient_count = recipientIds.length
  const platform_filter =
    target.kind === "all_users_with_device" ? "all" : target.platform

  const audit = createAudit(db)
  await audit({
    actorId: ctx.userId,
    action: "admin.user_broadcast_sent",
    target: undefined,
    meta: {
      kind: "admin.user_broadcast_sent",
      title,
      recipient_count,
      platform_filter,
    },
    client: auditClient(ctx),
  })

  if (recipient_count === 0) {
    return { recipient_count: 0, notifications: [] }
  }

  // Reuse the existing 'generic' notification kind — every renderer
  // (web + mobile bell + mobile detail modal) already handles it, no
  // exhaustive-switch churn. Distinguishes broadcasts from per-user
  // admin nudges via the audit_log.action string, not the row type.
  const inserted = await db
    .insert(notificationsTable)
    .values(
      recipientIds.map((userId) => ({
        user_id: userId,
        type: "generic",
        body: {
          kind: "generic" as const,
          title,
          message,
        },
      })),
    )
    .returning({
      notification_id: notificationsTable.id,
      user_id: notificationsTable.user_id,
    })

  return { recipient_count, notifications: inserted }
}
