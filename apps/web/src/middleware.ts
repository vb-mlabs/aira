import { NextResponse, type NextRequest } from "next/server"
import { env } from "@/config/env"

// CORS for /api/auth/* so the Expo web preview (port 8080 on Replit's dev
// domain) can hit the BetterAuth endpoints (port 5000 on the same domain).
// Same eTLD, different port = different origin in the browser, so requests
// preflight. BetterAuth's `trustedOrigins` only governs its CSRF check
// (cookie-based flows), not CORS response headers, so the middleware is the
// right enforcement point.
//
// EAS/production builds talk to the API from a native app and never trigger
// browser CORS, so this layer is dev-quality-of-life only — when
// REPLIT_DEV_DOMAIN is unset (prod, EAS) no origins are trusted and the
// middleware returns the request unchanged.
//
// See docs/template/TEMPLATE.md lessons #28, #29 + the mobile app's
// X-Client header in apps/mobile/lib/api/client.ts (the ALLOWED_HEADERS
// list below must include every header that buildHeaders sets).

const trustedOrigins = (() => {
  const domain = env.REPLIT_DEV_DOMAIN
  const replit = domain ? [`https://${domain}`, `https://${domain}:8080`] : []
  // Local-only dev: Playwright (and a developer driving the Expo web
  // preview directly via localhost) hits the API from these origins. Not
  // emitted in production builds — NODE_ENV is "production" on Vercel /
  // the standalone Next.js bundle, and the trust list is empty there.
  const local =
    env.NODE_ENV !== "production"
      ? ["http://localhost:8080", "http://127.0.0.1:8080"]
      : []
  return [...replit, ...local]
})()

const ALLOWED_METHODS = "GET, POST, OPTIONS"
// The mobile API client (apps/mobile/lib/api/client.ts:buildHeaders) sets
// these headers on every auth request. Keep this list in sync with that
// builder, or the browser will block the response with a CORS error like
// "Request header field x-client is not allowed by Access-Control-Allow-Headers".
const ALLOWED_HEADERS = "Authorization, Content-Type, Accept, X-Client, If-Modified-Since"
const MAX_AGE_SECONDS = "86400"

function applyCorsHeaders(headers: Headers, origin: string) {
  headers.set("Access-Control-Allow-Origin", origin)
  headers.set("Access-Control-Allow-Credentials", "true")
  headers.set("Vary", "Origin")
}

export function middleware(req: NextRequest) {
  const origin = req.headers.get("origin")
  const isTrusted = origin !== null && trustedOrigins.includes(origin)

  if (req.method === "OPTIONS") {
    const headers = new Headers()
    if (isTrusted) {
      applyCorsHeaders(headers, origin)
      headers.set("Access-Control-Allow-Methods", ALLOWED_METHODS)
      headers.set("Access-Control-Allow-Headers", ALLOWED_HEADERS)
      headers.set("Access-Control-Max-Age", MAX_AGE_SECONDS)
    }
    return new NextResponse(null, { status: 204, headers })
  }

  const res = NextResponse.next()
  if (isTrusted) {
    applyCorsHeaders(res.headers, origin)
  }
  return res
}

export const config = {
  matcher: ["/api/auth/:path*"],
}
