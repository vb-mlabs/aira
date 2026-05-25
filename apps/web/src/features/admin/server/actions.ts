"use server"

// Admin Server Actions — thin wrappers over the ops at
// apps/web/src/server/operations/admin.ts. Each wrapper:
//
//   1. Calls `op.runFromAction(args)` — the op enforces admin permission,
//      validates input, runs the @mlabs/services/admin handler, validates
//      output.
//   2. Revalidates the affected admin paths so the next navigation reflects
//      the change.
//   3. Catches ApiError to preserve the existing `{ ok, error }` return
//      shape that the admin UI components expect.
//
// Business logic, audit, atomic batching, and cross-domain notification
// fan-out live in @mlabs/services/admin — not here.

import "server-only"
import { revalidatePath } from "next/cache"
import { ApiError } from "@mlabs/api"
import {
  banUserOp,
  changeRoleOp,
  sendAdminNotificationOp,
  sendPasswordResetToOp,
  unbanUserOp,
} from "@/server/operations/admin"

type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string }

function asActionError(err: unknown): { ok: false; error: string } {
  if (err instanceof ApiError) return { ok: false, error: err.message }
  throw err
}

function revalidateUser(targetId: string) {
  revalidatePath(`/admin/users/${targetId}`)
  revalidatePath("/admin/users")
}

export async function changeRole(args: {
  targetId: string
  role: "user" | "admin"
}): Promise<ActionResult> {
  try {
    const result = await changeRoleOp.runFromAction(args)
    revalidateUser(args.targetId)
    return { ok: true, message: result.message }
  } catch (err) {
    return asActionError(err)
  }
}

export async function banUser(args: {
  targetId: string
  reason?: string
}): Promise<ActionResult> {
  try {
    const result = await banUserOp.runFromAction(args)
    revalidateUser(args.targetId)
    return { ok: true, message: result.message }
  } catch (err) {
    return asActionError(err)
  }
}

export async function unbanUser(args: {
  targetId: string
}): Promise<ActionResult> {
  try {
    const result = await unbanUserOp.runFromAction(args)
    revalidateUser(args.targetId)
    return { ok: true, message: result.message }
  } catch (err) {
    return asActionError(err)
  }
}

export async function sendPasswordResetTo(args: {
  targetId: string
}): Promise<ActionResult> {
  try {
    const result = await sendPasswordResetToOp.runFromAction(args)
    return { ok: true, message: result.message }
  } catch (err) {
    return asActionError(err)
  }
}

export async function sendAdminNotification(args: {
  targetId: string
  title: string
  message: string
  href?: string
}): Promise<ActionResult> {
  try {
    const result = await sendAdminNotificationOp.runFromAction(args)
    revalidatePath(`/admin/users/${args.targetId}`)
    return { ok: true, message: result.message }
  } catch (err) {
    return asActionError(err)
  }
}
