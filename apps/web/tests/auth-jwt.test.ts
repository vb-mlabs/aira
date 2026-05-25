// @vitest-environment node
//
// Lane A — JWT helpers + Phase 5.5 bearer auth path.
//
// Covers:
//  - signAccessToken / verifyAccessToken happy path
//  - rejects tampered, expired, and wrong-issuer JWTs
//  - extractBearerToken parses + handles malformed headers
//  - getSession picks JWT over cookie when both are present
//  - getSession falls through to Better Auth when JWT is invalid (regression)
//
// Runs in the node environment (not jsdom) — jose requires Node's native
// Uint8Array realm, which jsdom polyfills differently.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/config/env", () => ({
  env: {
    BETTER_AUTH_SECRET: "test-secret-32-bytes-long-enough!!",
    BETTER_AUTH_URL: "http://localhost:3000",
    NODE_ENV: "test",
    INITIAL_ADMIN_EMAIL: undefined,
  },
}))

// Mock Better Auth so we don't boot Drizzle/Postgres in unit tests.
const mockGetSession = vi.fn()
vi.mock("@/lib/auth", () => ({
  auth: {
    api: { getSession: (...args: unknown[]) => mockGetSession(...args) },
  },
}))

// Mock next/headers — return a Headers built from whatever the test sets.
const headersStore = { current: new Headers() }
vi.mock("next/headers", () => ({
  headers: async () => headersStore.current,
}))

import {
  signAccessToken,
  verifyAccessToken,
  extractBearerToken,
} from "@/lib/auth/jwt"
import { getSession } from "@/lib/auth/server"
import { SignJWT } from "jose"

describe("extractBearerToken", () => {
  it("parses a well-formed Bearer header", () => {
    expect(extractBearerToken("Bearer abc.def.ghi")).toBe("abc.def.ghi")
  })

  it("is case-insensitive on the scheme", () => {
    expect(extractBearerToken("bearer xyz")).toBe("xyz")
    expect(extractBearerToken("BEARER xyz")).toBe("xyz")
  })

  it("returns null for missing/empty headers", () => {
    expect(extractBearerToken(null)).toBeNull()
    expect(extractBearerToken(undefined)).toBeNull()
    expect(extractBearerToken("")).toBeNull()
  })

  it("returns null for non-Bearer schemes", () => {
    expect(extractBearerToken("Basic abc")).toBeNull()
    expect(extractBearerToken("Token abc")).toBeNull()
  })

  it("returns null for Bearer with no token", () => {
    expect(extractBearerToken("Bearer ")).toBeNull()
    expect(extractBearerToken("Bearer")).toBeNull()
  })
})

