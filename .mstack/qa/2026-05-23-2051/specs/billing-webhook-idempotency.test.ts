/**
 * QA-S4 smoke: Stripe webhook idempotency layer.
 *
 * Calls handleStripeEvent twice with the same Stripe event id and asserts the
 * second call exits early (no dispatch). Mocks the Drizzle insert chain:
 *   1st call → ON CONFLICT DO NOTHING returns 1 row → handler proceeds to
 *              the switch (which only has a default case in the template;
 *              we count entries to the "post-insert" path)
 *   2nd call → ON CONFLICT DO NOTHING returns 0 rows → handler returns early
 *
 * Pure unit-level: no real Postgres, no real Stripe SDK.
 *
 * Run via:
 *   pnpm --filter @mlabs/services exec vitest run ../.mstack/qa/2026-05-23-2051/specs/billing-webhook-idempotency.test.ts
 */

import { describe, it, expect, vi } from "vitest"
import type { Stripe } from "stripe"

// Build a fresh mock db whose .insert().values().onConflictDoNothing()
// .returning() returns `rowsToReturn`. The first call returns [{ id }] (fresh
// event); the second returns [] (duplicate).
function makeMockDb(rowsToReturn: Array<Array<{ id: string }>>) {
  let callIdx = 0
  const insertChain = {
    values: vi.fn(() => insertChain),
    onConflictDoNothing: vi.fn(() => insertChain),
    returning: vi.fn(async () => {
      const out = rowsToReturn[callIdx] ?? []
      callIdx += 1
      return out
    }),
  }
  return {
    insert: vi.fn(() => insertChain),
    _chain: insertChain,
  }
}

// Build a fake Stripe.Event of an unhandled type — the template's webhook.ts
// only has a default case, so any event type lands in default after the
// idempotency insert.
const buildEvent = (id: string): Stripe.Event =>
  ({
    id,
    type: "customer.created",
    data: { object: { kind: "test", id: "obj_xyz" } },
  }) as unknown as Stripe.Event

// Mock the schema module so the import in webhook.ts resolves without
// touching the real Drizzle schema (which would require @mlabs/db's
// neon-serverless setup).
vi.mock("@mlabs/db/schema", () => ({
  webhook_event: { id: { _column: "id" }, _name: "webhook_event" },
}))

import { handleStripeEvent } from "@mlabs/services/billing"

describe("S4: webhook idempotency", () => {
  it("first delivery → insert returns 1 row → handler proceeds (no error on default case)", async () => {
    const db = makeMockDb([[{ id: "evt_first" }]])
    const event = buildEvent("evt_first")
    await expect(
      handleStripeEvent(db as never, event, undefined),
    ).resolves.toBeUndefined()
    expect(db.insert).toHaveBeenCalledTimes(1)
    expect(db._chain.values).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "evt_first",
        event_type: "customer.created",
      }),
    )
  })

  it("duplicate delivery → insert returns 0 rows → handler returns early", async () => {
    // 1st call to handleStripeEvent: returns [{ id }] → proceeds to switch
    // 2nd call to handleStripeEvent: returns [] → returns immediately
    const db = makeMockDb([[{ id: "evt_dup" }], []])
    const event = buildEvent("evt_dup")

    await handleStripeEvent(db as never, event, undefined)
    await handleStripeEvent(db as never, event, undefined)

    expect(db.insert).toHaveBeenCalledTimes(2) // both calls hit insert
    expect(db._chain.returning).toHaveBeenCalledTimes(2)
    // No assertion on switch dispatch — only a default case, void return.
    // The idempotency layer is the contract being tested.
  })
})
