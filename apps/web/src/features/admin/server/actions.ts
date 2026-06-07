"use server"

// Admin Server Actions — thin wrappers over the ops at
// apps/web/src/server/operations/admin.ts. Each wrapper:
//
//   1. Calls `op.runFromAction(args)` — the op enforces admin permission,
//      validates input, runs the @aira/services/admin handler, validates
//      output.
//   2. Revalidates the affected admin paths so the next navigation reflects
//      the change.
//   3. Catches ApiError to preserve the existing `{ ok, error }` return
//      shape that the admin UI components expect.
//
// Business logic, audit, atomic batching, and cross-domain notification
// fan-out live in @aira/services/admin — not here.

import "server-only"
import { revalidatePath } from "next/cache"
import { ApiError } from "@aira/api"
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

// targetId → id at the op boundary (renamed for path-param alignment in T11);
// service signatures untouched. T12 deletes this entire file.

export async function changeRole(args: {
  targetId: string
  role: "end_user" | "admin"
}): Promise<ActionResult> {
  try {
    const result = await changeRoleOp.runFromAction({
      id: args.targetId,
      role: args.role,
    })
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
    const result = await banUserOp.runFromAction({
      id: args.targetId,
      reason: args.reason,
    })
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
    const result = await unbanUserOp.runFromAction({ id: args.targetId })
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
    const result = await sendPasswordResetToOp.runFromAction({
      id: args.targetId,
    })
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
    const result = await sendAdminNotificationOp.runFromAction({
      id: args.targetId,
      title: args.title,
      message: args.message,
      href: args.href,
    })
    revalidatePath(`/admin/users/${args.targetId}`)
    return { ok: true, message: result.message }
  } catch (err) {
    return asActionError(err)
  }
}
