# QA report — 2026-06-09 20:00

**Focus:** Rating display + admin set/clear (F11)
**Env:** https://9530c32d-ab5f-4ec0-a51f-9153843d1428-00-4yx7b0ti55e3.kirk.replit.dev
**Status:** clean
**Tester:** /mlabs-qa

## Scenarios run

1. S1 — Default admin form shows "No rating" selected — pass
2. S2 — Admin sets 4.5, saves, reload preserves the value — pass
3. S3 — Listings card renders `★ 4.5` next to verified badge — pass
4. S4 — Detail page header renders `★ 4.5` — pass
5. S5 — Admin clears rating to "No rating", reload persists — pass
6. S6 — Cleared rating → card drops the pill — pass
7. S7 — `rating = 0` also hides the pill (PRD rule) — pass
8. S8 — `rating = 5` renders as `★ 5.0` (always 1 decimal) — pass
9. S9 — Regression: `/home` featured + `/admin/businesses` list — pass

Each rating-display scenario set the DB row directly via the
`@neondatabase/serverless` Pool to keep the spec free of inter-test
order coupling. Admin scenarios drove the actual form.

e2e test user was promoted to admin in `beforeAll` and demoted in
`afterAll`. Target row (`biz-001`) reset to `rating = NULL` at start
+ end of run.

## Issues

_none_

## Summary

9 total · 0 critical · 0 high · 0 medium · 0 low

All paths verified: the round-trip admin save → API → display works
both for setting (4.5, 5.0) and for clearing (null, 0). PRD's "hide
stars when 0/null" rule fires on both 0 and null. The 1-decimal
display rule (`★ 5.0`, not `★ 5`) holds.

The Star icon + value pill reads cleanly on both the card (small
inline element next to the blue verified tick) and the detail page
hero (same element, same row as the name + verified).

## Screenshots

- `assets/s1-admin-default.png` — admin form with "No rating" selected
- `assets/s2-admin-saved-4-5.png` — admin form after save + reload
- `assets/s3-card-4-5.png` — Spice Garden card with ★ 4.5
- `assets/s4-detail-4-5.png` — detail page header with ★ 4.5
- `assets/s5-admin-cleared.png` — admin form after clear + reload
- `assets/s6-card-cleared.png` — card with no rating element
- `assets/s7-zero-hidden.png` — rating=0 hides the pill
- `assets/s8-card-5-0.png` — rating=5 renders as ★ 5.0
- `assets/s9-regression.png` — /admin/businesses list with mostly-null
  rating column intact
