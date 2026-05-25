"use server"

// Profile server actions. All mutations:
//   1. Re-enforce auth via requireUser() (cookies → session lookup).
//   2. Validate input with Zod at the trust boundary.
//   3. audit() BEFORE the state change.
//   4. Return a typed result — never throw past Next's error boundary.

import "server-only"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { eq } from "drizzle-orm"
import { createHash } from "node:crypto"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { requireUser } from "@/lib/auth/server"
import { db } from "@/lib/db"
import { user as userTable, session as sessionTable } from "@mlabs/db/schema"
import { audit } from "@/lib/db/audit"
import { logger } from "@/lib/logger"
import { storage } from "@/lib/storage"

type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string }

const nameSchema = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(80, "Name is too long")

export async function updateName(formData: FormData): Promise<ActionResult> {
  const me = await requireUser()
  const parsed = nameSchema.safeParse(formData.get("name"))
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid name" }
  }
  const newName = parsed.data
  if (newName === me.name) {
    return { ok: true, message: "No changes." }
  }

  await audit({
    actorId: me.id,
    action: "user.name_changed",
    target: { type: "user", id: me.id },
    meta: { kind: "user.name_changed" },
  })

  await auth.api.updateUser({
    body: { name: newName },
    headers: await headers(),
  })

  revalidatePath("/profile")
  return { ok: true, message: "Name updated." }
}

const emailSchema = z.email("Enter a valid email")

export async function requestEmailChange(formData: FormData): Promise<ActionResult> {
  const me = await requireUser()
  const parsed = emailSchema.safeParse(formData.get("email"))
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid email" }
  }
  const newEmail = parsed.data.toLowerCase()
  if (newEmail === me.email.toLowerCase()) {
    return { ok: true, message: "That's already your email." }
  }

  await audit({
    actorId: me.id,
    action: "user.email_changed",
    target: { type: "user", id: me.id },
    meta: {
      kind: "user.email_changed",
      from_email_hash: createHash("sha256").update(me.email).digest("hex"),
    },
  })

  try {
    await auth.api.changeEmail({
      body: { newEmail },
      headers: await headers(),
    })
  } catch (err) {
    logger.error("changeEmail failed", { userId: me.id, message: String(err) })
    return {
      ok: false,
      error: "Could not start email change. Try again in a moment.",
    }
  }

  return {
    ok: true,
    message: `Check ${me.email} — we sent a confirmation link to your current address.`,
  }
}

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
})

export async function changePassword(formData: FormData): Promise<ActionResult> {
  const me = await requireUser()
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
  })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  // Audit before — revokeOtherSessions implies a forced sign-out on the
  // user's other devices.
  await audit({
    actorId: me.id,
    action: "session.revoked",
    target: { type: "user", id: me.id },
    meta: { kind: "session.revoked", reason: "password_change" },
  })

  try {
    await auth.api.changePassword({
      body: {
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
        revokeOtherSessions: true,
      },
      headers: await headers(),
    })
  } catch (err) {
    // Better Auth throws on wrong current password — keep the message generic.
    logger.warn("changePassword rejected", { userId: me.id, message: String(err) })
    return {
      ok: false,
      error: "Could not change password. Check your current password and try again.",
    }
  }

  return { ok: true, message: "Password changed. Other sessions signed out." }
}

const deleteConfirmSchema = z.object({
  confirmEmail: z.string(),
})

export async function deleteAccount(formData: FormData): Promise<ActionResult> {
  const me = await requireUser()
  const parsed = deleteConfirmSchema.safeParse({
    confirmEmail: formData.get("confirmEmail"),
  })
  if (!parsed.success || parsed.data.confirmEmail.toLowerCase() !== me.email.toLowerCase()) {
    return { ok: false, error: "Type your email exactly to confirm." }
  }

  await audit({
    actorId: me.id,
    action: "user.deleted_anonymized",
    target: { type: "user", id: me.id },
    meta: { kind: "user.deleted_anonymized" },
  })

  // Best-effort avatar cleanup — failure shouldn't block the delete itself.
  if (me.image) {
    const key = avatarKeyFromUrl(me.image)
    if (key) {
      try {
        await storage.delete(key)
      } catch (err) {
        logger.warn("avatar delete failed during account deletion", {
          userId: me.id,
          key,
          message: String(err),
        })
      }
    }
  }

  // Anonymize-in-place — preserves audit_log foreign-keyability and any
  // historical references (messages, etc) without exposing PII.
  await db
    .update(userTable)
    .set({
      name: "Deleted user",
      email: `deleted-${me.id}@example.invalid`,
      emailVerified: false,
      image: null,
    })
    .where(eq(userTable.id, me.id))

  // Revoke every session for the user (including the current one).
  await audit({
    actorId: me.id,
    action: "session.revoked",
    target: { type: "user", id: me.id },
    meta: { kind: "session.revoked", reason: "account_deleted" },
  })
  await db.delete(sessionTable).where(eq(sessionTable.userId, me.id))

  redirect("/")
}

// Avatar URLs are stored as `/api/storage/<key>` — strip the prefix to get the
// storage key. Returns null if the URL shape is unfamiliar (external CDN etc),
// so we don't accidentally call storage.delete on something we can't address.
function avatarKeyFromUrl(url: string): string | null {
  const prefix = "/api/storage/"
  if (!url.startsWith(prefix)) return null
  return url.slice(prefix.length)
}
