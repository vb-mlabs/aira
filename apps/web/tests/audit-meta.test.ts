// @vitest-environment node
//
// AuditMeta union accepts the new `client` field (C4). The default behaviour
// when no client is passed must remain "web" so every existing caller (W5–W8)
// keeps its previous shape on disk.

import { describe, expect, it, vi, beforeEach } from "vitest"

const inserted: Array<Record<string, unknown>> = []
vi.mock("@/lib/db", () => ({
  db: {
    insert: () => ({
      values: (v: Record<string, unknown>) => {
        inserted.push(v)
        return Promise.resolve()
      },
    }),
  },
}))
import {
  audit,
  clientFromHeaders,
  type AuditClient,
  type AuditMeta,
} from "@/lib/db/audit"

beforeEach(() => {
  inserted.length = 0
})

describe("audit() — client field default", () => {
  it("defaults metadata.client to 'web' when client is omitted", async () => {
    await audit({
      actorId: "u_1",
      action: "user.avatar_changed",
      target: { type: "user", id: "u_1" },
      meta: { kind: "user.avatar_changed" },
    })
    expect(inserted).toHaveLength(1)
    expect((inserted[0]!.metadata as { client: AuditClient }).client).toBe("web")
  })

  it("records 'mobile' when explicitly threaded through (X-Client header path)", async () => {
    await audit({
      actorId: "u_2",
      action: "user.avatar_changed",
      target: { type: "user", id: "u_2" },
      meta: { kind: "user.avatar_changed" },
      client: "mobile",
    })
    expect((inserted[0]!.metadata as { client: AuditClient }).client).toBe("mobile")
  })

  it("preserves the discriminated body alongside the client field", async () => {
    await audit({
      actorId: null,
      action: "user.role_changed",
      meta: { kind: "user.role_changed", from: "user", to: "admin" },
      client: "web",
    })
    expect(inserted[0]!.metadata).toEqual({
      kind: "user.role_changed",
      from: "user",
      to: "admin",
      client: "web",
    })
  })

  it("writes a client-only metadata when no meta is supplied (defensive)", async () => {
    await audit({
      actorId: "u_3",
      action: "user.unbanned",
      target: { type: "user", id: "u_3" },
    })
    expect(inserted[0]!.metadata).toEqual({ client: "web" })
  })
})

describe("clientFromHeaders()", () => {
  it("returns 'mobile' for X-Client: mobile (case-insensitive header key)", () => {
    expect(clientFromHeaders(new Headers({ "X-Client": "mobile" }))).toBe("mobile")
    expect(clientFromHeaders(new Headers({ "x-client": "mobile" }))).toBe("mobile")
  })

  it("returns 'web' for any other header value or missing header", () => {
    expect(clientFromHeaders(new Headers({ "X-Client": "web" }))).toBe("web")
    expect(clientFromHeaders(new Headers({ "X-Client": "android" }))).toBe("web")
    expect(clientFromHeaders(new Headers())).toBe("web")
  })
})

describe("AuditMeta type — compile-time contract guard", () => {
  it("union narrows on `kind` discriminator (tsd-lite check)", () => {
    // If this compiles, the contract holds. The runtime assertion is incidental.
    const m: AuditMeta = { kind: "user.role_changed", from: "u", to: "a" }
    expect(m.kind).toBe("user.role_changed")
  })
})
