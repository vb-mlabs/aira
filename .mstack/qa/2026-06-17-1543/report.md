# QA report — 2026-06-17 15:43 UTC

**Focus:** G1 Business Owner Reachability (commits `029defd..b133768` on `feat/business-owner-reachability`)
**Env:** http://localhost:5000
**Status:** report-only (1 pre-existing low-severity finding; PM declined fix to keep scope tight)
**Tester:** /mlabs-qa

## Scenarios run

| # | Scenario | Result |
|---|----------|--------|
| S1 | Admin assigns owner — `/admin/businesses/[unlinked-id]` → picker → confirm → toast + Owner section update | ✓ pass |
| S2a | Admin reassigns owner — replace OWNER_1 with OWNER_2 on linked business; modal warns about replacement | ✓ pass |
| S2b | Admin unassigns owner — Remove → confirm dialog → Owner section empties | ✓ pass |
| S3 | Admin broadcasts to all owners — `/admin/businesses` → Notify all → compose → confirm → recipient count surfaced | ✓ pass |
| S4 | Owner sees `/account/listings` — sign in as OWNER_1 → /account menu → My listings link → linked business renders with correct href to public detail | ✓ pass |
| S5a | Edge case: archived business assignment blocked — POST /api/v1/admin/businesses/[archived-id]/owner returns 400 with code `businesses.archived` | ✓ pass |
| S5b | Edge case: owner filter — `?owner=has` shows linked rows, `?owner=none` hides linked rows | ✓ pass |

**Automated:** 7/7 Playwright tests pass on a clean run (29.8s total). 16 screenshots captured in `assets/`.

## Side effects verified directly against the DB

- `audit_log` rows: `business.owner_assigned ×3`, `business.owner_unassigned ×1`, `business.broadcast_sent ×1` — every scenario left the expected trail (S1 assign, S2 reassign + unassign, S3 broadcast, S3 beforeAll re-link).
- `notifications` rows: `generic ×3` (one per link event, recipient = assigned owner), `business_broadcast ×2` (one per linked-non-banned owner at broadcast time — BIZ_LINKED→OWNER_1, BIZ_UNLINKED→OWNER_2).
- `notifications` for the unassign event: zero (silent unassign locked in the review).

## Issues

### Issue 1: Pre-existing hydration-mismatch warning in FeatureImageControl bleeds into the admin business detail page

- **Severity:** low *(pre-existing — not introduced by G1; flagged because it tripped the QA harness's strict console-error check)*
- **Repro:**
  1. Sign in as admin / super_admin.
  2. Navigate to `/admin/businesses/[any-id]`.
  3. Open DevTools console.
  4. Observe React hydration-mismatch warning fired by the hidden file input inside `FeatureImageControl`.
- **Expected:** No console errors during page load.
- **Actual:** React emits a hydration mismatch on the hidden file input's `style` attribute — SSR renders `clip: "rect(0px, 0px, 0px, 0px)"`, client renders `clip: "rect(0, 0, 0, 0)"`, plus `clipPath`, `margin`, `border`, `overflow` differ between SSR and client.
- **Screenshot:** N/A — console-only.
- **Console errors:**
  ```
  A tree hydrated but some attributes of the server rendered HTML didn't match the client properties.
  ...
  <input accept="image/jpeg,..." style={{
    + border: 0
    + clip: "rect(0, 0, 0, 0)"
    - clip: "rect(0px, 0px, 0px, 0px)"
    + clipPath: "inset(50%)"
    + height: "1px"
    - height: "1px"
    + margin: "0 -1px -1px 0"
    + overflow: "hidden"
  ```
- **Suspected cause:** `apps/web/src/features/admin/components/feature-image-section.tsx` (or whichever drag-and-drop wrapper renders the visually-hidden file input). The SSR HTML is generated from one style-serialiser and the client React from another; common when a third-party file-upload component uses CSS-in-JS that doesn't render deterministically.
- **Fix plan:** Either (a) replace the inline style on the hidden input with a className that uses `.sr-only`-style utilities (deterministic SSR), or (b) wrap the file input in `useEffect` so it only renders client-side. Both are 5-minute fixes.
- **Status:** open *(deferred — see "Approval gate" below)*

## Summary

**1 total · 0 critical · 0 high · 0 medium · 1 low**

The G1 business-owner-reachability feature works end-to-end: admin can assign / reassign / unassign owners, the right audit + notification side effects fire, broadcasts fan out to the right recipients, owners see their listings, and the archived-business assignment block returns the right ApiError code. The one issue surfaced is pre-existing in a different feature (`FeatureImageControl`) — not part of this PR.

## Test fixtures (seeded by `setup/global-setup.ts`)

- **Admin (super_admin):** `qa-owner-admin@mlabs.test` — needs `super_admin` because `/admin/businesses/[id]` pulls cities via `listCitiesAdminOp` (which requires super_admin in this app, a pre-existing constraint unrelated to G1).
- **Owners (end_user):** `qa-owner-1@mlabs.test`, `qa-owner-2@mlabs.test`
- **Businesses:**
  - `qa-biz-unlinked` (no owner, active, with paid subscription) — used for S1
  - `qa-biz-linked` (owner_user_id = OWNER_1, active, with paid subscription) — used for S2 + S3 + S4
  - `qa-biz-archived` (no owner, `deleted_at IS NOT NULL`) — used for S5a

## Recommended next step

Since the one finding is pre-existing tech debt rather than a regression from this branch, the recommendation is to **ship G1 as-is** and file `feature-image-section.tsx` hydration cleanup as a separate small task. The fix is independent of any G1 code path.
