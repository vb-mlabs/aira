import { NextResponse } from "next/server"
import { ApiError } from "@aira/api"
import { getSessionFromHeaders, adminSessionIsStale } from "@/lib/auth/server"
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
  const session = await getSessionFromHeaders(req.headers)
  if (!session?.user) return ApiError.unauthorized().toResponse()
  const role = (session.user as { role?: string }).role ?? "end_user"
  if (role !== "admin" && role !== "super_admin") {
    return ApiError.forbidden("Admin access required").toResponse()
  }
  const sessionId = (session.session as { id?: string }).id
  if (await adminSessionIsStale(sessionId)) return ApiError.idleTimeout().toResponse()

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
      subscriptionId: subId,
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
