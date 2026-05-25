"use server"

// Notification mutations: thin Server Action wrappers around the operations
// defined in @/server/operations/notifications. The operation owns auth,
// Zod validation, permission check, and the service call. The action layer
// only adds Next-specific side effects (revalidatePath) on the way out.
//
// Authz model — no enumeration: markRead(id) updates with the predicate
// (id = $1 AND user_id = $me). If 0 rows match (bogus id OR belongs to
// another user OR is already read), the service returns { changed: 0 }.
// An attacker probing IDs sees the same response for "doesn't exist" and
// "exists but not yours" — preserved from the pre-op implementation.

import "server-only"
import { revalidatePath } from "next/cache"
import { markAllReadOp, markReadOp } from "@/server/operations/notifications"

interface MarkResult {
  ok: true
  changed: number
}

export async function markRead(id: string): Promise<MarkResult> {
  const result = await markReadOp.runFromAction({ id })
  if (result.changed > 0) revalidatePath("/notifications")
  return result
}

export async function markAllRead(): Promise<MarkResult> {
  const result = await markAllReadOp.runFromAction({})
  if (result.changed > 0) revalidatePath("/notifications")
  return result
}
