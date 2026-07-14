# Implementation: admin businesses table restructure

**Started:** 2026-07-14 (session-continuation)
**Review:** [2026-07-14-admin-businesses-table-restructure](../../reviews/2026-07-14-admin-businesses-table-restructure.md)
**Branch:** feat/landing-explainer-videos
**Status:** complete

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [x] **Task 1:** extend list op with plan_name (server)
  - Files: `apps/web/src/server/operations/businesses-admin.ts` (edit)
  - Commit: `baaffb9`
  - Notes: Typecheck clean. LEFT JOIN + `latest_plan_name` schema field + handler map — all three landed in one edit pass.

- [x] **Task 2:** restructure businesses table columns (UI)
  - Files: `apps/web/src/app/admin/businesses/page.tsx` (edit)
  - Commit: `4718cc4`
  - Notes: Typecheck + lint clean. Dropped now-unused `PaymentStatus` type alias while there. AdminBadge import retained for the Status column.
