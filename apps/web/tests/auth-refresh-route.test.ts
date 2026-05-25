// @vitest-environment node
//
// Lane A — integration test for POST /api/auth/refresh.
//
// Covers:
//  - 200 with JWT when caller has a valid session
//  - 401 when no session (cookie or bearer absent)
//  - 403 when user is banned (refresh denied — see ban-propagation flow)
//  - JWT payload carries the correct sub, email, role
//  - tokenType and expiresIn shape match what mobile expects

import { describe, expect, it, vi, beforeEach } from "vitest"

vi.mock("@/config/env", () => ({
  env: {
    BETTER_AUTH_SECRET: "test-secret-32-bytes-long-enough!!",
    BETTER_AUTH_URL: "http://localhost:3000",
    NODE_ENV: "test",
  },
}))

const mockGetSession = vi.fn()
vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: (...args: unknown[]) => mockGetSession(...args) } },
}))

import { POST } from "@/app/api/auth/refresh/route"
import { verifyAccessToken } from "@/lib/auth/jwt"

const mkRequest = (headers: Record<string, string> = {}) =>
  new Request("http://localhost:3000/api/auth/refresh", {
    method: "POST",
    headers,
  })

describe("POST /api/auth/refresh", () => {
  beforeEach(() => {
    mockGetSession.mockReset()
  })

  it("returns 200 + JWT when the session is valid", async () => {
    mockGetSession.mockResolvedValue({
      user: {
        id: "u_1",
        email: "alice@example.com",
        role: "user",
        banned_at: null,
      },
      session: { token: "sess_abc", userId: "u_1", expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000) },
    })

    const res = await POST(mkRequest({ authorization: "Bearer sess_abc" }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.tokenType).toBe("Bearer")
    expect(body.expiresIn).toBe(60 * 60)
    expect(typeof body.accessToken).toBe("string")

    const payload = await verifyAccessToken(body.accessToken)
    expect(payload?.sub).toBe("u_1")
    expect(payload?.email).toBe("alice@example.com")
    expect(payload?.role).toBe("user")
  })

  it("returns 200 with admin role preserved in JWT", async () => {
    mockGetSession.mockResolvedValue({
      user: {
        id: "u_admin",
        email: "admin@example.com",
        role: "admin",
        banned_at: null,
      },
      session: { token: "sess_admin", userId: "u_admin", expiresAt: new Date() },
    })

    const res = await POST(mkRequest({ authorization: "Bearer sess_admin" }))
    expect(res.status).toBe(200)
    const body = await res.json()
    const payload = await verifyAccessToken(body.accessToken)
    expect(payload?.role).toBe("admin")
  })

  it("returns 401 when no session is present", async () => {
    mockGetSession.mockResolvedValue(null)

    const res = await POST(mkRequest())
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error.code).toBe("auth.unauthenticated")
    expect(body.error.message).toMatch(/sign in/i)
  })

  it("returns 403 when the user is banned (ban-propagation gate)", async () => {
    mockGetSession.mockResolvedValue({
      user: {
        id: "u_banned",
        email: "banned@example.com",
        role: "user",
        banned_at: new Date(),
      },
      session: { token: "sess_banned", userId: "u_banned", expiresAt: new Date() },
    })

    const res = await POST(mkRequest({ authorization: "Bearer sess_banned" }))
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error.code).toBe("auth.account_banned")
    expect(body.error.message).toMatch(/ban/i)
  })

  it("defaults role to 'user' when the session user object lacks one", async () => {
    mockGetSession.mockResolvedValue({
      user: {
        id: "u_2",
        email: "norole@example.com",
        banned_at: null,
        // intentionally no role field
      },
      session: { token: "sess_norole", userId: "u_2", expiresAt: new Date() },
    })

    const res = await POST(mkRequest({ authorization: "Bearer sess_norole" }))
    expect(res.status).toBe(200)
    const body = await res.json()
    const payload = await verifyAccessToken(body.accessToken)
    expect(payload?.role).toBe("user")
  })
})
