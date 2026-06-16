// @vitest-environment node
//
// Tests for recomputeBusinessTier and findActivePaidPlansForBusiness.
// The chainable mock returns whatever rows the test stages on `selectRows`
// when the recompute issues its SELECT, and records the UPDATE .set() call
// so the test can assert which tier code was written to businesses.tier.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Database } from "@aira/db/client"
import { recomputeBusinessTier } from "../service"

interface MockState {
  selectRows: Array<{ tier: string }>
  setSpy: ReturnType<typeof vi.fn>
}

function makeDb(state: MockState): Database {
  return {
    select: () => ({
      from: () => ({
        innerJoin: () => ({
          where: () => Promise.resolve(state.selectRows),
        }),
      }),
    }),
    update: () => ({
      set: state.setSpy.mockReturnValue({
        where: () => Promise.resolve(undefined),
      }),
    }),
  } as unknown as Database
}

let state: MockState

beforeEach(() => {
  state = {
    selectRows: [],
    setSpy: vi.fn(),
  }
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("recomputeBusinessTier", () => {
  it("writes tier1 when one active paid sub points at a tier1 plan", async () => {
    state.selectRows = [{ tier: "tier1" }]
    const result = await recomputeBusinessTier(makeDb(state), "biz_1")
    expect(result).toEqual({ tier: "tier1" })
    expect(state.setSpy).toHaveBeenCalledWith({ tier: "tier1" })
  })

  it("picks the best (lowest-priority) tier across overlapping active paid subs", async () => {
    state.selectRows = [{ tier: "tier2" }, { tier: "tier1" }, { tier: "tier3" }]
    const result = await recomputeBusinessTier(makeDb(state), "biz_1")
    expect(result).toEqual({ tier: "tier1" })
    expect(state.setSpy).toHaveBeenCalledWith({ tier: "tier1" })
  })

  it("falls back to tier3 when no active paid subs match", async () => {
    // Empty set — represents (a) no subs at all, (b) only overdue/pending
    // subs (filtered out by the WHERE clause), and (c) only plan_id=null
    // subs (filtered out by the INNER JOIN with membership_plan). All
    // three real-world cases collapse to "empty set" at this layer.
    state.selectRows = []
    const result = await recomputeBusinessTier(makeDb(state), "biz_1")
    expect(result).toEqual({ tier: "tier3" })
    expect(state.setSpy).toHaveBeenCalledWith({ tier: "tier3" })
  })

  it("writes tier2 when the only active paid sub is tier2", async () => {
    state.selectRows = [{ tier: "tier2" }]
    const result = await recomputeBusinessTier(makeDb(state), "biz_1")
    expect(result).toEqual({ tier: "tier2" })
    expect(state.setSpy).toHaveBeenCalledWith({ tier: "tier2" })
  })

  it("stays at tier3 when every active paid sub points at a tier3 plan", async () => {
    state.selectRows = [{ tier: "tier3" }, { tier: "tier3" }]
    const result = await recomputeBusinessTier(makeDb(state), "biz_1")
    expect(result).toEqual({ tier: "tier3" })
    expect(state.setSpy).toHaveBeenCalledWith({ tier: "tier3" })
  })
})
