# Implementation: Admin waitlist page

**Started:** 2026-06-27 01:25
**Review:** [2026-06-27-admin-waitlist-page](../../reviews/2026-06-27-admin-waitlist-page.md)
**Branch:** feat/qa-test-accounts-seed
**Status:** complete

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [x] **Task 1:** Add `waitlist.delete` action + `waitlist` target type to audit registry
  - Files: `packages/validators/src/audit-meta.ts` (edit)
  - Commit: `639b8df`
  - Notes: parity check stays green

- [x] **Task 2:** Add admin list/count schemas to validators
  - Files: `packages/validators/src/waitlist.ts` (edit)
  - Commit: `a83fb4d`
  - Notes: —

- [x] **Task 3:** Add waitlist admin service
  - Files: `packages/services/src/waitlist/service.ts` (new), `packages/services/src/waitlist/index.ts` (new), `packages/services/src/index.ts` (edit)
  - Commit: `4da323d`
  - Notes: type narrowing for snapshot.type captured into typed local before transaction closure; subpath import resolved via `@aira/validators` root re-export

- [x] **Task 4:** Add waitlist admin operations + API routes
  - Files: `apps/web/src/server/operations/waitlist-admin.ts` (new), `apps/web/src/app/api/v1/admin/waitlist/{route.ts,[id]/route.ts,counts/route.ts}` (new)
  - Commit: `af45082`
  - Notes: T8 pulled forward to keep typecheck green
- [x] **Task 8:** Wire `waitlist.delete` into the audit-log renderer
  - Files: `apps/web/src/features/admin/audit/{render-detail,render-target}.tsx` (edit)
  - Commit: `ab24225`
  - Notes: pulled forward ahead of T4 so the web typecheck passes on every commit

- [x] **Task 6:** Add consumer + business client tables (no row actions yet)
  - Files: `features/admin/waitlist/{consumer-table,business-table,source-label,format-date}.{tsx,ts}` (new)
  - Commit: `7951a5b`
  - Notes: pulled forward ahead of T5 so page.tsx imports compile

- [x] **Task 5:** Add `/admin/waitlist` page + sidebar entry
  - Files: `apps/web/src/app/admin/waitlist/page.tsx` (new), `features/admin/waitlist/{waitlist-tabs,waitlist-counts-header}.tsx` (new), `admin-sidebar.tsx` (edit)
  - Commit: `de33747`
  - Notes: —

- [x] **Task 7:** Add row actions (copy email/phone + delete with confirm)
  - Files: `features/admin/waitlist/{row-actions,delete-waitlist-dialog}.tsx` (new); tables edit
  - Commit: `dd92890`
  - Notes: 404 from DELETE treated as "row already gone" — soft close + refresh

- [-] **Task 9:** End-to-end Playwright happy path
  - Files: `apps/web/e2e/admin-waitlist.spec.ts` (new)
  - Commit: —
  - Notes: skipped per /mlabs-code anti-pattern; will be covered by /mlabs-qa
