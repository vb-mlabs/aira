// POST /api/v1/admin/businesses/[id]/feature-image
// Multipart upload (field "file"). Resizes to 1200×630, stores in object
// storage, sets businesses.image_url. Replaces any existing feature image.
//
// DELETE /api/v1/admin/businesses/[id]/feature-image
// Clears image_url and best-effort deletes the stored object.

import { NextResponse } from "next/server"
import { ApiError } from "@aira/api"
import { getSessionFromHeaders, adminSessionIsStale } from "@/lib/auth/server"
import { businesses as businessesService } from "@aira/services"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"
import {
  ImagePipelineError,
  MAX_BYTES,
  processAndStoreFeatureImage,
} from "@/features/admin/server/business-image-pipeline"

export const runtime = "nodejs"
export const maxDuration = 30

async function authorise(req: Request): Promise<ApiError | null> {
  const session = await getSessionFromHeaders(req.headers)
  if (!session?.user) return ApiError.unauthorized()
  const role = (session.user as { role?: string }).role ?? "end_user"
  if (role !== "admin" && role !== "super_admin")
    return ApiError.forbidden("Admin access required")
  const sessionId = (session.session as { id?: string }).id
  if (await adminSessionIsStale(sessionId)) return ApiError.idleTimeout()
  return null
}

function storageKeyFromUrl(url: string): string | null {
  const prefix = "/api/storage/"
  if (!url.startsWith(prefix)) return null
  return url.slice(prefix.length)
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authErr = await authorise(req)
  if (authErr) return authErr.toResponse()

  const { id: businessId } = await params

  const existing = await businessesService.getBusinessByIdIncludingArchived(db, businessId)
  if (!existing) return ApiError.notFound("businesses.not_found", "Business not found").toResponse()
  const oldUrl = existing.image_url

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
    const { url } = await processAndStoreFeatureImage({
      businessId,
      bytes,
      contentType: file.type,
    })

    // Best-effort delete old object after new one is live
    if (oldUrl && oldUrl !== url) {
      const key = storageKeyFromUrl(oldUrl)
      if (key) {
        import("@/lib/storage")
          .then(({ storage }) => storage.delete(key))
          .catch((err) =>
            logger.warn("feature image old object delete failed", {
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
    logger.error("feature image upload failed", { businessId, message: String(err) })
    return ApiError.internal("images.server_error", "Upload failed. Try again.").toResponse()
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authErr = await authorise(req)
  if (authErr) return authErr.toResponse()

  const { id: businessId } = await params

  try {
    const { oldUrl } = await businessesService.clearBusinessFeatureImage(db, businessId)

    if (oldUrl) {
      const key = storageKeyFromUrl(oldUrl)
      if (key) {
        import("@/lib/storage")
          .then(({ storage }) => storage.delete(key))
          .catch((err) =>
            logger.warn("feature image storage delete failed", {
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
    logger.error("feature image delete failed", { businessId, message: String(err) })
    return ApiError.internal("images.server_error", "Delete failed. Try again.").toResponse()
  }
}
