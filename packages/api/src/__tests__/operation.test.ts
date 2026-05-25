// @vitest-environment node
//
// Contract tests for createOperations + defineOperation. Lock the behaviour
// every route handler and Server Action depends on:
//   - unauthenticated → 401 ApiErrorResponse
//   - permission denied → 403
//   - input validation failure → 400 with field hint
//   - output contract mismatch → 500 (logged, not leaked)
//   - happy path → 200 JSON with X-Request-Id echo
//   - runFromAction throws ApiError (no Response wrapping)

import { describe, expect, it, vi, beforeEach } from "vitest"
import { z } from "zod"
import {
  createOperations,
  setActionHeadersResolver,
} from "../operation"
import { ApiError } from "../errors"
import type { OperationSession } from "../operation"

function mkRequest(opts: {
  method?: string
  body?: unknown
  headers?: Record<string, string>
  url?: string
}): Request {
  const headers: Record<string, string> = { ...(opts.headers ?? {}) }
  let bodyInit: BodyInit | undefined
  if (opts.body !== undefined) {
    bodyInit = JSON.stringify(opts.body)
    headers["content-type"] = headers["content-type"] ?? "application/json"
  }
  return new Request(opts.url ?? "http://localhost/api/test", {
    method: opts.method ?? "POST",
    headers,
    body: bodyInit,
  })
}

const userSession: OperationSession = {
  user: { id: "u_1", email: "u@example.com", role: "user" },
}
const adminSession: OperationSession = {
  user: { id: "a_1", email: "a@example.com", role: "admin" },
}

const fakeDb = { __tag: "fakedb" as const }
type FakeDb = typeof fakeDb

function makeFactory(getSession: () => Promise<OperationSession | null>) {
  const errorSpy = vi.fn()
  const { defineOperation } = createOperations<FakeDb>({
    db: fakeDb,
    getSession,
    logger: { error: errorSpy },
    generateRequestId: () => "req-fixed",
  })
  return { defineOperation, errorSpy }
}

describe("defineOperation.runFromRequest", () => {
  it("returns 401 when getSession returns null", async () => {
    const { defineOperation } = makeFactory(async () => null)
    const op = defineOperation({
      name: "test.ping",
      input: z.object({}),
      output: z.object({ ok: z.boolean() }),
      permission: "user",
      handler: async () => ({ ok: true }),
    })
    const res = await op.runFromRequest(mkRequest({}))
    expect(res.status).toBe(401)
    const body = (await res.json()) as { error: { code: string } }
    expect(body.error.code).toBe("auth.unauthenticated")
    expect(res.headers.get("X-Request-Id")).toBe("req-fixed")
  })

  it("returns 403 when role is below required permission", async () => {
    const { defineOperation } = makeFactory(async () => userSession)
    const op = defineOperation({
      name: "test.adminOnly",
      input: z.object({}),
      output: z.object({}),
      permission: "admin",
      handler: async () => ({}),
    })
    const res = await op.runFromRequest(mkRequest({}))
    expect(res.status).toBe(403)
    const body = (await res.json()) as { error: { code: string } }
    expect(body.error.code).toBe("auth.forbidden")
  })

  it("admins satisfy 'user' permission gate", async () => {
    const { defineOperation } = makeFactory(async () => adminSession)
    const op = defineOperation({
      name: "test.userOk",
      input: z.object({}),
      output: z.object({ ok: z.boolean() }),
      permission: "user",
      handler: async () => ({ ok: true }),
    })
    const res = await op.runFromRequest(mkRequest({}))
    expect(res.status).toBe(200)
  })

  it("returns 400 with field hint on input validation failure", async () => {
    const { defineOperation } = makeFactory(async () => userSession)
    const op = defineOperation({
      name: "test.in",
      input: z.object({ name: z.string().min(1) }),
      output: z.object({}),
      permission: "user",
      handler: async () => ({}),
    })
    const res = await op.runFromRequest(
      mkRequest({ body: { name: "" } }),
    )
    expect(res.status).toBe(400)
    const body = (await res.json()) as {
      error: { code: string; field?: string }
    }
    expect(body.error.code).toBe("validation.input")
    expect(body.error.field).toBe("name")
  })

  it("returns 400 on malformed JSON body", async () => {
    const { defineOperation } = makeFactory(async () => userSession)
    const op = defineOperation({
      name: "test.in",
      input: z.object({}),
      output: z.object({}),
      permission: "user",
      handler: async () => ({}),
    })
    const req = new Request("http://localhost/api/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not json",
    })
    const res = await op.runFromRequest(req)
    expect(res.status).toBe(400)
    const body = (await res.json()) as { error: { code: string } }
    expect(body.error.code).toBe("validation.json")
  })

  it("falls back to query params for GET requests (no body parse attempt)", async () => {
    const { defineOperation } = makeFactory(async () => userSession)
    const seen = vi.fn()
    const op = defineOperation({
      name: "test.q",
      input: z.object({ q: z.string() }),
      output: z.object({ echoed: z.string() }),
      permission: "user",
      handler: async (_db, _ctx, input) => {
        seen(input)
        return { echoed: input.q }
      },
    })
    const res = await op.runFromRequest(
      mkRequest({ method: "GET", url: "http://localhost/api/test?q=hello" }),
    )
    expect(res.status).toBe(200)
    expect(seen).toHaveBeenCalledWith({ q: "hello" })
  })

  it("returns 500 + logs when handler output fails output schema", async () => {
    const { defineOperation, errorSpy } = makeFactory(async () => userSession)
    const op = defineOperation({
      name: "test.broken",
      input: z.object({}),
      output: z.object({ ok: z.literal(true) }),
      permission: "user",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      handler: async () => ({ ok: "yes" } as any),
    })
    const res = await op.runFromRequest(mkRequest({}))
    expect(res.status).toBe(500)
    const body = (await res.json()) as { error: { code: string } }
    expect(body.error.code).toBe("internal.contract_mismatch")
    expect(errorSpy).toHaveBeenCalledWith(
      "operation.output_mismatch",
      expect.objectContaining({ op: "test.broken" }),
    )
  })

  it("forwards X-Request-Id when supplied; generates one otherwise", async () => {
    const { defineOperation } = makeFactory(async () => userSession)
    const op = defineOperation({
      name: "test.req",
      input: z.object({}),
      output: z.object({ ok: z.boolean() }),
      permission: "user",
      handler: async () => ({ ok: true }),
    })
    const supplied = await op.runFromRequest(
      mkRequest({ headers: { "x-request-id": "abc-123" } }),
    )
    expect(supplied.headers.get("X-Request-Id")).toBe("abc-123")
    const generated = await op.runFromRequest(mkRequest({}))
    expect(generated.headers.get("X-Request-Id")).toBe("req-fixed")
  })

  it("propagates ApiError thrown by handler", async () => {
    const { defineOperation } = makeFactory(async () => userSession)
    const op = defineOperation({
      name: "test.thrower",
      input: z.object({}),
      output: z.object({}),
      permission: "user",
      handler: async () => {
        throw ApiError.notFound("test.gone", "Resource gone")
      },
    })
    const res = await op.runFromRequest(mkRequest({}))
    expect(res.status).toBe(404)
    const body = (await res.json()) as { error: { code: string } }
    expect(body.error.code).toBe("test.gone")
  })

  it("maps unhandled handler error to 500 + logs", async () => {
    const { defineOperation, errorSpy } = makeFactory(async () => userSession)
    const op = defineOperation({
      name: "test.boom",
      input: z.object({}),
      output: z.object({}),
      permission: "user",
      handler: async () => {
        throw new Error("kaboom")
      },
    })
    const res = await op.runFromRequest(mkRequest({}))
    expect(res.status).toBe(500)
    const body = (await res.json()) as { error: { code: string } }
    expect(body.error.code).toBe("internal.unhandled")
    expect(errorSpy).toHaveBeenCalledWith(
      "operation.unhandled",
      expect.objectContaining({ op: "test.boom" }),
    )
  })

  it("derives source from X-Client: mobile", async () => {
    const { defineOperation } = makeFactory(async () => userSession)
    const observed = vi.fn()
    const op = defineOperation({
      name: "test.src",
      input: z.object({}),
      output: z.object({ src: z.string() }),
      permission: "user",
      handler: async (_db, ctx) => {
        observed(ctx.source)
        return { src: ctx.source }
      },
    })
    await op.runFromRequest(mkRequest({ headers: { "x-client": "mobile" } }))
    expect(observed).toHaveBeenCalledWith("mobile")
    await op.runFromRequest(mkRequest({}))
    expect(observed).toHaveBeenCalledWith("web")
  })
})

