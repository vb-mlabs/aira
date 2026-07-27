// POST /api/v1/admin/businesses/[id]/logo
// Multipart upload (field "file"). Client crops square via
// react-easy-crop; server finalises to 512×512 PNG (transparency
// preserved) and writes businesses.logo_url. Replaces any existing
// logo.
//
// DELETE /api/v1/admin/businesses/[id]/logo
// Clears logo_url and best-effort deletes the stored object.
//
// Mirror of feature-image/route.ts one-for-one — same auth, same
// existence check, same fire-and-forget storage cleanup. See that
// route's header for the rationale on each pattern.

import { NextResponse } from "next/server"
import { ApiError } from "@aira/api"
import { requireAdminJSON } from "@/lib/auth/server"
import { businesses as businessesService } from "@aira/services"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"
import {
  ImagePipelineError,
  MAX_BYTES,
  processAndStoreBusinessLogo,
} from "@/features/admin/server/business-image-pipeline"

export const runtime = "nodejs"
export const maxDuration = 30

function storageKeyFromUrl(url: string): string | null {
  const prefix = "/api/storage/"
  if (!url.startsWith(prefix)) return null
  return url.slice(prefix.length)
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminJSON(req)
  if (auth instanceof Response) return auth

  const { id: businessId } = await params

  const existing = await businessesService.getBusinessByIdIncludingArchived(db, businessId)
  if (!existing) return ApiError.notFound("businesses.not_found", "Business not found").toResponse()
  const oldUrl = existing.logo_url

  const form = await req.formData().catch(() => null)
  const file = form?.get("file")
  if (!(file instanceof File))
    return ApiError.badRequest("images.no_file", "No file provided.", "file").toResponse()
  if (file.size > MAX_BYTES)
    return new ApiError({
      status: 413,
      code: "images.too_large",
      message: "That image is too large. Max 8 MB.",
      field: "file",
    }).toResponse()

  const bytes = Buffer.from(await file.arrayBuffer())

  try {
    const { url } = await processAndStoreBusinessLogo({
      businessId,
      bytes,
      contentType: file.type,
    })

    // Best-effort delete old object after new one is live. Dynamic
    // import + fire-and-forget so storage latency doesn't block the
    // happy-path response (matches feature-image route pattern).
    if (oldUrl && oldUrl !== url) {
      const key = storageKeyFromUrl(oldUrl)
      if (key) {
        import("@/lib/storage")
          .then(({ storage }) => storage.delete(key))
          .catch((err) =>
            logger.warn("business logo old object delete failed", {
              businessId,
              key,
              message: String(err),
            }),
          )
      }
    }

    return NextResponse.json({ url })
  } catch (err) {
    if (err instanceof ImagePipelineError)
      return ApiError.badRequest(`images.${err.code}`, err.message).toResponse()
    if (err instanceof ApiError) return err.toResponse()
    logger.error("business logo upload failed", { businessId, message: String(err) })
    return ApiError.internal("images.server_error", "Upload failed. Try again.").toResponse()
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminJSON(req)
  if (auth instanceof Response) return auth

  const { id: businessId } = await params

  try {
    const { oldUrl } = await businessesService.clearBusinessLogo(db, businessId)

    if (oldUrl) {
      const key = storageKeyFromUrl(oldUrl)
      if (key) {
        import("@/lib/storage")
          .then(({ storage }) => storage.delete(key))
          .catch((err) =>
            logger.warn("business logo storage delete failed", {
              businessId,
              key,
              message: String(err),
            }),
          )
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof ApiError) return err.toResponse()
    logger.error("business logo delete failed", { businessId, message: String(err) })
    return ApiError.internal("images.server_error", "Delete failed. Try again.").toResponse()
  }
}
