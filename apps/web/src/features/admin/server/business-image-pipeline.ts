// Business gallery image upload pipeline.
//
// Accepts raw bytes, resizes to 1200×800 cover JPEG, uploads to object
// storage under businesses/<businessId>/<uuid>.jpg, and persists the row
// via the businesses service. The route handler owns HTTP framing; this
// module owns the transform + store contract.

import "server-only"

import sharp from "sharp"
import { businesses as businessesService } from "@aira/services"
import { db } from "@/lib/db"
import { storage } from "@/lib/storage"
import { logger } from "@/lib/logger"

export const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"] as const
export const MAX_BYTES = 8 * 1024 * 1024 // 8 MB
export const OUTPUT_WIDTH = 1200
export const OUTPUT_HEIGHT = 800

export type ImagePipelineErrorCode =
  | "invalid_mime"
  | "too_large"
  | "decode_failed"

export class ImagePipelineError extends Error {
  constructor(
    public code: ImagePipelineErrorCode,
    message: string,
  ) {
    super(message)
  }
}

export async function processAndStoreBusinessImage(args: {
  businessId: string
  bytes: Buffer
  contentType: string
}): Promise<{ image: Awaited<ReturnType<typeof businessesService.addBusinessImage>> }> {
  if (!ALLOWED_MIME.includes(args.contentType as (typeof ALLOWED_MIME)[number])) {
    throw new ImagePipelineError("invalid_mime", "Upload a JPEG, PNG, or WebP image.")
  }
  if (args.bytes.length > MAX_BYTES) {
    throw new ImagePipelineError("too_large", "That image is too large. Max 8 MB.")
  }

  let resized: Buffer
  try {
    resized = await sharp(args.bytes)
      .rotate()
      .resize(OUTPUT_WIDTH, OUTPUT_HEIGHT, { fit: "cover", position: "centre" })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer()
  } catch (err) {
    logger.warn("business image decode failed", {
      businessId: args.businessId,
      message: String(err),
    })
    throw new ImagePipelineError("decode_failed", "We couldn't read that image. Try a different file.")
  }

  const key = `businesses/${args.businessId}/${crypto.randomUUID()}.jpg`
  const { url } = await storage.upload({
    key,
    body: resized,
    contentType: "image/jpeg",
  })

  const image = await businessesService.addBusinessImage(db, args.businessId, url)

  return { image }
}

/** Removes the image row and best-effort deletes the stored object. */
export async function deleteBusinessImage(args: {
  imageId: string
}): Promise<void> {
  const url = await businessesService.removeBusinessImage(db, args.imageId)
  const key = businessImageKeyFromUrl(url)
  if (key) {
    storage.delete(key).catch((err) => {
      logger.warn("business image storage delete failed", {
        imageId: args.imageId,
        key,
        message: String(err),
      })
    })
  }
}

function businessImageKeyFromUrl(url: string): string | null {
  const prefix = "/api/storage/"
  if (!url.startsWith(prefix)) return null
  return url.slice(prefix.length)
}
