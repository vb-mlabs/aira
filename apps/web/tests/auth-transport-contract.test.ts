// @vitest-environment node
//
// Lane A — transport contract test.
//
// Proves that a real /api/* route handler accepts all three transports:
//  - Cookie session (web — existing behavior, regression check)
//  - JWT bearer (mobile — Phase 5.5)
//  - Better Auth bearer-plugin session token (fallback bearer path)
//
// Uses /api/v1/notifications/unread-count as the representative GET handler.
// Phase 4 (Lane C) moved this route to call getSessionFromHeaders + the
// @mlabs/services notifications domain directly; the transport chain still
// lives inside src/lib/auth/server.ts::getSessionFromHeaders, so this test
// continues to exercise it end-to-end by letting that function run real.

import { describe, expect, it, vi, beforeEach } from "vitest"

vi.mock("@/config/env", () => ({
  env: {
    BETTER_AUTH_SECRET: "test-secret-32-bytes-long-enough!!",
    BETTER_AUTH_URL: "http://localhost:3000",
    NODE_ENV: "test",
  },
}))

// Mock Better Auth — represents the cookie-session AND bearer-plugin paths.
const mockBetterAuthGetSession = vi.fn()
vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: (...args: unknown[]) => mockBetterAuthGetSession(...args),
    },
  },
}))

// Mock the services layer so we don't need Postgres. The route calls
// getFreshness (sentinel value, irrelevant for the transport assertions
// here) then getUnreadCount (the count value the route returns).
const mockGetUnreadCount = vi.fn()
vi.mock("@mlabs/services", () => ({
  notifications: {
    getFreshness: vi.fn(async () => ({ ts: new Date(0) })),
    getUnreadCount: (...args: unknown[]) => mockGetUnreadCount(...args),
  },
}))

// db is touched at route module load via the @/lib/db shim's Proxy; we
// never actually call it (services are mocked).
vi.mock("@/lib/db", () => ({ db: {} }))

import { GET } from "@/app/api/v1/notifications/unread-count/route"
import { signAccessToken } from "@/lib/auth/jwt"

const mkRequest = (headers?: Record<string, string>) =>
  new Request("http://localhost:3000/api/v1/notifications/unread-count", {
    method: "GET",
    headers: headers ?? {},
  })

describe("Transport contract — /api/v1/notifications/unread-count GET", () => {
  beforeEach(() => {
    mockBetterAuthGetSession.mockReset()
    mockGetUnreadCount.mockReset()
  })

  it("[cookie] returns 200 with unread count when cookie session is valid (regression)", async () => {
    mockBetterAuthGetSession.mockResolvedValue({
      user: { id: "u_cookie", email: "c@x.com", role: "user" },
      session: {
        token: "valid-cookie-token",
        userId: "u_cookie",
        expiresAt: new Date(),
      },
    })
    mockGetUnreadCount.mockResolvedValue({ count: 7 })

    const res = await GET(
      mkRequest({ cookie: "better-auth.session_token=valid-cookie-token" }),
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { count: number }
    expect(body.count).toBe(7)
    // The service receives the (db, ctx, args) triple; assert the ctx
    // userId resolved through the cookie path.
    const ctx = mockGetUnreadCount.mock.calls[0]?.[1] as { userId: string }
    expect(ctx.userId).toBe("u_cookie")
  })

  it("[JWT bearer] returns 200 with unread count when valid JWT is sent in Authorization header", async () => {
    const { token } = await signAccessToken({
      id: "u_jwt",
      email: "j@x.com",
      role: "user",
    })
    // Better Auth should NEVER be consulted on the JWT path — stateless verify.
    mockGetUnreadCount.mockResolvedValue({ count: 3 })

    const res = await GET(mkRequest({ authorization: `Bearer ${token}` }))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { count: number }
    expect(body.count).toBe(3)
    const ctx = mockGetUnreadCount.mock.calls[0]?.[1] as { userId: string }
    expect(ctx.userId).toBe("u_jwt")
    expect(mockBetterAuthGetSession).not.toHaveBeenCalled()
  })

  it("[session-token bearer] falls through to Better Auth's bearer plugin", async () => {
    // A token that isn't a JWT (no 3 dotted segments / bad signature) → JWT path
    // returns null → fall-through to better-auth which the bearer plugin maps
    // to a session-row lookup.
    mockBetterAuthGetSession.mockResolvedValue({
      user: { id: "u_session", email: "s@x.com", role: "user" },
      session: {
        token: "sess_abc_long_random_string",
        userId: "u_session",
        expiresAt: new Date(),
      },
    })
    mockGetUnreadCount.mockResolvedValue({ count: 2 })

    const res = await GET(
      mkRequest({ authorization: "Bearer sess_abc_long_random_string" }),
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { count: number }
    expect(body.count).toBe(2)
    const ctx = mockGetUnreadCount.mock.calls[0]?.[1] as { userId: string }
    expect(ctx.userId).toBe("u_session")
    expect(mockBetterAuthGetSession).toHaveBeenCalledTimes(1)
  })

  it("[no auth] returns 401 when neither cookie nor bearer present", async () => {
    mockBetterAuthGetSession.mockResolvedValue(null)

    const res = await GET(mkRequest())
    expect(res.status).toBe(401)
    const body = (await res.json()) as { error: { code: string } }
    expect(body.error.code).toBe("auth.unauthenticated")
    expect(mockGetUnreadCount).not.toHaveBeenCalled()
  })

  it("[expired JWT] returns 401 (JWT verify fails, Better Auth bearer also returns null)", async () => {
    // Tampered JWT — verifyAccessToken returns null, falls through to Better
    // Auth which treats it as an unknown session token and returns null.
    mockBetterAuthGetSession.mockResolvedValue(null)

    const res = await GET(
      mkRequest({ authorization: "Bearer eyJ.tampered.signature" }),
    )
    expect(res.status).toBe(401)
  })
})
