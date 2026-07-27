import { describe, it, expect } from "vitest"
import { rewriteAuthEmailUrl } from "../rewrite-auth-email-url"

// Same behavioural contract as
// .mstack/debug/2026-07-27-1200-auth-emails-open-web/specs/repro.test.ts —
// but co-located with the code so future refactors of the auth hooks
// re-run against the same shape assertions.

// The Universal Link path patterns configured in
// apps/web/public/.well-known/apple-app-site-association.
const UNIVERSAL_LINK_PATH_PATTERNS = ["/verify*", "/reset-password*"] as const

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

describe("rewriteAuthEmailUrl — verify path", () => {
  it("rewrites /api/auth/verify-email → /verify-email and preserves the token", () => {
    const rewritten = rewriteAuthEmailUrl(
      "https://airabynisarga.com/api/auth/verify-email?token=abc123&callbackURL=/",
    )
    expect(rewritten).toBe(
      "https://airabynisarga.com/verify-email?token=abc123",
    )
  })

  it("emits a URL that satisfies iOS Universal Link /verify* pattern", () => {
    const rewritten = rewriteAuthEmailUrl(
      "https://airabynisarga.com/api/auth/verify-email?token=abc123&callbackURL=/",
    )
    expect(matchesUniversalLinkPattern(rewritten)).toBe(true)
  })

  it("drops the callbackURL param so the emailed URL is minimal", () => {
    const rewritten = new URL(
      rewriteAuthEmailUrl(
        "https://airabynisarga.com/api/auth/verify-email?token=abc123&callbackURL=/home",
      ),
    )
    expect(rewritten.searchParams.has("callbackURL")).toBe(false)
  })

  it("passes through when the verify URL has no token (defensive)", () => {
    const raw = "https://airabynisarga.com/api/auth/verify-email"
    expect(rewriteAuthEmailUrl(raw)).toBe(raw)
  })
})

describe("rewriteAuthEmailUrl — reset-password path", () => {
  it("rewrites /api/auth/reset-password/<token> → /reset-password?token=<token>", () => {
    const rewritten = rewriteAuthEmailUrl(
      "https://airabynisarga.com/api/auth/reset-password/xyz789?callbackURL=/reset-password",
    )
    expect(rewritten).toBe(
      "https://airabynisarga.com/reset-password?token=xyz789",
    )
  })

  it("emits a URL that satisfies iOS Universal Link /reset-password* pattern", () => {
    const rewritten = rewriteAuthEmailUrl(
      "https://airabynisarga.com/api/auth/reset-password/xyz789?callbackURL=/",
    )
    expect(matchesUniversalLinkPattern(rewritten)).toBe(true)
  })

  it("handles a hypothetical query-token variant (future-proofs against Better Auth shape changes)", () => {
    const rewritten = rewriteAuthEmailUrl(
      "https://airabynisarga.com/api/auth/reset-password?token=xyz789&callbackURL=/",
    )
    expect(rewritten).toBe(
      "https://airabynisarga.com/reset-password?token=xyz789",
    )
  })

  it("passes through when the reset URL has no token in path or query", () => {
    const raw = "https://airabynisarga.com/api/auth/reset-password"
    expect(rewriteAuthEmailUrl(raw)).toBe(raw)
  })
})

describe("rewriteAuthEmailUrl — passthrough / defensive", () => {
  it("passes an already-rewritten URL through unchanged (idempotent)", () => {
    const raw = "https://airabynisarga.com/verify-email?token=abc"
    expect(rewriteAuthEmailUrl(raw)).toBe(raw)
  })

  it("passes an unknown URL shape through unchanged", () => {
    const raw = "https://airabynisarga.com/some/other/path?token=abc"
    expect(rewriteAuthEmailUrl(raw)).toBe(raw)
  })

  it("passes non-URL input through unchanged (does not throw)", () => {
    expect(rewriteAuthEmailUrl("not-a-url")).toBe("not-a-url")
    expect(rewriteAuthEmailUrl("")).toBe("")
  })
})
