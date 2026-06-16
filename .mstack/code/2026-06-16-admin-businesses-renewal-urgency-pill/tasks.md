# Implementation: admin businesses — renewal urgency caption + overdue row stripe

**Started:** 2026-06-16
**Completed:** 2026-06-16
**Review:** [2026-06-16-admin-businesses-renewal-urgency-pill](../../reviews/2026-06-16-admin-businesses-renewal-urgency-pill.md)
**Branch:** feat/admin-businesses-renewal-urgency-pill
**Status:** complete

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [x] **Task 1:** Extract expiryLabel into shared helper + Vitest
  - Files:
    - `apps/web/src/features/admin/renewals/expiry-label.ts` (new)
    - `apps/web/src/features/admin/renewals/renewal-queue-table.tsx` (edit)
    - `apps/web/src/features/admin/renewals/expiry-label.test.ts` (new)
  - Commit: f1d30c7
  - Notes: All 171 existing tests still pass; typecheck clean; lefthook green. Co-located the test under src/ (vitest config supports both src/**/*.test.ts and tests/**/*.test.ts; the review spec said co-located).

- [x] **Task 2:** Extend AdminBusinessItemSchema with end_date + days_remaining
  - Files:
    - `apps/web/src/server/operations/businesses-admin.ts` (edit)
  - Commit: c991780
  - Notes: Schema extension only — no migration, no service touch. Pre-existing unused-import warnings in this file surface on lint but they're not introduced by this change; left alone per "don't refactor beyond what the task requires."

- [x] **Task 3:** Render caption + overdue row treatment on /admin/businesses
  - Files:
    - `apps/web/src/app/admin/businesses/page.tsx` (edit)
  - Commit: 75797a0
  - Notes: 2-colour palette as locked. days_remaining < 0 takes the overdue treatment regardless of payment_status. Box-shadow inset border works on the <tr> without competing with the whole-row after:* link.
