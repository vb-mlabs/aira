// Storage proxy route — streams bytes from the active storage driver.
//
// v1 is unauthenticated: avatars (the only W4 storage user) are public by
// design. For private files (future feature: e.g. signal evidence in
// BetFrnd), wrap this handler with an authz check (requireUser, plus a
// per-key ownership lookup).
//
// Note: this is a workaround for Replit Object Storage not exposing public
// URLs. If we swap to a CDN-backed driver (Cloudinary, R2 with public bucket),
// storage.getUrl() returns the CDN URL directly and this route becomes dead
// code — safe to delete during the swap.

import { NextRequest, NextResponse } from "next/server"
import { ApiError } from "@mlabs/api"
import { storage } from "@/lib/storage"

interface RouteContext {
  params: Promise<{ key: string[] }>
}

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { key: keyParts } = await ctx.params
  const key = keyParts.map(decodeURIComponent).join("/")

  try {
    const { body, contentType } = await storage.download(key)
    const inferred = contentType ?? inferContentType(key)
    return new NextResponse(new Uint8Array(body), {
      status: 200,
      headers: {
        "Content-Type": inferred,
        // 24h cache; content is keyed (avatars include a hash), so changes
        // come with a new key.
        "Cache-Control": "public, max-age=86400",
      },
    })
  } catch {
    return ApiError.notFound("storage.not_found", "Not found").toResponse()
  }
}

function inferContentType(key: string): string {
  const ext = key.split(".").pop()?.toLowerCase() ?? ""
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    svg: "image/svg+xml",
    pdf: "application/pdf",
  }
  return map[ext] ?? "application/octet-stream"
}
