import "server-only"

// Admin operations.
//
// Two tiers in this file: most ops use `permission: "admin"` (list users,
// get user detail, ban/unban, send password reset, send notification) so
// plain admins keep moderation powers. listAudit and changeRole tighten to
// `permission: "super_admin"` — audit visibility and role-promotion are
// platform-shape controls reserved for the project owner.
//
// sendPasswordResetToOp is the one op that does work in the handler beyond
// dispatching to the service: it calls Better Auth's request-context API
// (auth.api.requestPasswordReset) which needs the live Headers from
// next/headers. Same pattern as updateNameOp / changePasswordOp in users.ts.

import { headers } from "next/headers"
import { z } from "zod"
import { ApiError } from "@aira/api"
import { admin, notifications } from "@aira/services"
import { env } from "@/config/env"
import {
  AdminUsersFiltersSchema,
  ListUsersOutputSchema,
  UserDetailInputSchema,
  UserDetailOutputSchema,
  ListAuditInputSchema,
  ListAuditOutputSchema,
  BusinessOwnerBroadcastInputSchema,
  BusinessOwnerBroadcastOutputSchema,
  PreviewBroadcastRecipientCountInputSchema,
  PreviewBroadcastRecipientCountOutputSchema,
  SendUserBroadcastInputSchema,
  SendUserBroadcastOutputSchema,
  PreviewUserBroadcastInputSchema,
  PreviewUserBroadcastOutputSchema,
} from "@aira/validators/admin"
import { auth } from "@/lib/auth"
import { buildAuthUrl } from "@/lib/email/url"
import { logger } from "@/lib/logger"
import { defineOperation } from "./index"

const AdminResultSchema = z.object({
  ok: z.literal(true),
  message: z.string(),
})

// ---------------------------------------------------------------------------
// Reads — RSC pages call these via apiServerFetch; admin tooling can curl
// them too. Both admin and super_admin ops pick up the 30-min idle-timeout
// gate automatically via enforceAdminFreshness at the composition root.

export const listUsersOp = defineOperation({
  name: "admin.listUsers",
  input: AdminUsersFiltersSchema,
  output: ListUsersOutputSchema,
  permission: "admin",
  handler: (db, _ctx, filters) => admin.listUsers(db, filters),
})

export const getUserDetailOp = defineOperation({
  name: "admin.getUserDetail",
  input: UserDetailInputSchema,
  output: UserDetailOutputSchema,
  permission: "admin",
  handler: (db, _ctx, { id }) => admin.getUserDetail(db, id),
})

export const listAuditOp = defineOperation({
  name: "admin.listAudit",
  input: ListAuditInputSchema,
  output: ListAuditOutputSchema,
  permission: "super_admin",
  handler: (db, _ctx, input) => admin.listAudit(db, input),
})

// ---------------------------------------------------------------------------
// Mutations

// Mutations accept `id` (matching the [id] route segment) and translate to
// the service layer's `targetId` field at the boundary. This lets each
// route be a one-liner — defineOperation auto-merges path params onto raw
// input, so `[id]/ban` flows straight through with no per-route wrapper.

export const changeRoleOp = defineOperation({
  name: "admin.changeRole",
  input: z.object({
    id: z.string().min(1),
    role: z.enum(["end_user", "admin"]),
  }),
  output: AdminResultSchema,
  permission: "super_admin",
  handler: (db, ctx, { id, role }) =>
    admin.changeRole(db, ctx, { targetId: id, role }),
})

export const banUserOp = defineOperation({
  name: "admin.banUser",
  input: z.object({
    id: z.string().min(1),
    reason: z.string().trim().max(500).optional(),
  }),
  output: AdminResultSchema,
  permission: "admin",
  handler: (db, ctx, { id, reason }) =>
    admin.banUser(db, ctx, { targetId: id, reason }),
})

export const unbanUserOp = defineOperation({
  name: "admin.unbanUser",
  input: z.object({ id: z.string().min(1) }),
  output: AdminResultSchema,
  permission: "admin",
  handler: (db, ctx, { id }) => admin.unbanUser(db, ctx, { targetId: id }),
})

