# QA report — 2026-06-09 19:00

**Focus:** Listings pagination + scoped search (F7 + F8)
**Env:** https://9530c32d-ab5f-4ec0-a51f-9153843d1428-00-4yx7b0ti55e3.kirk.replit.dev
**Status:** clean (1 issue found and fixed)
**Tester:** /mlabs-qa

## Scenarios run

1. S1 — Default landing renders ≤12 cards + Pagination row — pass
2. S2 — Page 2 navigation (URL → ?page=2, returns final 3 cards) — pass
3. S3 — Search "spice" debounces 300ms then pushes URL — pass
4. S4 — Clear ✕ button restores `/listings/restaurants` — pass
5. S5 — Verified toggle filters server-side (8 verified cards) — pass
6. S6 — Search "zzznomatch" empty state with query echoed — pass
7. S7 — Browser back/forward navigates URL history — pass
8. S8 — Category switcher clears `?q=` and `?verified=` — pass
9. S9 — Regression: `/home` featured strip still renders — pass

Tested against a temporary dataset of 15 restaurants (3 existing seeded
businesses + 12 QA-prefixed inserts; 8 verified, 7 unverified). Spec
cleans up its inserts in `afterAll`.

## Issues

### Issue 1: Listings page lacks a semantic page heading

- **Severity:** low
- **Repro:**
  1. Open `/listings/restaurants`
  2. Inspect the "Restaurants" label at the top of the content area
  3. Note it's rendered as a `<span>`, not a `<h1>` or similar
- **Expected:** The category title should be a level-1 heading
  (`<h1>`) so screen readers announce the page subject, SEO engines
  treat it as the canonical page title, and the document outline
  makes sense.
- **Actual:** `apps/web/src/features/listings/components/listing-view.tsx:117`
  renders it as a `<span>` overlaid by a transparent `<select>` to
  power the category-switcher dropdown trick.
- **Screenshot:** assets/s1-default.png (top of frame)
- **Console errors:** none
- **Suspected cause:** the dropdown-trick design pattern — the
  category label and the dropdown trigger share the same visible text.
  The fix needs to preserve that trick while making the visible text a
  heading element.
- **Fix plan:** wrap the visible text in an `<h1>` instead of `<span>`,
  keep the `<select>` overlay (sized against the heading via
  `position: absolute; inset: 0`). One small change in
  `listing-view.tsx`.
- **Status:** ✓ fixed (commit `8d44d1f`)
- **Verification:** S1 re-run with strengthened assertion
  `getByRole("heading", { level: 1, name: "Restaurants" })` passes.

## Summary

1 total · 0 critical · 0 high · 0 medium · 1 low

All 9 functional scenarios pass — pagination, search debounce, URL state,
verified filter, browser navigation, category switching, and the home
regression check. The lone issue is a semantic/a11y polish item, not a
functional bug.
