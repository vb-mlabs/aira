// POST /api/v1/admin/businesses/[id]/images
// Multipart upload (field "file"). Resizes to 1200×800, stores in object
// storage, persists a business_image row. Max 3 images per business.

import { NextResponse } from "next/server"
import { ApiError } from "@aira/api"
import { requireAdminJSON } from "@/lib/auth/server"
import { logger } from "@/lib/logger"
import {
  ImagePipelineError,
  MAX_BYTES,
  processAndStoreBusinessImage,
} from "@/features/admin/server/business-image-pipeline"

export const runtime = "nodejs"
export const maxDuration = 30

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminJSON(req)
  if (auth instanceof Response) return auth

  const { id: businessId } = await params

  const form = await req.formData().catch(() => null)
  const file = form?.get("file")
  if (!(file instanceof File)) {
    return ApiError.badRequest("images.no_file", "No file provided.", "file").toResponse()
  }
  if (file.size > MAX_BYTES) {
    return new ApiError({
      status: 413,
      code: "images.too_large",
      message: "That image is too large. Max 8 MB.",
      field: "file",
    }).toResponse()
  }

  const bytes = Buffer.from(await file.arrayBuffer())

  try {
    const { image } = await processAndStoreBusinessImage({
      businessId,
      bytes,
      contentType: file.type,
    })
    return NextResponse.json({ image })
  } catch (err) {
    if (err instanceof ImagePipelineError) {
      return ApiError.badRequest(`images.${err.code}`, err.message).toResponse()
    }
    if (err instanceof ApiError) {
      return err.toResponse()
    }
    logger.error("business image upload failed", {
      businessId,
      message: String(err),
    })
    return ApiError.internal("images.server_error", "Upload failed. Try again.").toResponse()
  }
}
