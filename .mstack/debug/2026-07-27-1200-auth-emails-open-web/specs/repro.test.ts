// Failing repro for the auth-emails-open-web bug.
//
// Symptom (user report): after signing up on mobile, the verify email
// link opens the browser and lands the user on the web landing page —
// never returning them to the mobile app. Identical failure mode for
// the password-reset email.
//
// Cause (verified below): the URL Better Auth emits for both the verify
// AND the reset-password flow starts with /api/auth/… (`baseURL` is
// Better Auth's mounted API prefix). iOS Universal Links path patterns
// (`/verify*`, `/reset-password*`) are matched against the URL PATH,
// which starts with `/api/`, so the pattern never matches. The link
// opens in Safari and completes on the web.
//
// This spec pins the cause by:
//   1. Faking Better Auth's exact URL shape (verified against
//      node_modules/better-auth/dist/api/routes/{email-verification,password}.mjs).
//   2. Piping it through the CURRENT hook logic (verbatim
//      passthrough — the shape today).
//   3. Asserting the emailed URL's path DOES satisfy the iOS
//      Universal Link patterns.
// Today's output fails the assertion because /api/auth/verify-email
// does not start with /verify, and /api/auth/reset-password/... does
// not start with /reset-password.
//
// Once the fix lands (a URL rewriter in the two Better Auth hooks
// AND sendChangeEmailConfirmation), the emailed path becomes
// /verify-email or /reset-password and the assertion passes.
//
// Run (from repo root):
//   node_modules/.bin/vitest run \
//     --dir .mstack/debug/2026-07-27-1200-auth-emails-open-web/specs

import { describe, it, expect } from "vitest"

// The exact URL Better Auth constructs today, per node_modules/better-auth
// source (verified 2026-07-27):
//   - email-verification.mjs:29
//     `${ctx.context.baseURL}/verify-email?token=${token}&callbackURL=${callbackURL}`
//   - password.mjs:72
//     `${ctx.context.baseURL}/reset-password/${verificationToken}?callbackURL=${callbackURL}`
// `baseURL` resolves to `<host>/api/auth` (Better Auth's mounted path).
const BETTER_AUTH_VERIFY_URL =
  "https://airabynisarga.com/api/auth/verify-email?token=abc123&callbackURL=/"
const BETTER_AUTH_RESET_URL =
  "https://airabynisarga.com/api/auth/reset-password/xyz789?callbackURL=/reset-password"

// The Universal Link path patterns configured in
// apps/web/public/.well-known/apple-app-site-association.
// (`*` is Apple's substring glob — matches the rest of the path.)
const UNIVERSAL_LINK_PATH_PATTERNS = ["/verify*", "/reset-password*"] as const

/**
 * Does the URL's PATH match at least one Universal Link pattern?
 * Query string is ignored (Apple matches on PATH only).
 */
function matchesUniversalLinkPattern(rawUrl: string): boolean {
  const u = new URL(rawUrl)
  const path = u.pathname
  return UNIVERSAL_LINK_PATH_PATTERNS.some((pat) => {
    if (pat.endsWith("*")) {
      const prefix = pat.slice(0, -1)
      return path.startsWith(prefix)
    }
    return path === pat
  })
}

/**
 * The CURRENT verify hook body from packages/auth/src/server.ts:122
 * (passthrough). Once the fix lands, this helper's role is replaced
 * by a URL rewriter that produces a Universal-Link-friendly path.
 */
function currentVerifyHookEmittedUrl(rawUrl: string): string {
  return rawUrl
}

/**
 * The CURRENT reset hook body from packages/auth/src/server.ts:110
 * (also passthrough). Same story.
 */
function currentResetHookEmittedUrl(rawUrl: string): string {
  return rawUrl
}

describe("emailed auth URLs must match iOS Universal Link path patterns", () => {
  it("verify: emailed URL starts with /verify (Universal Link opens the app)", () => {
    const emitted = currentVerifyHookEmittedUrl(BETTER_AUTH_VERIFY_URL)
    // The cause: Better Auth's default URL path is
    // /api/auth/verify-email — starts with /api/, so the /verify*
    // pattern misses. This assertion FAILS today, matching the
    // user-reported symptom (email opens web, not app).
    expect(matchesUniversalLinkPattern(emitted)).toBe(true)
  })

  it("reset: emailed URL starts with /reset-password (Universal Link opens the app)", () => {
    const emitted = currentResetHookEmittedUrl(BETTER_AUTH_RESET_URL)
    expect(matchesUniversalLinkPattern(emitted)).toBe(true)
  })
})

describe("Universal Link path matcher (helper sanity)", () => {
  it("matches /verify-email against /verify*", () => {
    expect(
      matchesUniversalLinkPattern(
        "https://airabynisarga.com/verify-email?token=abc",
      ),
    ).toBe(true)
  })

  it("matches /reset-password against /reset-password*", () => {
    expect(
      matchesUniversalLinkPattern(
        "https://airabynisarga.com/reset-password?token=abc",
      ),
    ).toBe(true)
  })

  it("does NOT match /api/auth/verify-email (the current shape)", () => {
    expect(
      matchesUniversalLinkPattern(
        "https://airabynisarga.com/api/auth/verify-email?token=abc",
      ),
    ).toBe(false)
  })

  it("does NOT match /api/auth/reset-password/<token> (the current shape)", () => {
    expect(
      matchesUniversalLinkPattern(
        "https://airabynisarga.com/api/auth/reset-password/xyz?callbackURL=/",
      ),
    ).toBe(false)
  })
})
