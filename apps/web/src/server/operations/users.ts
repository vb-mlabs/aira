import "server-only"

// Users operations.
//
// updateNameOp + changePasswordOp wrap Better Auth's request-context APIs
// (auth.api.updateUser / changePassword take a live Headers object). They
// live at the composition root — the @mlabs/services/users domain is pure
// (no auth.api dep), so the Better Auth call lives here, inside the op
// handler, which runs inside the Next request scope (next/headers works).

import { headers } from "next/headers"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { ApiError } from "@mlabs/api"
import { user as userTable } from "@mlabs/db/schema"
import { createAudit } from "@mlabs/db/audit"
import { users } from "@mlabs/services"
import { auth } from "@/lib/auth"
import { logger } from "@/lib/logger"
import { defineOperation } from "./index"

export const deleteAccountOp = defineOperation({
  name: "users.deleteAccount",
  input: z.object({}).strict(),
  output: z.object({
    ok: z.literal(true),
    previousImage: z.string().nullable(),
  }),
  permission: "user",
  handler: async (db, ctx) => users.deleteAccount(db, ctx),
})

const NameOutput = z.object({
  user: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
  }),
  changed: z.boolean(),
})

export const updateNameOp = defineOperation({
  name: "users.updateName",
  input: z.object({
    name: z.string().trim().min(1, "Name is required").max(80, "Name is too long"),
  }),
  output: NameOutput,
  permission: "user",
  handler: async (db, ctx, { name }) => {
    // Read current name so we can short-circuit when nothing changed — the
    // op's output schema commits to telling the caller whether the write
    // actually happened.
    const [row] = await db
      .select({ name: userTable.name })
      .from(userTable)
      .where(eq(userTable.id, ctx.userId))
      .limit(1)
    const currentName = row?.name ?? ""
    if (currentName === name) {
      return {
        user: { id: ctx.userId, email: ctx.user.email, name: currentName },
        changed: false,
      }
    }

    // Audit BEFORE the action. A failed audit blocks the
    // write — keeps the audit log authoritative.
    const audit = createAudit(db)
    await audit({
      actorId: ctx.userId,
      action: "user.name_changed",
      target: { type: "user", id: ctx.userId },
      meta: { kind: "user.name_changed" },
      client: ctx.source === "mobile" ? "mobile" : "web",
    })

    // Better Auth's updateUser also invalidates its in-memory session
    // cache (so the next /api/auth/get-session call returns the new name).
    // Bypassing it would leave session.user.name stale until next refresh.
    await auth.api.updateUser({
      body: { name },
      headers: await headers(),
    })

    return {
      user: { id: ctx.userId, email: ctx.user.email, name },
      changed: true,
    }
  },
})

export const changePasswordOp = defineOperation({
  name: "users.changePassword",
  input: z.object({
    currentPassword: z.string().min(1, "Current password required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
  }),
  output: z.object({ ok: z.literal(true) }),
  permission: "user",
  handler: async (db, ctx, { currentPassword, newPassword }) => {
    // Audit BEFORE the password change. revokeOtherSessions:true below
    // means every other session gets invalidated; the audit row's
    // session.revoked entry records that intent.
    const audit = createAudit(db)
    await audit({
      actorId: ctx.userId,
      action: "session.revoked",
      target: { type: "user", id: ctx.userId },
      meta: { kind: "session.revoked", reason: "password_change" },
      client: ctx.source === "mobile" ? "mobile" : "web",
    })

    try {
      await auth.api.changePassword({
        body: {
          currentPassword,
          newPassword,
          revokeOtherSessions: true,
        },
        headers: await headers(),
      })
    } catch (err) {
      // Better Auth throws on wrong current password. Keep the message
      // generic to avoid an enumeration oracle (no signal that the email
      // is real if password is wrong).
      logger.warn("changePassword rejected", {
        userId: ctx.userId,
        message: String(err),
      })
      throw ApiError.badRequest(
        "profile.password_rejected",
        "Could not change password. Check your current password and try again.",
      )
    }

    return { ok: true as const }
  },
})
