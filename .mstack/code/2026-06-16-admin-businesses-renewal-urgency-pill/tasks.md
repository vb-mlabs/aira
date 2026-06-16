# Implementation: admin businesses — renewal urgency caption + overdue row stripe

**Started:** 2026-06-16
**Review:** [2026-06-16-admin-businesses-renewal-urgency-pill](../../reviews/2026-06-16-admin-businesses-renewal-urgency-pill.md)
**Branch:** feat/admin-businesses-renewal-urgency-pill
**Status:** in_progress

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [ ] **Task 1:** Extract expiryLabel into shared helper + Vitest
  - Files:
    - `apps/web/src/features/admin/renewals/expiry-label.ts` (new)
    - `apps/web/src/features/admin/renewals/renewal-queue-table.tsx` (edit)
    - `apps/web/src/features/admin/renewals/expiry-label.test.ts` (new)
  - Commit: —
  - Notes: —

- [ ] **Task 2:** Extend AdminBusinessItemSchema with end_date + days_remaining
  - Files:
    - `apps/web/src/server/operations/businesses-admin.ts` (edit)
  - Commit: —
  - Notes: —

- [ ] **Task 3:** Render caption + overdue row treatment on /admin/businesses
  - Files:
    - `apps/web/src/app/admin/businesses/page.tsx` (edit)
  - Commit: —
  - Notes: —
