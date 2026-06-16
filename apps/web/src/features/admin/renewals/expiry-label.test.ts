import { describe, expect, it } from "vitest"
import { expiryLabel } from "./expiry-label"

describe("expiryLabel", () => {
  // Fixed ISO so the >7d absolute-date branch is deterministic across
  // CI timezones — assert UTC mm/dd/yyyy directly.
  const FIXED_END = "2026-09-15T10:30:00.000Z"

  it("renders past-due rows as OVERDUE Nd", () => {
    expect(expiryLabel(-1, FIXED_END)).toBe("OVERDUE 1d")
    expect(expiryLabel(-12, FIXED_END)).toBe("OVERDUE 12d")
  })

  it("renders today/tomorrow buckets", () => {
    expect(expiryLabel(0, FIXED_END)).toBe("today")
    expect(expiryLabel(1, FIXED_END)).toBe("tomorrow")
  })

  it("renders 2-7d as in N days", () => {
    expect(expiryLabel(3, FIXED_END)).toBe("in 3 days")
    expect(expiryLabel(7, FIXED_END)).toBe("in 7 days")
  })

  it("renders >7d as UTC mm/dd/yyyy from the ISO end date", () => {
    expect(expiryLabel(8, FIXED_END)).toBe("09/15/2026")
    expect(expiryLabel(240, FIXED_END)).toBe("09/15/2026")
  })
})
