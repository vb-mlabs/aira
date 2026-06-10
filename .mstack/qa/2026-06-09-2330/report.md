# QA report — 2026-06-09 23:30

**Focus:** Full smoke pass — S2 (City scoping + Category tree + Homepage CMS)
**Env:** https://9530c32d-ab5f-4ec0-a51f-9153843d1428-00-4yx7b0ti55e3.kirk.replit.dev
**Status:** clean
**Tester:** /mlabs-qa

## Scenarios run

1. Admin categories — list page loads with seeded tree — pass
2. Admin categories — create root category — pass
3. Admin categories — create child category — pass
4. Admin categories — edit category name — pass
5. Admin categories — drag handles render — pass
6. Admin categories — deactivate dialog + confirm — pass
7. Admin cities — list page shows Atlanta — pass
8. Admin cities — create then edit a city — pass
9. Admin homepage CMS — form loads with seed values — pass
10. Admin homepage CMS — save stat override, verify on /home — pass
11. Admin homepage CMS — about title update reflects on /home — pass
12. Public sidebar — renders DB categories — pass
13. Public /listings/[slug] — valid slug loads listings page — pass
14. Public /listings/[slug] — unknown slug returns 404 — pass
15. Public /home — renders about section and stat cards — pass

## Issues

### Issue 1: Businesses stat card shows "—" despite active businesses in DB
- **Severity:** medium
- **Repro:**
  1. Navigate to `/home`
  2. Observe "Businesses Listed" stat card
- **Expected:** Card shows the count of active businesses (e.g. 12)
- **Actual:** Card shows "—" (dash fallback)
- **Screenshot:** assets/10b-home-stat-override.png (businesses card shows "—", community members shows "999" override confirming the CMS path works)
- **Console errors:** none
- **Suspected cause:** `packages/services/src/businesses/queries.ts` — `countActiveBusinesses` returns `row?.value` directly, but PostgreSQL `COUNT(*)` is returned as a **string** (`"12"`) by `@neondatabase/serverless`. The homepage guard `Number.isFinite(bizCount)` returns `false` for a string, so the stat renders "—". Confirmed by direct DB query: `value: "12", typeof: "string", Number.isFinite: false`.
- **Fix plan:** In `countActiveBusinesses`, wrap the return in `Number(...)`: `return Number(row?.value ?? 0)`. One-line change; no schema or migration needed.
- **Status:** ✓ fixed (commit 233f144)

## Summary

1 total · 0 critical · 0 high · 1 medium · 0 low
