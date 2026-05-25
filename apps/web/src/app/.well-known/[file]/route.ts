// Serves the two universal-link manifests at:
//   GET /.well-known/apple-app-site-association
//   GET /.well-known/assetlinks.json
//
// Both Apple and Google REQUIRE `Content-Type: application/json` for the
// link-verifier to accept the file. Next.js's default static-file serving
// from /public would not set the right content-type for the extensionless
// Apple file, so we serve them through a route handler instead.
//
// The placeholder values inside the JSON are filled in per-fork by the
// `new-project` skill (Phase 6). Until then they remain as literal
// `{{APPLE_TEAM_ID}}.{{IOS_BUNDLE_ID}}` and `{{ANDROID_PACKAGE}}` etc.
//
// 404 anything other than the two known filenames — preserves the
// `.well-known` namespace for any future static files without leaking
// directory listings.

import { NextResponse } from "next/server"
import { readFile } from "node:fs/promises"
import path from "node:path"

export const runtime = "nodejs"
// Manifests are static placeholders today; allow caching for a short window so
// link verifiers don't hammer the route.
export const revalidate = 300

const ALLOWED = new Set(["apple-app-site-association", "assetlinks.json"])

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ file: string }> },
) {
  const { file } = await ctx.params

  if (!ALLOWED.has(file)) {
    return new NextResponse("Not Found", { status: 404 })
  }

  // Read from /public/.well-known/<file>. Resolved against process.cwd() —
  // Next.js runs route handlers from the project root.
  const fullPath = path.join(process.cwd(), "public", ".well-known", file)

  let body: string
  try {
    body = await readFile(fullPath, "utf8")
  } catch {
    // File missing from /public (e.g. fork removed it). Surface as 404 rather
    // than 500 so link verifiers don't retry against a broken state.
    return new NextResponse("Not Found", { status: 404 })
  }

  return new NextResponse(body, {
    status: 200,
    headers: {
      "content-type": "application/json",
      // 5 minutes — link verifiers (apple/google) re-fetch on their own
      // schedule (hours), so this is mostly an in-flight dedupe.
      "cache-control": "public, max-age=300, s-maxage=300",
    },
  })
}
