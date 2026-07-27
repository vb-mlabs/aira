import "server-only"

// URL rewriter for Better Auth's emailed verification / reset links.
//
// Problem: Better Auth's default URLs point at its own API-mounted
// paths (`<origin>/api/auth/verify-email?token=…&callbackURL=…` and
// `<origin>/api/auth/reset-password/<token>?callbackURL=…` — the
// second embeds the token in the path segment). Verified against
// node_modules/better-auth/dist/api/routes/{email-verification,password}.mjs
// on 2026-07-27:
//   - email-verification.mjs:29 →
//     `${baseURL}/verify-email?token=${token}&callbackURL=${callbackURL}`
//   - password.mjs:72 →
//     `${baseURL}/reset-password/${verificationToken}?callbackURL=${callbackURL}`
//
// iOS Universal Links in this project (apps/web/public/.well-known/
// apple-app-site-association) target the CLIENT-facing paths
// (`/verify*`, `/reset-password*`) — matched against URL path only,
// so `/api/auth/verify-email` misses (starts with `/api/`, not
// `/verify`). Tap on device → opens browser instead of app.
//
// This rewriter moves the URL to the client-facing path shape so the
// same emailed link works on both surfaces:
//   - On a phone with the app installed: Universal Link intercepts,
//     opens the mobile app to the corresponding screen. The mobile
//     screen picks the token off the query and posts to the same
//     Better Auth server endpoint to complete the flow.
//   - On any other device: the browser opens the client-facing web
//     page, which completes the flow via the Better Auth SDK client.
//
// Never touches Better Auth's own server routes or token verification;
// it only reshapes the URL string handed to the email template.

const API_PREFIX = "/api/auth"

/**
 * Reshape a Better Auth email URL into the client-facing form.
 *
 * Verify: `<origin>/api/auth/verify-email?token=xxx&callbackURL=…`
 *      → `<origin>/verify-email?token=xxx`
 * Reset:  `<origin>/api/auth/reset-password/xxx?callbackURL=…`
 *      → `<origin>/reset-password?token=xxx`
 *
 * URLs that don't match either shape (already rewritten, wildly
 * unexpected structure, non-URL input) pass through unchanged —
 * defensive so future Better Auth changes degrade gracefully instead
 * of throwing inside the send-email hook.
 */
export function rewriteAuthEmailUrl(rawUrl: string): string {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    return rawUrl
  }

  const { origin, pathname, searchParams } = parsed

  // Verify: token in the query string.
  if (pathname === `${API_PREFIX}/verify-email`) {
    const token = searchParams.get("token")
    if (!token) return rawUrl
    const next = new URL("/verify-email", origin)
    next.searchParams.set("token", token)
    return next.toString()
  }

  // Reset: token as the trailing PATH segment (Better Auth's
  // password.mjs:72 pattern). Also handle a hypothetical query-token
  // variant so a future Better Auth version that swaps shape doesn't
  // silently regress.
  if (pathname.startsWith(`${API_PREFIX}/reset-password`)) {
    const rest = pathname.slice(`${API_PREFIX}/reset-password`.length)
    // rest is either "" (query-token variant) or "/<token>" (path variant).
    const pathToken = rest.startsWith("/") ? rest.slice(1) : ""
    const token = pathToken || searchParams.get("token") || ""
    if (!token) return rawUrl
    const next = new URL("/reset-password", origin)
    next.searchParams.set("token", token)
    return next.toString()
  }

  return rawUrl
}
