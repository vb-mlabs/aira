import "server-only"

// Admin operations.
//
// All five admin mutations route through `defineOperation` with
// `permission: "admin"`. The service module owns the business logic + audit;
// the op layer enforces permission and validates I/O at the wire.
//
// sendPasswordResetToOp is the one op that does work in the handler beyond
// dispatching to the service: it calls Better Auth's request-context API
// (auth.api.requestPasswordReset) which needs the live Headers from
// next/headers. Same pattern as updateNameOp / changePasswordOp in users.ts.

import { headers } from "next/headers"
import { z } from "zod"
import { ApiError } from "@aira/api"
import { admin } from "@aira/services"
import {
  AdminUsersFiltersSchema,
  ListUsersOutputSchema,
  UserDetailInputSchema,
  UserDetailOutputSchema,
  ListAuditInputSchema,
  ListAuditOutputSchema,
} from "@aira/validators/admin"
import { auth } from "@/lib/auth"
import { logger } from "@/lib/logger"
import { defineOperation } from "./index"

const AdminResultSchema = z.object({
  ok: z.literal(true),
  message: z.string(),
})

// ---------------------------------------------------------------------------
// Reads — RSC pages call these via apiServerFetch; admin tooling can curl
// them too. permission: "admin" picks up the 30-min idle-timeout gate
// automatically via enforceAdminFreshness at the composition root.

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
  permission: "admin",
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
  permission: "admin",
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
      await auth.api.requestPasswordReset({
        body: { email },
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
