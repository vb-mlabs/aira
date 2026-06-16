// @vitest-environment node
//
// Contract test for GET /api/v1/businesses/count. The route hosts the
// countActiveBusinessesOp; the op's permission gate + Zod output schema
// are the contract. Mirrors the lightweight mock-and-assert style of
// conditional-get-notifications.test.ts.

import { describe, expect, it, vi, beforeEach } from "vitest"

vi.mock("@/config/env", () => ({
  env: {
    BETTER_AUTH_SECRET: "test-secret-32-bytes-long-enough!!",
    BETTER_AUTH_URL: "http://localhost:3000",
    NODE_ENV: "test",
  },
}))

// Session resolver — toggled per test via the holder below.
const sessionHolder: {
  value: { user: { id: string; email: string; role: string } } | null
} = { value: null }
vi.mock("@/lib/auth/server", () => ({
  getSession: vi.fn(async () => sessionHolder.value),
  getSessionFromHeaders: vi.fn(async () => sessionHolder.value),
}))

const mockCountActiveBusinesses = vi.fn()
vi.mock("@aira/services", () => ({
  businesses: {
    countActiveBusinesses: (...args: unknown[]) =>
      mockCountActiveBusinesses(...args),
  },
}))

vi.mock("@/lib/db", () => ({ db: { __tag: "fakedb" } }))

import { GET } from "@/app/api/v1/businesses/count/route"

const mkRequest = (headers: Record<string, string> = {}) =>
  new Request("http://localhost:3000/api/v1/businesses/count", {
    method: "GET",
    headers,
  })

beforeEach(() => {
  mockCountActiveBusinesses.mockReset()
  sessionHolder.value = null
})

describe("GET /api/v1/businesses/count", () => {
  it("200 with { count } for a signed-in user", async () => {
    sessionHolder.value = {
      user: { id: "u_1", email: "u@x.com", role: "user" },
    }
    mockCountActiveBusinesses.mockResolvedValue(42)

    const res = await GET(mkRequest())
    expect(res.status).toBe(200)
    const body = (await res.json()) as { count: number }
    expect(body.count).toBe(42)
    expect(mockCountActiveBusinesses).toHaveBeenCalledTimes(1)
  })

  it("401 when unauthenticated", async () => {
    sessionHolder.value = null
    const res = await GET(mkRequest())
    expect(res.status).toBe(401)
    expect(mockCountActiveBusinesses).not.toHaveBeenCalled()
  })

  it("validates the count is a non-negative integer (output contract)", async () => {
    sessionHolder.value = {
      user: { id: "u_1", email: "u@x.com", role: "user" },
    }
    // Service returns 0 (empty directory) — should pass the schema.
    mockCountActiveBusinesses.mockResolvedValue(0)
    const res = await GET(mkRequest())
    expect(res.status).toBe(200)
    const body = (await res.json()) as { count: number }
    expect(body.count).toBe(0)
  })
})
