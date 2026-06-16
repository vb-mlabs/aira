# QA report — 2026-06-15 12:15

**Focus:** F22 admin audit log UI (filters + readable rendering)
**Env:** localhost:5000 (Replit dev, Next.js 16 + Turbopack)
**Status:** clean
**Tester:** /mlabs-qa

---

## Scenarios run

All 9 run against the dev server with a freshly provisioned F22 admin
persona + 24 seeded audit_log rows (one per AuditMeta.kind). Final pass:
**9/9 ✓**.

| # | Scenario | Result |
|---|---|---|
| S1 | Page loads with no filters; English detail + correct target links | ✓ |
| S2 | All 24 action kinds render an English sentence (no raw JSON) | ✓ |
| S3 | Actor typeahead: debounce search → select locks ?actor_id → clear drops it → pagination resets | ✓ |
| S4 | Target-type filter: select "business" → only business rows → clear; URL-driven | ✓ |
| S5 | Action filter: optgroups present (User/Business/Community/Settings/Session); select + clear | ✓ |
| S6 | Combined filters compose with AND semantics | ✓ |
| S7 | Empty state when filters match zero rows (future date range) | ✓ |
| S8 | No hydration warnings on /admin/audit | ✓ |
| S9 | Target-id links: user → /admin/users/[id]; business_subscription → /admin/businesses/[business_id]; community_post → /admin/community | ✓ |

All assets under `assets/` (s1-…s9c-….png).

## Issues

_None._

## Spec-level fixes (not feature issues)

Three spec-authoring corrections made during the run (none reflect feature
bugs):

1. **Strict mode violations** — Playwright's strict mode rejects `toBeVisible()`
   on a locator that resolves to multiple elements. DB has many prior QA runs'
   `business.archived` rows, so locators like `locator("td").filter(...)` that
   look across the full page needed `.first()`. Added `.first()` on 3 assertions
   in S1 and S5.

2. **`user_role` enum** — The global setup initially used `role: 'user'`
   which is not a valid enum value in this schema (valid values are
   `end_user`, `admin`, `super_admin`). The insert failed silently (psql exits 0
   on SQL errors by default). Fixed to `'end_user'`.

3. **`fill()` vs `pressSequentially()` on controlled inputs** — `page.fill()`
   on a React-controlled `type="search"` input didn't trigger the `onChange`
   handler reliably in dev mode (hydration timing). Replaced with
   `actorInput.click()` + `actorInput.pressSequentially("…", { delay: 50 })`
   to fire one keystroke at a time and let React's synthetic handler fire.

## Summary

9 scenarios · 9 ✓ on first (and only) full pass · 0 issues.

The feature **works end-to-end**: readable summaries for all 24 audit kinds,
actor typeahead (debounce, select, clear), target-type and action filter
dropdowns (URL-driven, "Clear all" button), combined AND filter semantics,
empty-state copy, no hydration warnings, correct target-id links across all
7 target types.

**Recommended next step:** ship — F22 is QA-clean.
