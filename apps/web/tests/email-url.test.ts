// @vitest-environment node
//
// URL helper contract (C1). Email templates and Better Auth callbacks build
// URLs through here so:
//   - tokens with +, /, = are correctly URL-encoded
//   - mobile gets a custom-scheme deep link when EXPO_SCHEME is set
//   - web-only forks (no EXPO_SCHEME) still get a working email link
//
// We swap the env mock per describe block to cover both branches without
// reaching for process.env.

import { describe, expect, it, vi } from "vitest"

vi.mock("@/config/env", () => ({
  env: {
    BETTER_AUTH_URL: "https://example.com",
    EXPO_SCHEME: "mlabs",
    NODE_ENV: "test",
  },
}))

import { buildAppLinkUrl, buildAuthUrl } from "@/lib/email/url"

describe("buildAuthUrl", () => {
  it("composes the web URL against BETTER_AUTH_URL", () => {
    expect(buildAuthUrl("/verify-email")).toBe(
      "https://example.com/verify-email",
    )
  })

  it("prepends a leading slash when missing", () => {
    expect(buildAuthUrl("verify-email")).toBe(
      "https://example.com/verify-email",
    )
  })

  it("URL-encodes tricky token characters in params", () => {
    const url = buildAuthUrl("/reset-password", {
      token: "abc+def/ghi=",
    })
    // URLSearchParams uses + for spaces but encodes / and = as %2F %3D.
    expect(url).toContain("token=abc%2Bdef%2Fghi%3D")
    // Round-trips cleanly through URL.searchParams.get().
    const parsed = new URL(url)
    expect(parsed.searchParams.get("token")).toBe("abc+def/ghi=")
  })

  it("skips null/undefined params instead of stringifying them", () => {
    const url = buildAuthUrl("/x", { a: "1", b: null, c: undefined })
    expect(url).toBe("https://example.com/x?a=1")
  })

  it("handles numeric + boolean params (stringifies once)", () => {
    const url = buildAuthUrl("/x", { n: 7, ok: true })
    const parsed = new URL(url)
    expect(parsed.searchParams.get("n")).toBe("7")
    expect(parsed.searchParams.get("ok")).toBe("true")
  })
})

describe("buildAppLinkUrl with EXPO_SCHEME unset (web-only fork)", () => {
  it("falls back to buildAuthUrl so the email link still works", async () => {
    // Override the static env mock for this case. doMock+resetModules gives us
    // a clean re-import of the url module against a different env shape.
    vi.resetModules()
    vi.doMock("@/config/env", () => ({
      env: {
        BETTER_AUTH_URL: "https://example.com",
        NODE_ENV: "test",
        // EXPO_SCHEME intentionally undefined
      },
    }))
    const { buildAppLinkUrl: builder } = await import("@/lib/email/url")
    expect(builder("/reset", { token: "abc" })).toBe(
      "https://example.com/reset?token=abc",
    )
    // Restore for subsequent describe blocks in this file.
    vi.doUnmock("@/config/env")
    vi.resetModules()
  })
})

describe("buildAppLinkUrl with EXPO_SCHEME set", () => {
  it("returns a custom-scheme deep link", () => {
    expect(buildAppLinkUrl("/reset-password", { token: "abc" })).toBe(
      "mlabs://reset-password?token=abc",
    )
  })

  it("URL-encodes deep-link query params", () => {
    const url = buildAppLinkUrl("/verify", { token: "a/b+c=" })
    expect(url).toBe("mlabs://verify?token=a%2Fb%2Bc%3D")
  })

  it("strips a leading slash on the path component", () => {
    expect(buildAppLinkUrl("/x")).toBe("mlabs://x")
    expect(buildAppLinkUrl("x")).toBe("mlabs://x")
  })

  it("omits the question mark when there are no params", () => {
    expect(buildAppLinkUrl("/home")).toBe("mlabs://home")
  })
})
