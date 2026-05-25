// Avatar upload pipeline. Pure server module — no Next.js bindings.
// The route handler (src/app/api/avatar/route.ts) is the only caller.
//
// Why a separate file: lets the pipeline be unit-tested without booting a
// Next.js route. The pipeline takes bytes in and a URL out; the route handles
// HTTP framing.

import "server-only"
import { eq } from "drizzle-orm"
import sharp from "sharp"
import { db } from "@/lib/db"
import { user as userTable } from "@mlabs/db/schema"
import { audit, type AuditClient } from "@/lib/db/audit"
import { logger } from "@/lib/logger"
import { storage } from "@/lib/storage"

export const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"] as const
export const MAX_BYTES = 5 * 1024 * 1024 // 5 MB
export const OUTPUT_SIZE = 256

export type AvatarErrorCode =
  | "invalid_mime"
  | "too_large"
  | "decode_failed"

export class AvatarError extends Error {
  constructor(public code: AvatarErrorCode, message: string) {
    super(message)
  }
}

export async function processAndStoreAvatar(args: {
  userId: string
  previousImageUrl: string | null
  bytes: Buffer
  contentType: string
  client?: AuditClient
}): Promise<{ url: string }> {
  if (!ALLOWED_MIME.includes(args.contentType as (typeof ALLOWED_MIME)[number])) {
    throw new AvatarError(
      "invalid_mime",
      "Upload a JPEG, PNG, or WebP image.",
    )
  }
  if (args.bytes.length > MAX_BYTES) {
    throw new AvatarError(
      "too_large",
      "That image is too large. Max 5 MB.",
    )
  }

  let resized: Buffer
  try {
    resized = await sharp(args.bytes)
      .rotate() // honour EXIF orientation before stripping it
      .resize(OUTPUT_SIZE, OUTPUT_SIZE, { fit: "cover", position: "centre" })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer()
  } catch (err) {
    logger.warn("avatar decode failed", {
      userId: args.userId,
      message: String(err),
    })
    throw new AvatarError(
      "decode_failed",
      "We couldn't read that image. Try a different file.",
    )
  }

  // Timestamp in the key so CDNs / proxies don't serve a stale avatar after
  // replacement.
  const key = `avatars/${args.userId}-${Date.now()}.jpg`

  const { url } = await storage.upload({
    key,
    body: resized,
    contentType: "image/jpeg",
  })

  await audit({
    actorId: args.userId,
    action: "user.avatar_changed",
    target: { type: "user", id: args.userId },
    meta: { kind: "user.avatar_changed" },
    client: args.client,
  })

  await db
    .update(userTable)
    .set({ image: url })
    .where(eq(userTable.id, args.userId))

  // Best-effort cleanup of the prior avatar. We swallow the error so a stale
  // file in storage never blocks a successful upload from the user's view.
  if (args.previousImageUrl) {
    const oldKey = avatarKeyFromUrl(args.previousImageUrl)
    if (oldKey && oldKey !== key) {
      storage.delete(oldKey).catch((err) => {
        logger.warn("old avatar delete failed", {
          userId: args.userId,
          key: oldKey,
          message: String(err),
        })
      })
    }
  }

  return { url }
}

export async function removeAvatar(args: {
  userId: string
  previousImageUrl: string | null
  client?: AuditClient
}): Promise<void> {
  await audit({
    actorId: args.userId,
    action: "user.avatar_removed",
    target: { type: "user", id: args.userId },
    meta: { kind: "user.avatar_removed" },
    client: args.client,
  })

  await db
    .update(userTable)
    .set({ image: null })
    .where(eq(userTable.id, args.userId))

  if (args.previousImageUrl) {
    const key = avatarKeyFromUrl(args.previousImageUrl)
    if (key) {
      try {
        await storage.delete(key)
      } catch (err) {
        logger.warn("avatar delete failed", {
          userId: args.userId,
          key,
          message: String(err),
        })
      }
    }
  }
}

function avatarKeyFromUrl(url: string): string | null {
  const prefix = "/api/storage/"
  if (!url.startsWith(prefix)) return null
  return url.slice(prefix.length)
}
