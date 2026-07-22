import { describe, expect, it } from "vitest"
import { deriveDisplayStatus } from "./subscription-display-status"

type Row = {
  payment_status: "paid" | "pending" | "overdue"
  start_date: string
  end_date: string
}

const older: Row = {
  payment_status: "overdue",
  start_date: "2025-01-01T00:00:00.000Z",
  end_date: "2025-07-01T00:00:00.000Z",
}

const newer: Row = {
  payment_status: "paid",
  start_date: "2025-07-15T00:00:00.000Z",
  end_date: "2026-07-15T00:00:00.000Z",
}

describe("deriveDisplayStatus", () => {
  it("marks the older row as 'expired' once a newer subscription starts", () => {
    expect(deriveDisplayStatus(older, [older, newer])).toBe("expired")
  })

  it("leaves the newest row's status untouched", () => {
    expect(deriveDisplayStatus(newer, [older, newer])).toBe(newer.payment_status)
  })

  it("does not change status when there is only one row", () => {
    expect(deriveDisplayStatus(older, [older])).toBe(older.payment_status)
  })

  it("does not treat two overlapping current subs as expiring each other", () => {
    // Two subs whose end_dates are both AFTER the max start_date — neither
    // should be marked expired. Guards against a naive "not the newest" rule.
    const a: Row = {
      payment_status: "paid",
      start_date: "2026-01-01T00:00:00.000Z",
      end_date: "2027-01-01T00:00:00.000Z",
    }
    const b: Row = {
      payment_status: "paid",
      start_date: "2026-06-01T00:00:00.000Z",
      end_date: "2027-06-01T00:00:00.000Z",
    }
    expect(deriveDisplayStatus(a, [a, b])).toBe("paid")
    expect(deriveDisplayStatus(b, [a, b])).toBe("paid")
  })
})