export const sendPasswordResetToOp = defineOperation({
  name: "admin.sendPasswordResetTo",
  input: z.object({ id: z.string().min(1) }),
  output: AdminResultSchema,
  permission: "admin",
  handler: async (db, ctx, { id }) => {
    const { email } = await admin.preparePasswordReset(db, ctx, {
      targetId: id,
    })
    try {
      // Absolute callbackURL required — Better Auth drops relative paths
      // not in trustedOrigins (undefined in prod) and emits `callbackURL=`
      // empty in the emailed link. See fix 72ca686 for the full trace.
      await auth.api.requestPasswordReset({
        body: { email, redirectTo: buildAuthUrl("/reset-password") },
        headers: await headers(),
      })
    } catch (err) {
      logger.error("admin sendPasswordResetTo failed", {
        adminId: ctx.userId,
        targetId: id,
        message: String(err),
      })
      throw ApiError.internal(
        "admin.reset_send_failed",
        "Could not send reset email.",
      )
    }
    return { ok: true as const, message: `Reset email sent to ${email}.` }
  },
})

export const sendAdminNotificationOp = defineOperation({
  name: "admin.sendNotification",
  input: z.object({
    id: z.string().min(1),
    title: z.string().trim().min(1, "Title required").max(120),
    message: z.string().trim().min(1, "Message required").max(2000),
    href: z.string().trim().max(500).optional(),
  }),
  output: AdminResultSchema,
  permission: "admin",
  handler: (db, ctx, { id, title, message, href }) =>
    admin.sendAdminNotification(db, ctx, {
      targetId: id,
      title,
      message,
      href,
    }),
})

/** G1 + F21 — fan out the broadcast: audit + in-app notifications
 *  (bell icon — bulletproof, runs even if Expo is down) plus push
 *  delivery via the Expo Push Service for the audience's registered
 *  devices. Audience picker lives in the validator (defaults to
 *  all_linked_owners). Empty recipient sets still leave an audit row. */
export const sendBusinessOwnerBroadcastOp = defineOperation({
  name: "admin.businesses.broadcast",
  input: BusinessOwnerBroadcastInputSchema,
  output: BusinessOwnerBroadcastOutputSchema,
  permission: "admin",
  handler: (db, ctx, args) =>
    notifications.sendPushBroadcast(db, ctx, args, {
      expoAccessToken: env.EXPO_ACCESS_TOKEN,
    }),
})

/** F21 — Live recipient count for the broadcast modal's audience
 *  picker. Wraps resolveTargetUserIds and returns the size of the
 *  resolved user set. Debounced from the modal so admins see the
 *  scope of their selection before they click Send. */
export const previewBroadcastRecipientCountOp = defineOperation({
  name: "admin.businesses.broadcast.preview",
  input: PreviewBroadcastRecipientCountInputSchema,
  output: PreviewBroadcastRecipientCountOutputSchema,
  permission: "admin",
  handler: async (db, _ctx, { target }) => {
    const userIds = await admin.resolveTargetUserIds(db, target)
    return { count: userIds.length }
  },
})

/** Admin user-direct broadcast — /admin/users "Notify users" tool.
 *  Fans out to end-user devices directly (not linked owners) and
 *  returns per-platform push counters + Expo error-code counts so
 *  the admin can triage delivery loop health from the Sent step. */
export const sendUserBroadcastOp = defineOperation({
  name: "admin.users.broadcast",
  input: SendUserBroadcastInputSchema,
  output: SendUserBroadcastOutputSchema,
  permission: "admin",
  handler: (db, ctx, args) =>
    notifications.sendUserPushBroadcast(db, ctx, args, {
      expoAccessToken: env.EXPO_ACCESS_TOKEN,
    }),
})

/** Live audience preview for the "Notify users" modal. Split by
 *  platform so the compose UI can render
 *  "42 users — 30 iOS, 12 Android (55 devices)" before Send. */
export const previewUserBroadcastRecipientCountOp = defineOperation({
  name: "admin.users.broadcast.preview",
  input: PreviewUserBroadcastInputSchema,
  output: PreviewUserBroadcastOutputSchema,
  permission: "admin",
  handler: (db, _ctx, { target }) =>
    admin.previewUserBroadcastCounts(db, target),
})
