// @vitest-environment node
//
// Conditional GET (A5) on /api/v1/notifications/unread-count.
//
// The route reads users.notifications_updated_at (via
// notifications.getFreshness) and compares it to the caller's
// If-Modified-Since header (second precision). Three states under test:
//   1. 304 — server timestamp <= header → no body, short-circuits the count.
//   2. 200 — server timestamp > header (new notification) → full body.
//   3. cache miss — no header → unconditional 200 (regression for v1 web).

import { describe, expect, it, vi, beforeEach } from "vitest"

vi.mock("@/config/env", () => ({
  env: {
    BETTER_AUTH_SECRET: "test-secret-32-bytes-long-enough!!",
    BETTER_AUTH_URL: "http://localhost:3000",
    NODE_ENV: "test",
  },
}))

// Session resolver — always authenticated. The route reads via
// getSessionFromHeaders (the header-parameterised variant); the no-arg
// getSession() is kept exported for other consumers.
vi.mock("@/lib/auth/server", () => ({
  getSession: vi.fn(async () => ({
    user: { id: "u_1", email: "u@x.com", role: "user" },
    session: { token: "t", userId: "u_1", expiresAt: new Date() },
  })),
  getSessionFromHeaders: vi.fn(async () => ({
    user: { id: "u_1", email: "u@x.com", role: "user" },
    session: { token: "t", userId: "u_1", expiresAt: new Date() },
  })),
}))

const tsHolder: { value: Date | null } = { value: null }
const mockGetUnreadCount = vi.fn()
vi.mock("@mlabs/services", () => ({
  notifications: {
    getFreshness: vi.fn(async () => ({ ts: tsHolder.value })),
    getUnreadCount: (...args: unknown[]) => mockGetUnreadCount(...args),
  },
}))

// @/lib/db is referenced at route module load. We never actually call it
// (the service is mocked) so an empty stub is enough.
vi.mock("@/lib/db", () => ({ db: {} }))

import { GET } from "@/app/api/v1/notifications/unread-count/route"

const mkRequest = (headers: Record<string, string> = {}) =>
  new Request("http://localhost:3000/api/v1/notifications/unread-count", {
    method: "GET",
    headers,
  })

beforeEach(() => {
  mockGetUnreadCount.mockReset()
  tsHolder.value = null
})

describe("GET /api/v1/notifications/unread-count — conditional GET", () => {
  it("304 when server timestamp <= If-Modified-Since (no count query run)", async () => {
    const ts = new Date("2025-01-01T12:00:00Z")
    tsHolder.value = ts

    const res = await GET(
      mkRequest({ "if-modified-since": ts.toUTCString() }),
    )
    expect(res.status).toBe(304)
    expect(res.headers.get("Last-Modified")).toBe(ts.toUTCString())
    // Critical: the count service is NOT consulted when we short-circuit.
    // That's the whole point of the conditional GET (P1 / A5).
    expect(mockGetUnreadCount).not.toHaveBeenCalled()
  })

  it("200 with body when server timestamp is newer than If-Modified-Since", async () => {
    const ts = new Date("2025-01-01T12:00:30Z")
    tsHolder.value = ts
    mockGetUnreadCount.mockResolvedValue({ count: 4 })

    const res = await GET(
      mkRequest({
        "if-modified-since": new Date("2025-01-01T12:00:00Z").toUTCString(),
      }),
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { count: number }
    expect(body.count).toBe(4)
    expect(res.headers.get("Last-Modified")).toBe(ts.toUTCString())
    expect(mockGetUnreadCount).toHaveBeenCalled()
  })

  it("200 unconditional when no If-Modified-Since header (cache miss / first poll)", async () => {
    const ts = new Date("2025-02-01T00:00:00Z")
    tsHolder.value = ts
    mockGetUnreadCount.mockResolvedValue({ count: 0 })

    const res = await GET(mkRequest())
    expect(res.status).toBe(200)
    const body = (await res.json()) as { count: number }
    expect(body.count).toBe(0)
    // Last-Modified is still emitted so the *next* poll can branch on it.
    expect(res.headers.get("Last-Modified")).toBe(ts.toUTCString())
  })

  it("200 when the header is unparseable (treat as missing, don't crash)", async () => {
    tsHolder.value = new Date("2025-02-01T00:00:00Z")
    mockGetUnreadCount.mockResolvedValue({ count: 2 })

    const res = await GET(mkRequest({ "if-modified-since": "not-a-date" }))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { count: number }
    expect(body.count).toBe(2)
  })
})
