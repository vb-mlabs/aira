// Regression tests for the three-way back-nav routing helper.
//
// Mobile has no test runner wired at the workspace level yet
// (apps/mobile/package.json:14 — the `test` script is a stub), so
// today these run against a standalone vitest — the workspace
// `node_modules/.bin/vitest` binary picks up the vitest.config.ts
// sibling and executes them:
//
//   node_modules/.bin/vitest run apps/mobile/lib/nav/__tests__/
//
// When a real mobile test runner lands, the file lives in the right
// place to be picked up automatically without a move.
//
// See .mstack/debug/2026-07-27-0930-back-nav-cross-tab-nested/report.md
// for the RCA that motivated the split.

import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  dismissTo: vi.fn(),
  replace: vi.fn(),
  push: vi.fn(),
  navigate: vi.fn(),
  back: vi.fn(),
  canGoBack: vi.fn(() => false),
}));

vi.mock("expo-router", () => ({
  router: {
    dismissTo: mocks.dismissTo,
    replace: mocks.replace,
    push: mocks.push,
    navigate: mocks.navigate,
    back: mocks.back,
    canGoBack: mocks.canGoBack,
  },
}));

import { getTargetTab, goBackTo } from "../goBackTo";

beforeEach(() => {
  mocks.dismissTo.mockClear();
  mocks.replace.mockClear();
  mocks.push.mockClear();
  mocks.navigate.mockClear();
  mocks.back.mockClear();
  mocks.canGoBack.mockReturnValue(false);
});

describe("getTargetTab", () => {
  it("maps '/' and '/(app)' to the Home (index) tab", () => {
    expect(getTargetTab("/")).toBe("index");
    expect(getTargetTab("/(app)")).toBe("index");
    expect(getTargetTab("/(app)/")).toBe("index");
  });

  it("maps single-segment tab-roots to their tab name", () => {
    expect(getTargetTab("/categories")).toBe("categories");
    expect(getTargetTab("/post")).toBe("post");
    expect(getTargetTab("/account")).toBe("account");
  });

  it("maps nested paths under a visible tab to that tab", () => {
    expect(getTargetTab("/account/listings")).toBe("account");
    expect(getTargetTab("/account/favorites")).toBe("account");
    expect(getTargetTab("/categories/restaurants")).toBe("categories");
  });

  it("returns null for the hidden Listings tab (stay-in-current-stack signal)", () => {
    expect(getTargetTab("/listings/restaurants")).toBe(null);
    expect(getTargetTab("/listings/foo/bar")).toBe(null);
  });

  it("ignores query strings", () => {
    expect(getTargetTab("/account/listings?filter=active")).toBe("account");
    expect(getTargetTab("/categories?roots=1")).toBe("categories");
  });
});

describe("goBackTo — cross-tab nested origin", () => {
  it("returns to /account/listings via router.navigate (NOT dismissTo)", () => {
    goBackTo("/account/listings");
    expect(mocks.dismissTo).not.toHaveBeenCalled();
    expect(mocks.navigate).toHaveBeenCalledWith("/account/listings");
  });

  it("returns to /account/favorites via router.navigate", () => {
    goBackTo("/account/favorites");
    expect(mocks.dismissTo).not.toHaveBeenCalled();
    expect(mocks.navigate).toHaveBeenCalledWith("/account/favorites");
  });
});

describe("goBackTo — bare tab-root origin", () => {
  it("routes '/' via router.replace (Home swap)", () => {
    goBackTo("/");
    expect(mocks.replace).toHaveBeenCalledWith("/");
    expect(mocks.dismissTo).not.toHaveBeenCalled();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it("routes '/account' via router.replace (Account swap)", () => {
    goBackTo("/account");
    expect(mocks.replace).toHaveBeenCalledWith("/account");
    expect(mocks.dismissTo).not.toHaveBeenCalled();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
});

describe("goBackTo — same-stack (or hidden-tab) nested origin", () => {
  it("routes '/listings/<slug>' via router.dismissTo (same-stack pop)", () => {
    // Categories → subcategory → detail — whole flow lives inside
    // the hidden Listings tab. dismissTo is the correct primitive.
    goBackTo("/listings/restaurants");
    expect(mocks.dismissTo).toHaveBeenCalledWith("/listings/restaurants");
    expect(mocks.replace).not.toHaveBeenCalled();
    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();
  });
});

describe("goBackTo — no-origin fallback", () => {
  it("calls router.back() when the stack can go back", () => {
    mocks.canGoBack.mockReturnValue(true);
    goBackTo(undefined);
    expect(mocks.back).toHaveBeenCalled();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("replaces to '/(app)' when the stack cannot go back", () => {
    mocks.canGoBack.mockReturnValue(false);
    goBackTo(undefined);
    expect(mocks.replace).toHaveBeenCalledWith("/(app)");
    expect(mocks.back).not.toHaveBeenCalled();
  });
});
