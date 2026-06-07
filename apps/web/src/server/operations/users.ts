import "server-only"

// Users operations.
//
// updateNameOp + requestEmailChangeOp + changePasswordOp wrap Better Auth's
// request-context APIs (auth.api.updateUser / changeEmail / changePassword
// take a live Headers object). They live at the composition root — the
// @aira/services/users domain is pure (no auth.api dep), so the Better
// Auth call lives here, inside the op handler, which runs inside the Next
// request scope (next/headers works).

import { headers } from "next/headers"
import { eq } from "drizzle-orm"
import { createHash } from "node:crypto"
import { z } from "zod"
import { ApiError } from "@aira/api"
import { user as userTable } from "@aira/db/schema"
import { createAudit } from "@aira/db/audit"
import { users } from "@aira/services"
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

export const getProfileOp = defineOperation({
  name: "users.getProfile",
  input: z.object({}).strict(),
  output: z.object({
    user: z.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
      emailVerified: z.boolean(),
      image: z.string().nullable(),
    }),
  }),
  permission: "user",
  handler: async (db, ctx) => {
    // Read the latest row — the session-cached user may lag a freshly
    // committed name/email/avatar change, and /profile renders right
    // after those mutations.
    const [fresh] = await db
      .select({
        id: userTable.id,
        name: userTable.name,
        email: userTable.email,
        emailVerified: userTable.emailVerified,
        image: userTable.image,
      })
      .from(userTable)
      .where(eq(userTable.id, ctx.userId))
      .limit(1)
    if (!fresh) {
      // Session referenced a user that no longer exists — surface as auth
      // failure so the layout redirects to /login.
      throw ApiError.unauthorized()
    }
    return { user: fresh }
  },
})

export const requestEmailChangeOp = defineOperation({
  name: "users.requestEmailChange",
  input: z.object({
    email: z.email("Enter a valid email"),
  }),
  output: z.object({
    ok: z.literal(true),
    /** True when the requested email differs from the current one. False
     *  means the no-op short-circuited — the UI surfaces a "that's already
     *  your email" message rather than acting like a confirmation was sent. */
    changed: z.boolean(),
  }),
  permission: "user",
  handler: async (db, ctx, { email }) => {
    const newEmail = email.toLowerCase()
    if (newEmail === ctx.user.email.toLowerCase()) {
      return { ok: true as const, changed: false }
    }

    // Audit BEFORE the action. from_email_hash lets us trace email-rotation
    // history without storing the previous PII once it rotates out.
    const audit = createAudit(db)
    await audit({
      actorId: ctx.userId,
      action: "user.email_changed",
      target: { type: "user", id: ctx.userId },
      meta: {
        kind: "user.email_changed",
        from_email_hash: createHash("sha256")
          .update(ctx.user.email)
          .digest("hex"),
      },
      client: ctx.source === "mobile" ? "mobile" : "web",
    })

    try {
      await auth.api.changeEmail({
        body: { newEmail },
        headers: await headers(),
      })
    } catch (err) {
      logger.error("changeEmail failed", {
        userId: ctx.userId,
        message: String(err),
      })
      throw ApiError.badRequest(
        "profile.email_change_failed",
        "Could not start email change. Try again in a moment.",
      )
    }

    return { ok: true as const, changed: true }
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
