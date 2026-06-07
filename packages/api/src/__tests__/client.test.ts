// createApiClient — universal fetch wrapper contract.
//
// These tests pin the cross-platform behavior both web and mobile depend on:
// X-Client header, bearer attach, body encoding, 304 short-circuit,
// 401 → refresh-once → retry, ApiError mapping.

import { afterEach, describe, expect, it, vi } from "vitest"
import { ApiError } from "../errors"
import { createApiClient } from "../client"

type FetchMock = ReturnType<typeof vi.fn<typeof fetch>>

function makeOkResponse(body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json", ...headers },
  })
}

function makeErrorResponse(
  status: number,
  code: string,
  message: string,
  field?: string,
) {
  return new Response(
    JSON.stringify({ error: { code, message, ...(field ? { field } : {}) } }),
    { status, headers: { "Content-Type": "application/json" } },
  )
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe("createApiClient", () => {
  it("attaches X-Client header on every request", async () => {
    const fetchMock: FetchMock = vi.fn().mockResolvedValue(makeOkResponse({ ok: true }))
    const client = createApiClient({
      baseUrl: "https://example.test",
      clientId: "web",
      fetchImpl: fetchMock,
    })
    await client.get("/api/v1/ping")
    const req = fetchMock.mock.calls[0]?.[1] as RequestInit
    const headers = new Headers(req.headers)
    expect(headers.get("X-Client")).toBe("web")
  })

  it("attaches Authorization: Bearer when getAccessToken resolves a token", async () => {
    const fetchMock: FetchMock = vi.fn().mockResolvedValue(makeOkResponse({ ok: true }))
    const client = createApiClient({
      baseUrl: "",
      clientId: "mobile",
      getAccessToken: async () => "tok-123",
      fetchImpl: fetchMock,
    })
    await client.get("/api/v1/ping")
    const req = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(new Headers(req.headers).get("Authorization")).toBe("Bearer tok-123")
  })

  it("omits Authorization when getAccessToken returns null", async () => {
    const fetchMock: FetchMock = vi.fn().mockResolvedValue(makeOkResponse({ ok: true }))
    const client = createApiClient({
      baseUrl: "",
      clientId: "mobile",
      getAccessToken: async () => null,
      fetchImpl: fetchMock,
    })
    await client.get("/api/v1/ping")
    const req = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(new Headers(req.headers).has("Authorization")).toBe(false)
  })

  it("JSON-encodes object bodies and sets Content-Type", async () => {
    const fetchMock: FetchMock = vi.fn().mockResolvedValue(makeOkResponse({ ok: true }))
    const client = createApiClient({
      baseUrl: "",
      clientId: "web",
      fetchImpl: fetchMock,
    })
    await client.post("/api/v1/echo", { hello: "world" })
    const req = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(new Headers(req.headers).get("Content-Type")).toBe("application/json")
    expect(req.body).toBe(JSON.stringify({ hello: "world" }))
  })

  it("does not set Content-Type for FormData bodies (browser picks the boundary)", async () => {
    const fetchMock: FetchMock = vi.fn().mockResolvedValue(makeOkResponse({ ok: true }))
    const client = createApiClient({
      baseUrl: "",
      clientId: "web",
      fetchImpl: fetchMock,
    })
    const form = new FormData()
    form.set("name", "Alice")
    await client.post("/api/v1/avatar", form)
    const req = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(new Headers(req.headers).has("Content-Type")).toBe(false)
    expect(req.body).toBeInstanceOf(FormData)
  })

  it("returns notModified: true on 304 without throwing", async () => {
    const fetchMock: FetchMock = vi.fn().mockResolvedValue(
      new Response(null, { status: 304, headers: { "Last-Modified": "Wed, 01 Jan 2025 00:00:00 GMT" } }),
    )
    const client = createApiClient({
      baseUrl: "",
      clientId: "web",
      fetchImpl: fetchMock,
    })
    const res = await client.get("/api/v1/notifications/unread-count", {
      ifModifiedSince: "Wed, 01 Jan 2025 00:00:00 GMT",
    })
    expect(res.notModified).toBe(true)
    expect(res.status).toBe(304)
    expect(res.data).toBeNull()
    expect(res.lastModified).toBe("Wed, 01 Jan 2025 00:00:00 GMT")
    const req = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(new Headers(req.headers).get("If-Modified-Since")).toBe(
      "Wed, 01 Jan 2025 00:00:00 GMT",
    )
  })

  it("retries once after 401 when refreshOnce resolves a new token", async () => {
    const fetchMock: FetchMock = vi
      .fn()
      .mockResolvedValueOnce(makeErrorResponse(401, "auth.unauthenticated", "Sign in required"))
      .mockResolvedValueOnce(makeOkResponse({ ok: true }))
    const refreshOnce = vi.fn(async () => "tok-fresh")
    let tokenAttempt = 0
    const client = createApiClient({
      baseUrl: "",
      clientId: "mobile",
      getAccessToken: async () => (tokenAttempt++ === 0 ? "tok-stale" : "tok-fresh"),
      refreshOnce,
      fetchImpl: fetchMock,
    })
    const res = await client.get<{ ok: true }>("/api/v1/me")
    expect(refreshOnce).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(res.data).toEqual({ ok: true })
  })

  it("gives up after a single retry (no infinite loop on stale-then-still-401)", async () => {
    const fetchMock: FetchMock = vi
      .fn()
      .mockResolvedValue(makeErrorResponse(401, "auth.unauthenticated", "Sign in required"))
    const refreshOnce = vi.fn(async () => "tok-fresh")
    const client = createApiClient({
      baseUrl: "",
      clientId: "mobile",
      getAccessToken: async () => "tok-stale",
      refreshOnce,
      fetchImpl: fetchMock,
    })
    await expect(client.get("/api/v1/me")).rejects.toBeInstanceOf(ApiError)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("does not refresh when refreshOnce is omitted (web cookies path)", async () => {
    const fetchMock: FetchMock = vi
      .fn()
      .mockResolvedValue(makeErrorResponse(401, "auth.unauthenticated", "Sign in required"))
    const client = createApiClient({
      baseUrl: "",
      clientId: "web",
      fetchImpl: fetchMock,
    })
    await expect(client.get("/api/v1/me")).rejects.toBeInstanceOf(ApiError)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("throws ApiError with parsed code/message/field on non-2xx", async () => {
    const fetchMock: FetchMock = vi
      .fn()
      .mockResolvedValue(makeErrorResponse(400, "validation.input", "Name is required", "name"))
    const client = createApiClient({
      baseUrl: "",
      clientId: "web",
      fetchImpl: fetchMock,
    })
    try {
      await client.post("/api/v1/profile", { name: "" })
      throw new Error("expected throw")
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError)
      const apiErr = err as ApiError
      expect(apiErr.status).toBe(400)
      expect(apiErr.code).toBe("validation.input")
      expect(apiErr.message).toBe("Name is required")
      expect(apiErr.field).toBe("name")
    }
  })

  it("falls back to a generic ApiError when the error body is malformed", async () => {
    const fetchMock: FetchMock = vi.fn().mockResolvedValue(
      new Response("<html>nope</html>", { status: 500, headers: { "Content-Type": "text/html" } }),
    )
    const client = createApiClient({
      baseUrl: "",
      clientId: "web",
      fetchImpl: fetchMock,
    })
    await expect(client.get("/api/v1/ping")).rejects.toMatchObject({
      status: 500,
      code: "unknown",
    })
  })

  it("post() throws empty_response if the server returns 204", async () => {
    // post() expects a body. A 204 violates that contract, surfacing as an
    // ApiError (rather than silently returning null) so callers don't act on
    // the absence of data.
    const fetchMock: FetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }))
    const client = createApiClient({
      baseUrl: "",
      clientId: "web",
      fetchImpl: fetchMock,
    })
    await expect(client.post("/api/v1/echo", {})).rejects.toMatchObject({
      status: 204,
      code: "empty_response",
    })
  })

  it("delete() succeeds on 204", async () => {
    const fetchMock: FetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }))
    const client = createApiClient({
      baseUrl: "",
      clientId: "web",
      fetchImpl: fetchMock,
    })
    await expect(client.delete("/api/v1/profile")).resolves.toBeUndefined()
  })

  it("expands query params with skipped undefined", async () => {
    const fetchMock: FetchMock = vi.fn().mockResolvedValue(makeOkResponse({ items: [] }))
    const client = createApiClient({
      baseUrl: "https://example.test",
      clientId: "web",
      fetchImpl: fetchMock,
    })
    await client.get("/api/v1/businesses", {
      query: { featured: true, category: "shopping", limit: undefined },
    })
    const url = fetchMock.mock.calls[0]?.[0] as string
    expect(url).toContain("featured=true")
    expect(url).toContain("category=shopping")
    expect(url).not.toContain("limit=")
  })
})
