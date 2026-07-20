// Repro spec for .mstack/debug/2026-07-20-1810-back-nav-skips-listings
//
// Pre-fix: BusinessCard.tsx and AppDrawerContent.tsx each held an
// inline useMemo that stripped only `from` from searchParams. Since
// expo-router's useLocalSearchParams() merges route segments with
// query params, that inline logic preserved route segments like
// `category` as query params on the back-href, producing malformed
// URLs like `/listings/restaurants?category=restaurants` that
// router.replace couldn't route reliably — user landed on Home / Post
// instead of the intermediate /listings/<sub>.
//
// Post-fix: the logic lives in apps/mobile/lib/nav/buildBackHref.ts as
// a pure function (`buildBackHref`) and a hook (`useBuildBackHref`).
// The pure function additionally strips route-segment param names
// (`category`, `id`).
//
// Run: `pnpm vitest run .mstack/debug/2026-07-20-1810-back-nav-skips-listings/specs/repro.spec.ts`

import { describe, expect, it } from "vitest";
import { buildBackHref } from "../../../../apps/mobile/lib/nav/buildBackHref";

describe("buildBackHref — drawer drill-in chain", () => {
  // Scenario 1: user opens drawer from Home, taps main → sub, then
  // taps a business card. The drawer pushes /listings/[category]?from=/
  // — so on that screen useLocalSearchParams returns
  // { category: <slug>, from: "/" } (expo-router merges route segments
  // + query params — confirmed via the hook's own docs at
  // node_modules/expo-router/build/hooks.d.ts:
  //   "For dynamic routes, both the route parameters and the search
  //    parameters are returned").
  it("scenario 1 — from Home via drawer sub-menu tap", () => {
    const backHref = buildBackHref("/listings/restaurants", {
      category: "restaurants",
      from: "/",
    });

    // Clean URL, no redundant `?category=restaurants` — router.replace
    // on this URL unambiguously matches /listings/[category] with
    // category=restaurants.
    expect(backHref).toBe("/listings/restaurants");
  });

  // Scenario 2: user visited Post on AIRA earlier so the app's stack
  // includes it, then opens drawer (from wherever they are now) and
  // taps a sub-menu. Same shape.
  it("scenario 2 — from a screen with other stack entries below", () => {
    const backHref = buildBackHref("/listings/restaurants", {
      category: "restaurants",
      from: "/post",
    });

    expect(backHref).toBe("/listings/restaurants");
  });

  // Regression guard: if a listings screen ALSO has genuine query
  // params (search, verified filter), those SHOULD be preserved on
  // the back-href — that's the reason the loop was written in the
  // first place. The fix must not regress this case.
  it("preserves genuine query params (q, verified) on the back-href", () => {
    const backHref = buildBackHref("/listings/restaurants", {
      category: "restaurants",
      q: "coffee",
      verified: "1",
      from: "/",
    });

    // Order-agnostic assertion — URLSearchParams doesn't guarantee
    // insertion order in serialization, and either order is valid.
    const url = new URL(backHref, "http://x");
    expect(url.pathname).toBe("/listings/restaurants");
    expect(url.searchParams.get("q")).toBe("coffee");
    expect(url.searchParams.get("verified")).toBe("1");
    expect(url.searchParams.has("category")).toBe(false);
    expect(url.searchParams.has("from")).toBe(false);
  });
});