describe("signAccessToken / verifyAccessToken", () => {
  const user = { id: "u_1", email: "alice@example.com", role: "user" }

  it("round-trips: signed JWT verifies and decodes to the user claims", async () => {
    const { token, expiresIn } = await signAccessToken(user)
    expect(typeof token).toBe("string")
    expect(token.split(".").length).toBe(3)
    expect(expiresIn).toBe(60 * 60) // 1h

    const payload = await verifyAccessToken(token)
    expect(payload).not.toBeNull()
    expect(payload?.sub).toBe(user.id)
    expect(payload?.email).toBe(user.email)
    expect(payload?.role).toBe(user.role)
    expect(payload?.iss).toBe("mlabs-mobile")
  })

  it("preserves the admin role claim", async () => {
    const { token } = await signAccessToken({ ...user, role: "admin" })
    const payload = await verifyAccessToken(token)
    expect(payload?.role).toBe("admin")
  })

  it("rejects a tampered signature", async () => {
    const { token } = await signAccessToken(user)
    const [h, p, sig] = token.split(".")
    // Flip the FIRST sig char (not the last): the trailing base64url char of an
    // HS256 sig only encodes 4 meaningful bits, so a last-char swap can decode
    // to an identical byte sequence and pass verification (~1/16 flake rate).
    const swap = sig[0] === "A" ? "B" : "A"
    const tampered = `${h}.${p}.${swap}${sig.slice(1)}`
    const payload = await verifyAccessToken(tampered)
    expect(payload).toBeNull()
  })

  it("rejects a JWT signed with a different secret", async () => {
    const wrongKey = new TextEncoder().encode("totally-different-secret-32-byte!")
    const foreignToken = await new SignJWT({ email: user.email, role: user.role })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(user.id)
      .setIssuer("mlabs-mobile")
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(wrongKey)
    const payload = await verifyAccessToken(foreignToken)
    expect(payload).toBeNull()
  })

  it("rejects a JWT with the wrong issuer (defense against token swap from other apps)", async () => {
    const secret = new TextEncoder().encode("test-secret-32-bytes-long-enough!!")
    const wrongIssuer = await new SignJWT({ email: user.email, role: user.role })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(user.id)
      .setIssuer("some-other-app")
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(secret)
    const payload = await verifyAccessToken(wrongIssuer)
    expect(payload).toBeNull()
  })

  it("rejects an expired JWT", async () => {
    const secret = new TextEncoder().encode("test-secret-32-bytes-long-enough!!")
    const expired = await new SignJWT({ email: user.email, role: user.role })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(user.id)
      .setIssuer("mlabs-mobile")
      .setIssuedAt(Math.floor(Date.now() / 1000) - 7200) // 2h ago
      .setExpirationTime(Math.floor(Date.now() / 1000) - 3600) // expired 1h ago
      .sign(secret)
    const payload = await verifyAccessToken(expired)
    expect(payload).toBeNull()
  })

  it("rejects malformed JWT strings", async () => {
    expect(await verifyAccessToken("not.a.jwt")).toBeNull()
    expect(await verifyAccessToken("only-one-segment")).toBeNull()
    expect(await verifyAccessToken("")).toBeNull()
  })
})

describe("getSession transport selection", () => {
  beforeEach(() => {
    headersStore.current = new Headers()
    mockGetSession.mockReset()
  })

  afterEach(() => {
    mockGetSession.mockReset()
  })

  it("uses JWT when a valid bearer JWT is present (no DB hit)", async () => {
    const { token } = await signAccessToken({
      id: "u_jwt",
      email: "jwt@example.com",
      role: "user",
    })
    headersStore.current = new Headers({ authorization: `Bearer ${token}` })

    const session = await getSession()
    expect(session?.user.id).toBe("u_jwt")
    expect(session?.user.email).toBe("jwt@example.com")
    // Better Auth was not consulted — JWT path short-circuits.
    expect(mockGetSession).not.toHaveBeenCalled()
  })

  it("falls through to Better Auth when bearer header is missing (cookie regression)", async () => {
    headersStore.current = new Headers({ cookie: "better-auth.session_token=xyz" })
    mockGetSession.mockResolvedValue({
      user: { id: "u_cookie", email: "c@x.com", role: "user" },
      session: { token: "xyz", userId: "u_cookie", expiresAt: new Date() },
    })

    const session = await getSession()
    expect(session?.user.id).toBe("u_cookie")
    expect(mockGetSession).toHaveBeenCalledTimes(1)
  })

  it("falls through to Better Auth when JWT is invalid (e.g. expired)", async () => {
    headersStore.current = new Headers({ authorization: "Bearer not.a.real.jwt" })
    mockGetSession.mockResolvedValue(null)

    const session = await getSession()
    expect(session).toBeNull()
    // Better Auth's bearer plugin attempted to resolve it as a session token
    // (returning null since it isn't one) — the call is the proof that we
    // fell through correctly.
    expect(mockGetSession).toHaveBeenCalledTimes(1)
  })

  it("falls through to Better Auth bearer when token is a session token (not a JWT)", async () => {
    // A session token shape from Better Auth would not parse as JWT; the
    // getSession helper should hand it off to better-auth which the bearer
    // plugin then converts to a session-cookie lookup.
    headersStore.current = new Headers({
      authorization: "Bearer xxx-session-token-yyy",
    })
    mockGetSession.mockResolvedValue({
      user: { id: "u_session_bearer", email: "sb@x.com", role: "user" },
      session: { token: "xxx-session-token-yyy", userId: "u_session_bearer", expiresAt: new Date() },
    })

    const session = await getSession()
    expect(session?.user.id).toBe("u_session_bearer")
    expect(mockGetSession).toHaveBeenCalledTimes(1)
  })
})
