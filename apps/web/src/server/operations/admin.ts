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
import { ApiError } from "@mlabs/api"
import { admin } from "@mlabs/services"
import { auth } from "@/lib/auth"
import { logger } from "@/lib/logger"
import { defineOperation } from "./index"

const AdminResultSchema = z.object({
  ok: z.literal(true),
  message: z.string(),
})

export const changeRoleOp = defineOperation({
  name: "admin.changeRole",
  input: z.object({
    targetId: z.string().min(1),
    role: z.enum(["user", "admin"]),
  }),
  output: AdminResultSchema,
  permission: "admin",
  handler: (db, ctx, args) => admin.changeRole(db, ctx, args),
})

export const banUserOp = defineOperation({
  name: "admin.banUser",
  input: z.object({
    targetId: z.string().min(1),
    reason: z.string().trim().max(500).optional(),
  }),
  output: AdminResultSchema,
  permission: "admin",
  handler: (db, ctx, args) => admin.banUser(db, ctx, args),
})

export const unbanUserOp = defineOperation({
  name: "admin.unbanUser",
  input: z.object({ targetId: z.string().min(1) }),
  output: AdminResultSchema,
  permission: "admin",
  handler: (db, ctx, args) => admin.unbanUser(db, ctx, args),
})

export const sendPasswordResetToOp = defineOperation({
  name: "admin.sendPasswordResetTo",
  input: z.object({ targetId: z.string().min(1) }),
  output: AdminResultSchema,
  permission: "admin",
  handler: async (db, ctx, args) => {
    const { email } = await admin.preparePasswordReset(db, ctx, args)
    try {
      await auth.api.requestPasswordReset({
        body: { email },
        headers: await headers(),
      })
    } catch (err) {
      logger.error("admin sendPasswordResetTo failed", {
        adminId: ctx.userId,
        targetId: args.targetId,
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
    targetId: z.string().min(1),
    title: z.string().trim().min(1, "Title required").max(120),
    message: z.string().trim().min(1, "Message required").max(2000),
    href: z.string().trim().max(500).optional(),
  }),
  output: AdminResultSchema,
  permission: "admin",
  handler: (db, ctx, args) => admin.sendAdminNotification(db, ctx, args),
})