describe("defineOperation.runFromAction", () => {
  beforeEach(() => {
    setActionHeadersResolver(async () => new Headers())
  })

  it("throws ApiError on unauthed call (no Response)", async () => {
    const { defineOperation } = makeFactory(async () => null)
    const op = defineOperation({
      name: "test.action",
      input: z.object({}),
      output: z.object({}),
      permission: "user",
      handler: async () => ({}),
    })
    await expect(op.runFromAction({})).rejects.toMatchObject({
      name: "ApiError",
      status: 401,
      code: "auth.unauthenticated",
    })
  })

  it("returns parsed output on happy path", async () => {
    const { defineOperation } = makeFactory(async () => userSession)
    const op = defineOperation({
      name: "test.action.ok",
      input: z.object({ n: z.number() }),
      output: z.object({ doubled: z.number() }),
      permission: "user",
      handler: async (_db, _ctx, input) => ({ doubled: input.n * 2 }),
    })
    await expect(op.runFromAction({ n: 21 })).resolves.toEqual({
      doubled: 42,
    })
  })

  it("throws on input validation failure (no Response)", async () => {
    const { defineOperation } = makeFactory(async () => userSession)
    const op = defineOperation({
      name: "test.action.invalid",
      input: z.object({ name: z.string().min(1) }),
      output: z.object({}),
      permission: "user",
      handler: async () => ({}),
    })
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      op.runFromAction({ name: "" } as any),
    ).rejects.toMatchObject({
      status: 400,
      code: "validation.input",
      field: "name",
    })
  })
})

describe("Operation.schema", () => {
  it("exposes name, input, output, permission for contract tests", async () => {
    const { defineOperation } = makeFactory(async () => userSession)
    const op = defineOperation({
      name: "test.schema",
      input: z.object({}),
      output: z.object({ ok: z.boolean() }),
      permission: "admin",
      handler: async () => ({ ok: true }),
    })
    expect(op.schema.name).toBe("test.schema")
    expect(op.schema.permission).toBe("admin")
    expect(typeof op.schema.input.parse).toBe("function")
    expect(typeof op.schema.output.parse).toBe("function")
  })
})
