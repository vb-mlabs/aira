// @vitest-environment node
//
// Guard tests for listQueue's includeAll behaviour. Confirms two
// contracts:
//   1. `includeAll: false` produces the SAME where-arg shape as the
//      default (implicit undefined) — proves no behavioural drift on
//      the current-work path.
//   2. `includeAll: true` DROPS the `inActiveQueue` predicate from
//      the `and(...)` composition — proves the toggle actually turns
//      off the filter.
//
// Approach: spy on drizzle-orm's `and()` at module boundary to capture
// its arguments per call. Chainable-mock db returns [] so the
// listQueue path completes without touching a real DB. Assertions
// look at the where-args composition, not SQL text.

import { describe, expect, it, vi, beforeEach } from "vitest"

const mocks = vi.hoisted(() => ({
  andSpy: vi.fn(),
}))

vi.mock("drizzle-orm", async (importActual) => {
  const actual = await importActual<typeof import("drizzle-orm")>()
  type AndFn = typeof actual.and
  const wrappedAnd: AndFn = ((...args: Parameters<AndFn>) => {
    mocks.andSpy(args)
    return actual.and(...args)
  }) as AndFn
  return {
    ...actual,
    and: wrappedAnd,
  }
})

import { listQueue } from "../queries"
import type { Database } from "@aira/db/client"

// Chainable mock: every drizzle method returns `this`; awaiting the
// chain resolves to []. The COUNT(*) branch inside listQueue also
// resolves through the same proxy — the truncated flag stays false
// (rows.length === 0 which is < QUEUE_PAGE_CAP + 1), so listQueue
// never runs the count query.
function chainableDb(rows: unknown[] = []): Database {
  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      if (prop === "then") {
        return (resolve: (v: unknown) => void) => resolve(rows)
      }
      return () => proxy
    },
  }
  const proxy: unknown = new Proxy({}, handler)
  return proxy as Database
}

beforeEach(() => {
  mocks.andSpy.mockClear()
})

describe("listQueue — default vs includeAll", () => {
  it("includeAll:false produces the same where-arg shape as omitting the flag", async () => {
    await listQueue(chainableDb(), { withinDays: 7 })
    const defaultArgs = mocks.andSpy.mock.calls[0]?.[0]
    mocks.andSpy.mockClear()

    await listQueue(chainableDb(), { withinDays: 7, includeAll: false })
    const explicitFalseArgs = mocks.andSpy.mock.calls[0]?.[0]

    // Both compositions run `and(payment-status, end-date, inActiveQueue)`.
    // No `undefined` — the falsy path here is `!includeAll === true` →
    // `activeOnly ? inActiveQueue : undefined` picks `inActiveQueue`.
    expect(Array.isArray(defaultArgs)).toBe(true)
    expect(Array.isArray(explicitFalseArgs)).toBe(true)
    expect((defaultArgs as unknown[]).length).toBe(3)
    expect((explicitFalseArgs as unknown[]).length).toBe(3)
    // Third arg identity: both point at the SAME frozen `inActiveQueue`
    // sql fragment (module-level const). Deep-equal is overkill; a
    // reference check proves it's the same predicate.
    expect((explicitFalseArgs as unknown[])[2]).toBe(
      (defaultArgs as unknown[])[2],
    )
  })

  it("includeAll:true drops the inActiveQueue predicate (third arg becomes undefined)", async () => {
    await listQueue(chainableDb(), { withinDays: 7 })
    const defaultArgs = mocks.andSpy.mock.calls[0]?.[0] as unknown[]
    mocks.andSpy.mockClear()

    await listQueue(chainableDb(), { withinDays: 7, includeAll: true })
    const includeAllArgs = mocks.andSpy.mock.calls[0]?.[0] as unknown[]

    // Same call shape (3 args, matching count).
    expect(includeAllArgs.length).toBe(3)
    expect(defaultArgs.length).toBe(3)
    // The load-bearing assertion: third arg IS undefined in includeAll
    // mode — that's the `activeOnly ? inActiveQueue : undefined`
    // ternary picking undefined. Default path picks inActiveQueue
    // (a defined SQL fragment).
    expect(includeAllArgs[2]).toBeUndefined()
    expect(defaultArgs[2]).not.toBeUndefined()
  })
})
