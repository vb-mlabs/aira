// Failing repro for the cross-tab-nested back-nav bug.
//
// Symptom (user report):
//   Account tab → My Listings → tap a BusinessCard → business detail
//   opens (in the hidden `listings` tab's stack). Top back arrow does
//   nothing / strands the user.
//
// Cause (verified below):
//   goBackTo("/account/listings") falls into the router.dismissTo branch
//   because isTabRootPath's regex only matches bare tab-root segments.
//   dismissTo walks the CURRENT (listings-tab) stack — /account/listings
//   is in the account-tab stack, so dismissTo silently no-ops.
//
// Run (from repo root):
//   node_modules/.bin/vitest run \
//     --dir .mstack/debug/2026-07-27-0930-back-nav-cross-tab-nested/specs

import { describe, it, expect, vi, beforeEach } from "vitest"

// vi.mock is hoisted; use vi.hoisted so the mock factory can reference
// these fns without a TDZ error.
const mocks = vi.hoisted(() => ({
  dismissTo: vi.fn(),
  replace: vi.fn(),
  push: vi.fn(),
  navigate: vi.fn(),
  back: vi.fn(),
  canGoBack: vi.fn(() => false),
}))

vi.mock("expo-router", () => ({
  router: {
    dismissTo: mocks.dismissTo,
    replace: mocks.replace,
    push: mocks.push,
    navigate: mocks.navigate,
    back: mocks.back,
    canGoBack: mocks.canGoBack,
  },
}))

// Path resolves through the file layout — the debug dir is 3 dirs deep
// under repo root, and goBackTo is at apps/mobile/lib/nav/goBackTo.ts.
import { goBackTo } from "../../../../apps/mobile/lib/nav/goBackTo"

beforeEach(() => {
  mocks.dismissTo.mockClear()
  mocks.replace.mockClear()
  mocks.push.mockClear()
  mocks.navigate.mockClear()
  mocks.back.mockClear()
  mocks.canGoBack.mockReturnValue(false)
})

describe("goBackTo — cross-tab nested origin", () => {
  it("returns to /account/listings via a cross-tab primitive (NOT dismissTo)", () => {
    // The user is on the biz detail screen, inside the HIDDEN listings
    // tab's stack. The origin they came from is /account/listings — a
    // NESTED path under the Account tab. dismissTo cannot walk into
    // another tab's stack, so calling it here silently no-ops.
    goBackTo("/account/listings")

    // Bug assertion: today dismissTo IS called → this expect FAILS,
    // matching the user-reported symptom.
    expect(mocks.dismissTo).not.toHaveBeenCalled()

    // Positive-shape assertion: SOMETHING that actually crosses tabs
    // must have fired. The fix will pick one primitive (see report.md's
    // fix plan for the choice); this test accepts any of the three
    // known cross-tab candidates.
    const crossTabPrimitiveCalled =
      mocks.replace.mock.calls.length > 0 ||
      mocks.push.mock.calls.length > 0 ||
      mocks.navigate.mock.calls.length > 0
    expect(crossTabPrimitiveCalled).toBe(true)
  })
})

describe("goBackTo — regression guards", () => {
  it("still routes '/' via router.replace (Home tab-root)", () => {
    goBackTo("/")
    expect(mocks.replace).toHaveBeenCalledWith("/")
    expect(mocks.dismissTo).not.toHaveBeenCalled()
  })

  it("still routes '/account' via router.replace (Account tab-root)", () => {
    goBackTo("/account")
    expect(mocks.replace).toHaveBeenCalledWith("/account")
    expect(mocks.dismissTo).not.toHaveBeenCalled()
  })

  it("still routes '/listings/<slug>' via dismissTo (same-stack pop)", () => {
    // A subcategory page inside the listings tab, from which the biz
    // detail was pushed. Same stack → dismissTo is correct here and
    // must be preserved.
    goBackTo("/listings/restaurants")
    expect(mocks.dismissTo).toHaveBeenCalledWith("/listings/restaurants")
    expect(mocks.replace).not.toHaveBeenCalled()
    expect(mocks.push).not.toHaveBeenCalled()
    expect(mocks.navigate).not.toHaveBeenCalled()
  })
})
