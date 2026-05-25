// @vitest-environment node
//
// Contract test scaffold.
//
// Every operation in apps/web/src/server/operations (currently
// src/server/operations until Phase 5) carries `.schema.{input, output,
// permission, name}`. This file proves the scaffold by running each
// operation's output schema against a handler-shaped fixture and asserting
// it parses cleanly. The real contract test (Phase 7 CI) runs the live
// route + asserts the response body satisfies `output`.
//
// Why a scaffold and not the real thing: this package is consumed by
// apps/web, so importing `apps/web/src/server/operations/*` here would
// invert the dep graph. The full check belongs in either a top-level test
// runner (apps/web Vitest) or a dedicated `packages/api-contract` package.
// For now, prove the OperationSchema surface is shaped right by exercising
// it with a synthetic operation.

import { describe, expect, it } from "vitest"
import { z } from "zod"
import { createOperations } from "../operation"
import type { OperationSession } from "../operation"

const ANY_DB = { __tag: "fakedb" as const }
const SESSION: OperationSession = {
  user: { id: "u_1", email: "u@x.com", role: "user" },
}

const { defineOperation } = createOperations({
  db: ANY_DB,
  getSession: async () => SESSION,
})

describe("operation.schema contract", () => {
  it("exposes name/permission/input/output for every defined operation", () => {
    const op = defineOperation({
      name: "demo.shape",
      input: z.object({ q: z.string() }),
      output: z.object({ count: z.number() }),
      permission: "user",
      handler: async (_db, _ctx, { q }) => ({ count: q.length }),
    })
    expect(op.schema.name).toBe("demo.shape")
    expect(op.schema.permission).toBe("user")

    // Output schema is reachable + functional: a contract test in Phase 7
    // will call the live route and pass `await res.json()` through here.
    const parsed = op.schema.output.safeParse({ count: 5 })
    expect(parsed.success).toBe(true)

    const bad = op.schema.output.safeParse({ count: "five" })
    expect(bad.success).toBe(false)
  })

  it("input schema rejects unknown shapes early enough for contract tests to assert", () => {
    const op = defineOperation({
      name: "demo.strict",
      input: z.object({ a: z.number() }).strict(),
      output: z.object({}),
      permission: "user",
      handler: async () => ({}),
    })
    // Strict object — extra key is a parse failure. The route's runFromRequest
    // would translate this to a 400; contract-test callers can use safeParse
    // directly to assert input compatibility.
    const result = op.schema.input.safeParse({ a: 1, extra: true })
    expect(result.success).toBe(false)
  })
})
