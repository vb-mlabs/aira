// Lane E — compile-time type contract for AuditMeta + AuditOpts.
//
// Uses `expect-type` so assertions run at typecheck time. A regression here
// breaks `tsc --noEmit` before any runtime test runs.
//
// Covers:
//  - AuditClient is exactly "web" | "mobile" (no broadening to string)
//  - AuditOpts.client is optional (existing callers stay source-compatible)
//  - AuditMeta is a discriminated union keyed by `kind`
//  - `clientFromHeaders` returns AuditClient (not a wider string)
//  - audit() opts type accepts both a plain meta and meta+client

import { describe, it } from "vitest"
import { expectTypeOf } from "expect-type"
import {
  audit,
  clientFromHeaders,
  type AuditClient,
  type AuditMeta,
  type AuditOpts,
} from "@/lib/db/audit"

describe("AuditMeta + AuditOpts type contract", () => {
  it("AuditClient is exactly 'web' | 'mobile'", () => {
    expectTypeOf<AuditClient>().toEqualTypeOf<"web" | "mobile">()
    // Sanity: a wider type would fail this.
    expectTypeOf<AuditClient>().not.toEqualTypeOf<string>()
  })

  it("AuditOpts.client is optional (back-compat with existing callers)", () => {
    expectTypeOf<AuditOpts["client"]>().toEqualTypeOf<AuditClient | undefined>()
  })

  it("audit() accepts opts WITHOUT client (existing callers compile unchanged)", () => {
    // Type-only assertion — never invoked.
    const _shape: Parameters<typeof audit>[0] = {
      actorId: "u_1",
      action: "user.role_changed",
      target: { type: "user", id: "u_2" },
      meta: { kind: "user.role_changed", from: "user", to: "admin" },
    }
    expectTypeOf<typeof _shape>().toMatchTypeOf<AuditOpts>()
    void _shape
  })

  it("audit() accepts opts WITH explicit client", () => {
    const _shape: Parameters<typeof audit>[0] = {
      actorId: "u_1",
      action: "user.name_changed",
      meta: { kind: "user.name_changed" },
      client: "mobile",
    }
    expectTypeOf<typeof _shape>().toMatchTypeOf<AuditOpts>()
    void _shape
  })

  it("AuditMeta is a discriminated union on `kind`", () => {
    // Narrowing by `kind` removes incompatible branches.
    const m: AuditMeta = { kind: "user.banned", reason: "spam" }
    if (m.kind === "user.banned") {
      expectTypeOf(m).toHaveProperty("reason")
      // After narrowing, `from` should not be accessible (that's user.role_changed).
      expectTypeOf<typeof m>().not.toHaveProperty("from")
    }
  })

  it("session.revoked.reason is exactly the 4 locked literals", () => {
    type RevokedReason = Extract<AuditMeta, { kind: "session.revoked" }>["reason"]
    expectTypeOf<RevokedReason>().toEqualTypeOf<
      "logout" | "admin" | "password_change" | "account_deleted"
    >()
  })

  it("clientFromHeaders returns AuditClient (not widened string)", () => {
    expectTypeOf(clientFromHeaders).returns.toEqualTypeOf<AuditClient>()
    expectTypeOf(clientFromHeaders).parameter(0).toEqualTypeOf<Headers>()
  })

  it("rejects unknown action kinds at compile time", () => {
    const _bad: AuditOpts = {
      actorId: "u_1",
      // @ts-expect-error — "user.exploded" isn't a member of the union
      action: "user.exploded",
    }
    void _bad
  })

  it("rejects free-form metadata strings (no { kind: 'arbitrary' })", () => {
    const _bad: AuditOpts = {
      actorId: "u_1",
      action: "user.role_changed",
      // @ts-expect-error — { kind: "arbitrary"; freeform: string } isn't in AuditMeta
      meta: { kind: "arbitrary", freeform: "leak PII here" },
    }
    void _bad
  })
})
