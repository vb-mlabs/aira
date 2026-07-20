import { NextResponse } from "next/server"
import { ApiError } from "@aira/api"
import { requireAdminJSON } from "@/lib/auth/server"
import { logger } from "@/lib/logger"
import { sponsorships as spService } from "@aira/services"
import { db } from "@/lib/db"
import { createAudit } from "@aira/db/audit"
import {
  EvidencePipelineError,
  EVIDENCE_MAX_BYTES,
  processAndStoreEvidence,
} from "@/features/admin/server/evidence-pipeline"

export const runtime = "nodejs"
export const maxDuration = 30

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; spId: string }> },
) {
  const auth = await requireAdminJSON(req)
  if (auth instanceof Response) return auth

  const { spId } = await params

  // Resolve first so a 404 short-circuits the file work AND so we have
  // the parent business_id to key the audit row.
  const existing = await spService.getSponsorshipById(db, spId)
  if (!existing) {
    return ApiError.notFound(
      "sponsorship.not_found",
      "Sponsorship not found",
    ).toResponse()
  }

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
      domain: "sponsorship",
      id: spId,
      bytes,
      contentType: file.type,
    })
    const audit = createAudit(db)
    await audit({
      actorId: auth.id,
      action: "business.sponsorship_evidence_uploaded",
      target: { type: "business", id: existing.business_id },
      meta: { kind: "business.sponsorship_evidence_uploaded" },
    })
    const sponsorship = await spService.updateSponsorship(db, {
      id: spId,
      payment_evidence_url: url,
    })
    if (!sponsorship) {
      return ApiError.notFound(
        "sponsorship.not_found",
        "Sponsorship not found",
      ).toResponse()
    }
    return NextResponse.json({ sponsorship })
  } catch (err) {
    if (err instanceof EvidencePipelineError) {
      return ApiError.badRequest(`evidence.${err.code}`, err.message).toResponse()
    }
    if (err instanceof ApiError) return err.toResponse()
    logger.error("sponsorship evidence upload failed", {
      spId,
      message: String(err),
    })
    return ApiError.internal(
      "evidence.server_error",
      "Upload failed. Try again.",
    ).toResponse()
  }
}
