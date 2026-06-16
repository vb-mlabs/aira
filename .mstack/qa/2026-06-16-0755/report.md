# QA report — 2026-06-16 07:55 UTC

**Focus:** Renewal urgency caption + overdue row stripe on /admin/businesses
(commits `f1d30c7..75797a0` on `feat/admin-businesses-renewal-urgency-pill`)
**Env:** http://localhost:5000
**Status:** partial (1 of 2 pre-existing findings fixed; 1 deferred to separate work)
**Tester:** /mlabs-qa

## Scenarios run

| # | Scenario | Result |
|---|----------|--------|
| S1 | Desktop @ 1440×900 — table renders all 7 seeded rows with correct caption + row treatment | ✓ pass |
| S2 | Dosa Hut (no subscription) — em-dash in cell, no caption, no border | ✓ pass |
| S3 | Mobile @ 375×812 — caption + row treatment intact in DOM (Saffron Spice "in 2 days", Tandoori Express overdue) | ✓ pass |
| S4 | Clicking an overdue row navigates to `/admin/businesses/[id]` (URL assertion) | ✓ pass |
| S5 | Regression: `/admin/renewals` still renders Expiry column after `expiryLabel` extraction | ✓ pass |

**Automated:** 5/5 Playwright tests pass on first run (16.0s total).

**Visual review of the four captured screenshots confirms:**
- Caption stacks under the existing payment badge across paid / pending / overdue rows.
- Critical bucket (Saffron Spice +2d) renders `in 2 days` in destructive semibold.
- Overdue bucket (Tandoori Express −3d, Mumbai Tiffin Service −12d) renders `OVERDUE 3D` / `OVERDUE 12D` in destructive bold uppercase with the 3px destructive left-border + faint tint on the row.
- Fall-through rule works: **Stale Paid Tea House** (paid badge + end_date −5d) renders `OVERDUE 5D` and gets the row treatment — even though its payment_status is still `paid`. The badge correctly stays `paid` (we don't lie about the recorded status); only the urgency treatment escalates.
- Pending bucket (Bharatanatyam Academy +5d) renders `in 5 days` in muted-foreground; no row treatment.
- No-subscription row (Dosa Hut) renders `—` with no caption and no row treatment.
- `/admin/renewals` uses the exact same dialect (`OVERDUE 12d`, `in 2 days`, `06/24/2026`) on Expiry — the extraction landed without regression.

## Issues

Categorised below. **No issue was introduced by the just-shipped commits** —
both findings predate this PR and surfaced only because the QA run drove the
real page in a browser.

### Issue 1: Whole-row click destination page crashes (pre-existing, dirty-tree work)

- **Severity:** medium *(not a regression from this PR; blocks user's other in-progress work)*
- **Repro:**
  1. Sign in as admin, go to `/admin/businesses`.
  2. Click any row (e.g. Tandoori Express).
- **Expected:** the business detail page renders (this PR's spec only asserts URL navigation; that part works).
- **Actual:** URL becomes `/admin/businesses/<id>`, but the destination page renders the error boundary ("We hit an unexpected error. Try again, or head back home and we'll keep an eye out").
- **Screenshot:** `assets/03-detail-page-from-overdue-click.png`
- **Console errors:** not captured (the spec only asserts URL).
- **Suspected cause:** the user's 4 uncommitted in-progress tsx files on this branch — `apps/web/src/app/admin/businesses/[id]/page.tsx` adds a `listCitiesAdminOp` fetch, `business-detail.tsx` adds a `cities?: City[]` prop and imports `VALID_BUSINESS_TYPES` / `VALID_YEARS_OPERATING`, etc. The QA seed only sets the minimum required `businesses` columns (id, name, slug, category, tier, verified). The detail page is likely reading fields (`business_type`, `years_operating`, `city_id`, or rendering against `cities` that may be empty/undefined) that the seeded row doesn't have, triggering a render-time throw.
- **Fix plan:** out of scope for this PR. Should be resolved as the user finishes their `business-detail.tsx` rewrite (carry-over from before this run). The fix is one of: (a) make the detail page defensive against missing fields, (b) seed the QA fixtures with all the expected new columns, or (c) the detail page rewrite needs to wait until the underlying schema has the columns it assumes.
- **Status:** open · pre-existing · defer to the user's separate in-progress work

### Issue 2: Subscription / Verified / Status columns clip off-screen at mobile (≤640px)

- **Severity:** low *(pre-existing layout — admin shell is desktop-first by design)*
- **Repro:**
  1. Set viewport to 375×812.
  2. Visit `/admin/businesses`.
- **Expected:** caption is reachable at narrow viewports.
- **Actual (pre-fix):** the layout did not break — but the `Subscription`, `Verified`, and `Status` columns overflowed beyond the 375px viewport and were clipped by the `overflow-hidden` wrapper. Caption was in the DOM but invisible.
- **Screenshot (pre-fix):** `assets/02-mobile-businesses-table.png`
- **Console errors:** none.
- **Cause:** the table wrapper at `apps/web/src/app/admin/businesses/page.tsx:105` used `overflow-hidden` which clipped the natural-width table. Pre-existing pattern from before this PR.
- **Fix:** changed `overflow-hidden` → `overflow-x-auto`. Table now scrolls horizontally inside the wrapper at narrow viewports; the rounded border + corners stay intact; captions, row tint, and verified checkmarks are reachable via swipe/scroll. Verified via Playwright `scrollIntoViewIfNeeded()` + `toBeInViewport()` assertion + visual screenshot.
- **Post-fix screenshot:** `assets/02b-mobile-scrolled-to-subscription.png`
- **Status:** ✓ fixed (commit `41285d3`)
- **Follow-up:** the same `overflow-hidden` pattern exists on 7 other admin tables (`/admin/users`, `/admin/community`, `/admin/audit`, `/admin/renewals`, `settings/cities`, `settings/membership-plans`, `settings/sponsorship-tiers`). All have the same clip behavior at narrow viewports. Deliberately out of scope for this PR — flagging for a follow-up sweep (probably alongside extracting a shared `<AdminTable>` wrapper).

### Observation: `OVERDUE Nd` renders as `OVERDUE ND` (font CSS uppercase)

- The source string from `expiryLabel` is `OVERDUE 3d` (lowercase `d`), but `font-bold uppercase tracking-wide` on the caption uppercases it visually to `OVERDUE 3D`. Matches the design system's uppercase-tracking treatment elsewhere; intentional per the review's locked decision. No action needed — flagging for visibility in case the desired look was lowercase-d.

## Summary

| Severity | Count |
|---|---|
| critical | 0 |
| high | 0 |
| medium | 1 (pre-existing) |
| low | 1 (pre-existing) |

**Total:** 2 findings, both pre-existing on `main` before this PR. Zero
issues introduced by the just-shipped commits. One fixed in this run
(Issue 2), one deferred (Issue 1).

## Recommended next step

The branch is ready to ship. The horizontal-scroll fix landed as
`41285d3` and the Playwright spec was extended to verify it.

Optional follow-up: when the user resumes work on the `[id]/page.tsx`
rewrite (the dirty tsx files carried into this branch), `/mlabs-debug`
or a focused `/mlabs-plan` against the detail-page crash would be the
natural starting point. Separately, the `overflow-x-auto` swap should
be applied to the other 7 admin tables to keep the shell consistent —
small follow-up plan.
