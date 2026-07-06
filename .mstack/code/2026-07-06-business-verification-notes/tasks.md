# Implementation: Business verification workflow

**Started:** 2026-07-06 13:35
**Review:** [2026-07-06-business-verification-notes](../../reviews/2026-07-06-business-verification-notes.md)
**Branch:** feat/featured-business-selection
**Status:** complete

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [x] **Task 1:** Register business.verification_changed audit kind
  - Files: `packages/validators/src/audit-meta.ts`, `apps/web/src/features/admin/audit/render-detail.tsx`
  - Commit: `91d122b`
- [x] **Task 2:** Schema + migration for verification_notes
  - Files: `packages/db/src/schema/businesses.ts`, `packages/db/drizzle/migrations/0034_fast_maria_hill.sql` (new)
  - Commit: `222243b`
  - Notes: `pnpm db:generate` produced exactly one new migration file with a single `ALTER TABLE ADD COLUMN` statement. Snapshot metadata (`meta/0034_snapshot.json`, `meta/_journal.json`) rode the same commit.
- [x] **Task 3:** Validators + service diff/audit + admin projection
  - Files: `packages/validators/src/businesses.ts`, `packages/services/src/businesses/queries.ts`, `packages/services/src/businesses/service.ts`
  - Commit: `3348d51`
  - Notes: services test suite (63/63) still passes. Audit branch emits outside the mutation transaction (mirrors the contact_person_changed precedent — see TODOs for the atomicity follow-up).
- [x] **Task 4:** Admin detail UI (modal textarea + read section)
  - Files: `apps/web/src/features/admin/components/business-detail.tsx`
  - Commit: `ec47da4`
  - Notes: `AiraReviewSection` + `AiraReviewEditModal` widened from `Business` → `BusinessAdmin`. Only caller (BusinessAdminDetail) already passes BusinessAdmin — Pause-if trigger (widening breaks non-admin callers) didn't fire; grep confirmed no such callers exist.
- [x] **Task 5:** Admin list polish (— for unverified + notes tooltip)
  - Files: `apps/web/src/app/admin/businesses/page.tsx`
  - Commit: `6a9054c`
  - Notes: One retry — first attempt put `title` directly on the Lucide `BadgeCheck` component which doesn't accept it. Wrapped in a `<span title={notes}>` instead. Second attempt clean.
