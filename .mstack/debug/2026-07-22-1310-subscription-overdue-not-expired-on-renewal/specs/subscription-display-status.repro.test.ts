import { describe, it, expect } from "vitest"

// Repro for: prior overdue subscription doesn't transition to "Expired"
// when a new subscription is activated on the same listing.
//
// Cause under test: apps/web/src/features/admin/components/subscription-display-status.ts
// does not yet exist. deriveDisplayStatus() should return "expired" for any
// row whose end_date is earlier than the max start_date across the sibling
// list — this is Option A (UI-only derived label) from the debug report.

import { deriveDisplayStatus } from "@/features/admin/components/subscription-display-status"

// Shape mirrors BusinessSubscription enough to exercise the derivation.
type Row = {
  id: string
  payment_status: "paid" | "pending" | "overdue"
  start_date: string
  end_date: string
}

const older: Row = {
  id: "sub-older",
  payment_status: "overdue",
  start_date: "2025-01-01T00:00:00.000Z",
  end_date: "2025-07-01T00:00:00.000Z", // past
}

const newer: Row = {
  id: "sub-newer",
  payment_status: "paid",
  start_date: "2025-07-15T00:00:00.000Z", // starts AFTER older.end_date
  end_date: "2026-07-15T00:00:00.000Z",
}

describe("deriveDisplayStatus (subscriptions-section)", () => {
  it("marks the older row as 'expired' once a newer subscription starts", () => {
    // The Iron Law failing assertion: the *cause* is that the derivation
    // doesn't exist / doesn't return "expired" for a superseded row.
    expect(deriveDisplayStatus(older, [older, newer])).toBe("expired")
  })

  it("leaves the newest row's status untouched", () => {
    expect(deriveDisplayStatus(newer, [older, newer])).toBe(newer.payment_status)
  })

  it("does not change status when there is only one row", () => {
    expect(deriveDisplayStatus(older, [older])).toBe(older.payment_status)
  })
})
