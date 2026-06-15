// @vitest-environment node
//
// Integration tests for Task 5 — verify that each subscription-service
// mutation wraps in db.transaction(...) AND fires recomputeBusinessTier
// after its primary write. The mock db's transaction() invokes the
// callback synchronously with itself (matches the messages-service test
// mock convention), so a single db captures both the mutation's chain
// AND the recompute's chain.
//
// We assert two things per mutation:
//   1. db.transaction() was called (the wrap).
//   2. an UPDATE against the `businesses` table fired (the recompute
//      writes businesses.tier). We track this via a marker on the table
//      object recorded in the .update() call.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Database } from "@aira/db/client"
import {
  createSubscription,
  deleteSubscription,
  rolloverExpiredSubscriptions,
  updateSubscription,
} from "../service"

interface Recorder {
  transactionCalls: number
  /** Tables seen in `db.update(tableX)` calls. The recompute writes
   *  `businesses`; the primary mutations write `business_subscription`. */
  updatedTables: string[]
  /** Tables seen in `db.delete(tableX)` calls. */
  deletedTables: string[]
}

function makeDb(rec: Recorder, opts?: { rolloverIds?: string[] }): Database {
  // Stub a chainable shape: every method returns the chain proxy. The
  // terminal step resolves to a row set the test pre-stages (insert
  // returns one subscription row; rollover returns N rows; recompute's
  // SELECT returns []).
  const subscriptionRow = {
    id: "sub_1",
    business_id: "biz_1",
    plan_id: null,
    payment_status: "paid" as const,
    start_date: new Date(),
    end_date: new Date(),
    amount_cents: 0,
    payment_evidence_url: null,
    notes: null,
    recorded_by: null,
    created_at: new Date(),
    updated_at: new Date(),
  }

  const rolloverRows = (opts?.rolloverIds ?? []).map((id, i) => ({
    id: `sub_${i}`,
    business_id: id,
  }))

  function buildInsertChain() {
    return {
      values: () => ({
        returning: () => Promise.resolve([subscriptionRow]),
      }),
    }
  }

  function buildUpdateChain(table: { _name?: string }) {
    rec.updatedTables.push(table._name ?? "unknown")
    // Two flavours: the subscription mutations call .set().where().returning();
    // the recompute calls .set().where(). Both terminate via await.
    const chain = {
      set: () => ({
        where: () => {
          const thenable = {
            then(resolve: (v: unknown) => void) {
              resolve(undefined)
            },
            returning: () => {
              if (table._name === "business_subscription") {
                return Promise.resolve(
                  rolloverRows.length > 0 ? rolloverRows : [subscriptionRow],
                )
              }
              return Promise.resolve([])
            },
          }
          return thenable
        },
      }),
    }
    return chain
  }

  function buildDeleteChain(table: { _name?: string }) {
    rec.deletedTables.push(table._name ?? "unknown")
    return {
      where: () => ({
        returning: () =>
          Promise.resolve([
            { id: "sub_1", business_id: "biz_1" },
          ]),
      }),
    }
  }

  function buildSelectChain() {
    // findActivePaidPlansForBusiness call inside recompute.
    return {
      from: () => ({
        innerJoin: () => ({
          where: () => Promise.resolve([]),
        }),
      }),
    }
  }

  const db = {
    transaction: async <T>(cb: (tx: Database) => Promise<T>): Promise<T> => {
      rec.transactionCalls += 1
      return cb(db as Database)
    },
    insert: () => buildInsertChain(),
    update: (table: { _name?: string }) => buildUpdateChain(table),
    delete: (table: { _name?: string }) => buildDeleteChain(table),
    select: () => buildSelectChain(),
  } as unknown as Database

  return db
}

vi.mock("@aira/db/schema", () => ({
  businessSubscriptions: {
    _name: "business_subscription",
    id: { _column: "id" },
    business_id: { _column: "business_id" },
    payment_status: { _column: "payment_status" },
    start_date: { _column: "start_date" },
    end_date: { _column: "end_date" },
  },
  businesses: {
    _name: "businesses",
    id: { _column: "id" },
    tier: { _column: "tier" },
  },
  membershipPlans: {
    _name: "membership_plan",
    id: { _column: "id" },
    tier: { _column: "tier" },
  },
}))

vi.mock("drizzle-orm", () => {
  const passthrough = () => true
  return {
    eq: passthrough,
    ne: passthrough,
    and: passthrough,
    or: passthrough,
    gt: passthrough,
    lt: passthrough,
    isNull: passthrough,
    between: passthrough,
    inArray: passthrough,
    desc: (x: unknown) => x,
    asc: (x: unknown) => x,
    sql: (() => () => true) as unknown as (...a: unknown[]) => unknown,
  }
})

let recorder: Recorder

beforeEach(() => {
  recorder = { transactionCalls: 0, updatedTables: [], deletedTables: [] }
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("createSubscription", () => {
  it("wraps in db.transaction and fires recomputeBusinessTier (UPDATE businesses)", async () => {
    const db = makeDb(recorder)
    await createSubscription(db, {
      business_id: "biz_1",
      plan_id: null,
      payment_status: "paid",
      start_date: new Date().toISOString(),
      end_date: new Date().toISOString(),
      amount_cents: 0,
    })
    expect(recorder.transactionCalls).toBe(1)
    expect(recorder.updatedTables).toContain("businesses")
  })
})

describe("updateSubscription", () => {
  it("wraps in db.transaction and fires recomputeBusinessTier", async () => {
    const db = makeDb(recorder)
    await updateSubscription(db, {
      id: "sub_1",
      payment_status: "overdue",
    })
    expect(recorder.transactionCalls).toBe(1)
    // Primary mutation updates business_subscription; recompute updates
    // businesses. Both should appear.
    expect(recorder.updatedTables).toContain("business_subscription")
    expect(recorder.updatedTables).toContain("businesses")
  })
})

describe("deleteSubscription", () => {
  it("wraps in db.transaction and fires recomputeBusinessTier after the delete", async () => {
    const db = makeDb(recorder)
    const ok = await deleteSubscription(db, "sub_1")
    expect(ok).toBe(true)
    expect(recorder.transactionCalls).toBe(1)
    expect(recorder.deletedTables).toContain("business_subscription")
    expect(recorder.updatedTables).toContain("businesses")
  })
})

describe("rolloverExpiredSubscriptions", () => {
  it("recomputes for every distinct business_id affected", async () => {
    const db = makeDb(recorder, {
      rolloverIds: ["biz_1", "biz_2", "biz_1", "biz_3"],
    })
    const result = await rolloverExpiredSubscriptions(db)
    expect(result.transitioned).toBe(4)
    expect(recorder.transactionCalls).toBe(1)
    // 3 distinct businesses + 1 bulk subscription flip = 4 UPDATEs to
    // the `businesses` or `business_subscription` tables. The recompute
    // dedup runs MUST hit businesses exactly 3 times (one per distinct id).
    const businessesUpdates = recorder.updatedTables.filter(
      (t) => t === "businesses",
    ).length
    expect(businessesUpdates).toBe(3)
  })
})
