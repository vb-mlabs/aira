// apiServerFetch — in-process op invocation contract.
//
// Pins the behavior RSCs rely on: cookies forward verbatim from the outer
// Next request scope into the synthetic op call, 401 + auth.idle_timeout
// surfaces as a redirect (not a thrown ApiError), other non-2xx surfaces
// as a thrown ApiError carrying the locked envelope, and path params
// reach the op via the route-context shape defineOperation expects.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ApiError } from "../errors"
import type { Operation, OperationSchema } from "../operation"
import {
  apiServerFetch,
  setApiServerFetchInternals,
} from "../server-fetch"

// Shape an OperationSchema by reading the .schema field from any op — we
// don't read it during tests so a minimal stub passes the type checker.
function fakeSchema<I, O>(name: string): OperationSchema<I, O> {
  return {
    name,
    input: { _input: undefined } as never,
    output: { _output: undefined } as never,
    permission: "user",
  }
}

function makeOp<I, O>(handler: (req: Request) => Promise<Response>): Operation<I, O> {
  return {
    schema: fakeSchema<I, O>("test.op"),
    runFromRequest: vi.fn(handler),
    // runFromAction is part of the Operation interface today; Task 16 deletes
    // it. Until then we satisfy the type with a throwing stub.
    runFromAction: vi.fn(async () => {
      throw new Error("runFromAction not used by apiServerFetch")
    }),
  } as unknown as Operation<I, O>
}

const recordedRedirects: string[] = []

beforeEach(() => {
  recordedRedirects.length = 0
  setApiServerFetchInternals({
    resolveHeaders: async () =>
      new Headers({
        cookie: "session=abc123",
        "x-request-id": "req-test",
      }),
    invokeRedirect: (async (path: string) => {
      recordedRedirects.push(path)
      throw new Error(`__test_redirect__:${path}`)
    }) as (path: string) => Promise<never>,
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("apiServerFetch", () => {
  it("returns parsed output on 200 success", async () => {
    const op = makeOp<{ q: string }, { items: string[] }>(async () =>
      Response.json({ items: ["a", "b"] }, { status: 200 }),
    )
    const res = await apiServerFetch(op, { input: { q: "x" } })
    expect(res.status).toBe(200)
    expect(res.data).toEqual({ items: ["a", "b"] })
    expect(res.notModified).toBe(false)
  })

  it("forwards cookies + x-request-id + x-client onto the synthetic Request", async () => {
    let captured: Request | null = null
    const op = makeOp<{}, { ok: true }>(async (req) => {
      captured = req
      return Response.json({ ok: true }, { status: 200 })
    })
    await apiServerFetch(op, { input: {} })
    expect(captured).toBeTruthy()
    const headers = (captured as unknown as Request).headers
    expect(headers.get("cookie")).toBe("session=abc123")
    expect(headers.get("x-request-id")).toBe("req-test")
    expect(headers.get("x-client")).toBe("web")
    expect(headers.get("content-type")).toBe("application/json")
  })

  it("encodes input as a JSON POST body so the op's body-parser path fires", async () => {
    let captured: Request | null = null
    const op = makeOp<{ category: string }, { ok: true }>(async (req) => {
      captured = req
      return Response.json({ ok: true }, { status: 200 })
    })
    await apiServerFetch(op, { input: { category: "shopping" } })
    expect((captured as unknown as Request).method).toBe("POST")
    const body = await (captured as unknown as Request).json()
    expect(body).toEqual({ category: "shopping" })
  })

  it("passes pathParams via the route-context shape defineOperation reads", async () => {
    let receivedCtx: { params?: Promise<Record<string, string | string[]>> } | undefined
    const op = makeOp<{}, { id: string }>(async (_req) => {
      // defineOperation merges params onto the input. The helper handler
      // here just echoes whatever we received via the second arg.
      return Response.json({ id: "captured-elsewhere" }, { status: 200 })
    })
    // Force runFromRequest's mock to accept and forward the second arg
    op.runFromRequest = vi.fn(async (_req, ctx) => {
      receivedCtx = ctx as typeof receivedCtx
      return Response.json({ id: "captured" }, { status: 200 })
    })
    await apiServerFetch(op, { pathParams: { id: "biz-42" } })
    expect(receivedCtx).toBeDefined()
    const params = await receivedCtx!.params!
    expect(params).toEqual({ id: "biz-42" })
  })

  it("forwards If-Modified-Since and returns notModified on 304", async () => {
    let captured: Request | null = null
    const op = makeOp<{}, never>(async (req) => {
      captured = req
      return new Response(null, {
        status: 304,
        headers: { "Last-Modified": "Wed, 01 Jan 2025 00:00:00 GMT" },
      })
    })
    const res = await apiServerFetch(op, {
      input: {},
      ifModifiedSince: "Wed, 01 Jan 2025 00:00:00 GMT",
    })
    expect((captured as unknown as Request).headers.get("if-modified-since")).toBe(
      "Wed, 01 Jan 2025 00:00:00 GMT",
    )
    expect(res.notModified).toBe(true)
    expect(res.status).toBe(304)
    expect(res.data).toBeNull()
    expect(res.lastModified).toBe("Wed, 01 Jan 2025 00:00:00 GMT")
  })

  it("redirects to /login?reason=idle on 401 + auth.idle_timeout", async () => {
    const op = makeOp<{}, never>(async () =>
      new ApiError({
        status: 401,
        code: "auth.idle_timeout",
        message: "Session expired due to inactivity.",
      }).toResponse(),
    )
    await expect(apiServerFetch(op, { input: {} })).rejects.toThrow(
      "__test_redirect__:/login?reason=idle",
    )
    expect(recordedRedirects).toEqual(["/login?reason=idle"])
  })

  it("throws ApiError (not redirect) on other 401 codes", async () => {
    const op = makeOp<{}, never>(async () =>
      ApiError.unauthorized("Sign in required").toResponse(),
    )
    try {
      await apiServerFetch(op, { input: {} })
      throw new Error("expected throw")
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError)
      expect((err as ApiError).code).toBe("auth.unauthenticated")
      expect((err as ApiError).status).toBe(401)
    }
    expect(recordedRedirects).toEqual([])
  })

  it("throws ApiError with parsed code/message/field on 4xx", async () => {
    const op = makeOp<{}, never>(async () =>
      new ApiError({
        status: 400,
        code: "validation.input",
        message: "Name is required",
        field: "name",
      }).toResponse(),
    )
    try {
      await apiServerFetch(op, { input: {} })
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
    const op = makeOp<{}, never>(
      async () =>
        new Response("<html>nope</html>", {
          status: 500,
          headers: { "Content-Type": "text/html" },
        }),
    )
    await expect(apiServerFetch(op, { input: {} })).rejects.toMatchObject({
      status: 500,
      code: "unknown",
    })
  })

  it("omits optional headers when outer scope didn't supply them", async () => {
    setApiServerFetchInternals({
      resolveHeaders: async () => new Headers(), // no cookies, no request-id
    })
    let captured: Request | null = null
    const op = makeOp<{}, { ok: true }>(async (req) => {
      captured = req
      return Response.json({ ok: true }, { status: 200 })
    })
    await apiServerFetch(op, { input: {} })
    const headers = (captured as unknown as Request).headers
    expect(headers.has("cookie")).toBe(false)
    expect(headers.has("x-request-id")).toBe(false)
    expect(headers.get("x-client")).toBe("web") // always set
  })
})
