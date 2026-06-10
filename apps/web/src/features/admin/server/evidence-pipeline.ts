import "server-only"

import sharp from "sharp"
import { storage } from "@/lib/storage"
import { logger } from "@/lib/logger"

export const EVIDENCE_ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const
export type EvidenceMime = (typeof EVIDENCE_ALLOWED_MIME)[number]

export const EVIDENCE_MAX_BYTES = 5 * 1024 * 1024 // 5 MB
export const EVIDENCE_IMAGE_SIZE = 1200

export type EvidencePipelineErrorCode = "invalid_mime" | "too_large" | "decode_failed"

export class EvidencePipelineError extends Error {
  constructor(
    public code: EvidencePipelineErrorCode,
    message: string,
  ) {
    super(message)
  }
}

export async function processAndStoreEvidence(args: {
  subscriptionId: string
  bytes: Buffer
  contentType: string
}): Promise<{ url: string }> {
  if (!EVIDENCE_ALLOWED_MIME.includes(args.contentType as EvidenceMime)) {
    throw new EvidencePipelineError(
      "invalid_mime",
      "Upload a JPEG, PNG, WebP, or PDF.",
    )
  }
  if (args.bytes.length > EVIDENCE_MAX_BYTES) {
    throw new EvidencePipelineError("too_large", "That file is too large. Max 5 MB.")
  }

  let body: Buffer
  let ext: string
  let finalContentType: string

  if (args.contentType === "application/pdf") {
    body = args.bytes
    ext = "pdf"
    finalContentType = "application/pdf"
  } else {
    try {
      body = await sharp(args.bytes)
        .rotate()
        .resize(EVIDENCE_IMAGE_SIZE, EVIDENCE_IMAGE_SIZE, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: 85, mozjpeg: true })
        .toBuffer()
    } catch (err) {
      logger.warn("evidence image decode failed", {
        subscriptionId: args.subscriptionId,
        message: String(err),
      })
      throw new EvidencePipelineError(
        "decode_failed",
        "We couldn't read that image. Try a different file.",
      )
    }
    ext = "jpg"
    finalContentType = "image/jpeg"
  }

  const key = `business-subscriptions/${args.subscriptionId}/${crypto.randomUUID()}.${ext}`
  const { url } = await storage.upload({ key, body, contentType: finalContentType })
  return { url }
}

export async function deleteEvidenceFile(url: string): Promise<void> {
  const key = evidenceKeyFromUrl(url)
  if (!key) return
  storage.delete(key).catch((err) => {
    logger.warn("evidence storage delete failed", { key, message: String(err) })
  })
}

function evidenceKeyFromUrl(url: string): string | null {
  const prefix = "/api/storage/"
  if (!url.startsWith(prefix)) return null
  return url.slice(prefix.length)
}
