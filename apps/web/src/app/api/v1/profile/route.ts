// /api/v1/profile — single REST surface for web + mobile.
//
// GET    /api/v1/profile             → fresh user snapshot for /profile page
// PATCH  /api/v1/profile  { name }   → updates display name
// DELETE /api/v1/profile             → anonymizes account (irreversible)
//
// Web RSC reads via apiServerFetch(getProfileOp); web Client Components
// mutate via apiClient.patch / .delete; mobile via @aira/api/client. Both
// clients hit the same routes; there are no Server Actions in
// features/profile anymore.

import { NextResponse } from "next/server"
import { logger } from "@/lib/logger"
import { storage } from "@/lib/storage"
import {
  deleteAccountOp,
  getProfileOp,
  updateNameOp,
} from "@/server/operations/users"

export const runtime = "nodejs"

export const GET = getProfileOp.runFromRequest

export const PATCH = updateNameOp.runFromRequest

export async function DELETE(req: Request) {
  // Op handles auth + audit + anonymize + session-revoke in one pipeline.
  // The only piece left at the route layer is the best-effort storage
  // cleanup, which can't live in services (the storage adapter is an
  // app-composition concern). We do the storage delete AFTER the op
  // succeeds so a hung storage backend can't block account deletion.
  const res = await deleteAccountOp.runFromRequest(req)
  if (res.status !== 200) return res
  const body = (await res.clone().json()) as {
    ok: true
    previousImage: string | null
  }
  if (body.previousImage) {
    const prefix = "/api/storage/"
    if (body.previousImage.startsWith(prefix)) {
      const key = body.previousImage.slice(prefix.length)
      try {
        await storage.delete(key)
      } catch (err) {
        logger.warn("avatar delete failed during account deletion", {
          key,
          message: String(err),
        })
      }
    }
  }
  return NextResponse.json({ ok: true })
}
