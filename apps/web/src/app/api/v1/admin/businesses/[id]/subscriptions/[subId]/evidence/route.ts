import { NextResponse } from "next/server"
import { ApiError } from "@aira/api"
import { requireAdminJSON } from "@/lib/auth/server"
import { logger } from "@/lib/logger"
import { businessSubscriptions as subsService } from "@aira/services"
import { db } from "@/lib/db"
import {
  EvidencePipelineError,
  EVIDENCE_MAX_BYTES,
  processAndStoreEvidence,
} from "@/features/admin/server/evidence-pipeline"

export const runtime = "nodejs"
export const maxDuration = 30

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; subId: string }> },
) {
  const auth = await requireAdminJSON(req)
  if (auth instanceof Response) return auth

  const { subId } = await params

  const form = await req.formData().catch(() => null)
  const file = form?.get("file")
  if (!(file instanceof File)) {
    return ApiError.badRequest("evidence.no_file", "No file provided.", "file").toResponse()
  }
  if (file.size > EVIDENCE_MAX_BYTES) {
    return new ApiError({
      status: 413,
      code: "evidence.too_large",
      message: "That file is too large. Max 5 MB.",
      field: "file",
    }).toResponse()
  }

  const bytes = Buffer.from(await file.arrayBuffer())

  try {
    const { url } = await processAndStoreEvidence({
      domain: "subscription",
      id: subId,
      bytes,
      contentType: file.type,
    })
    const sub = await subsService.updateSubscription(db, {
      id: subId,
      payment_evidence_url: url,
    })
    if (!sub) return ApiError.notFound("subscription.not_found", "Subscription not found").toResponse()
    return NextResponse.json({ subscription: sub })
  } catch (err) {
    if (err instanceof EvidencePipelineError) {
      return ApiError.badRequest(`evidence.${err.code}`, err.message).toResponse()
    }
    if (err instanceof ApiError) return err.toResponse()
    logger.error("evidence upload failed", { subId, message: String(err) })
    return ApiError.internal("evidence.server_error", "Upload failed. Try again.").toResponse()
  }
}
