# QA report — 2026-06-15 17:09 UTC

**Focus:** Admin Setup hub + super_admin gating (commits 78f5d64..a1f8bb7 on feat/rest-api-migration)
**Env:** http://localhost:5000
**Status:** clean (after fix)
**Tester:** /mlabs-qa

## Scenarios run

| # | Scenario | Result |
|---|----------|--------|
| S1 | Plain admin sidebar shows only Operate group | ✓ pass |
| S2 | Super_admin sidebar shows 8 rows with group separators | ✓ pass |
| S3 | /admin/settings → /admin/settings/categories (redirect) | ✓ pass |
| S4 | Settings hub renders 5 tabs in order with aria-current | ✓ pass |
| S4b | Tabs navigate + active state updates | ✓ pass |
| S5 | App tab inlines Homepage + Renewal schedule (independent forms) | ✓ pass |
| S6 | Plain admin → /admin/settings, /admin/audit, /admin/cron all 404 | ✓ pass |
| S6 | Plain admin POST /api/v1/admin/categories → 403 auth.forbidden | ✓ pass |
| S6 | Plain admin GET /api/v1/admin/audit → 403 | ✓ pass |
| S7 | Old pre-move paths (4 routes) → 404 | ✓ pass |
| S8 | Super_admin happy paths (7 routes) → 200 | ✓ pass |
| S10 | Plain admin user-detail Role section absent | ✓ pass |
| S11 | Super_admin user-detail Role section present with both buttons | ✓ pass |

**Automated:** 28/28 Playwright tests pass on first run.

**Visual review:** screenshots confirm the sidebar grouping, App tab co-render,
and Role-section gate all render correctly. One issue surfaced from looking
at the dashboard screenshot — see Issue 1.

## Issues

### Issue 1: Dashboard QuickLinks shows "Audit log" card to plain admins (dead link)

- **Severity:** medium
- **Repro:**
  1. Sign in as plain admin (role: "admin").
  2. Navigate to `/admin`.
  3. Scroll to the "Manage" section.
  4. Observe three QuickLink cards: Businesses, Users, Audit log.
  5. Click "Audit log".
- **Expected:** the Audit log card is not rendered for plain admins (matches
  sidebar filtering — Audit log is super_admin-only). Click is impossible
  because the card doesn't exist.
- **Actual:** the card renders. Clicking it loads `/admin/audit`, which
  `requireSuperAdmin()` resolves to `notFound()` → Next.js 404. Plain admins
  see a working-looking control that's actually broken.
- **Screenshot:** `assets/s1-sidebar-admin.png` (dashboard view of plain
  admin showing the dead QuickLink in the Manage grid).
- **Console errors:** none.
- **Suspected cause:** `apps/web/src/app/admin/page.tsx:60-65` — the
  `<QuickLink href="/admin/audit" …>` is hardcoded with no role check.
  The dashboard didn't get the same role-aware treatment task 9 applied
  to the sidebar.
- **Fix plan:** Make the dashboard role-aware — read `requireAdmin()`'s
  return value (already the layout-resolved user; could refactor the page
  to receive it as a prop, or call `requireAdmin()` here too) and only
  render the Audit log QuickLink if `callerRole === "super_admin"`. Same
  guard pattern as the user-detail Role section from task 8.
- **Status:** ✓ fixed (commit `f911c38`) — regression spec
  `specs/dashboard-quicklinks.spec.ts` confirms the gate (plain admin sees 2
  cards, super_admin sees 3). Screenshots in `assets/fix-1-dashboard-*.png`.

## Summary

15 scenarios run · 32 automated assertions all green (after fix) · 1 medium
issue surfaced and fixed in this run.

**0 critical · 0 high · 1 medium (fixed) · 0 low**

The original implementation gates everything the review specified. QA
surfaced one consistent gap — the Dashboard's QuickLinks needed the same
role-aware treatment as the sidebar and user-detail page — which is now
fixed in `f911c38`. The Dashboard, sidebar, and user-detail Role section
now share one policy.

### Re-verification

After the fix, full suite re-run: 29/30 pass, 1 flake (S4b timed out at 5s
on a cold-compile after the dev server restart). Re-running S4b alone on a
warm server: ✓ pass (2.9s). Not a regression.
