// DELETE /api/v1/admin/businesses/[id]/images/[imageId]
// Removes the image row and best-effort deletes the stored object.

import { NextResponse } from "next/server"
import { ApiError } from "@aira/api"
import { requireAdminJSON } from "@/lib/auth/server"
import { logger } from "@/lib/logger"
import { deleteBusinessImage } from "@/features/admin/server/business-image-pipeline"

export const runtime = "nodejs"

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; imageId: string }> },
) {
  const auth = await requireAdminJSON(req)
  if (auth instanceof Response) return auth

  const { imageId } = await params

  try {
    await deleteBusinessImage({ imageId })
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof ApiError) {
      return err.toResponse()
    }
    logger.error("business image delete failed", {
      imageId,
      message: String(err),
    })
    return ApiError.internal("images.server_error", "Delete failed. Try again.").toResponse()
  }
}
