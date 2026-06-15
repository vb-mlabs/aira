# Implementation: Account sub-pages

**Started:** 2026-06-15
**Review:** [2026-06-15-account-sub-pages](../../reviews/2026-06-15-account-sub-pages.md)
**Branch:** feat/rest-api-migration
**Status:** in_progress

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [x] **Task 1:** Add user-prefs columns to `user` schema + migration
  - Files: `packages/db/src/schema/auth.ts`, `packages/db/drizzle/migrations/0024_plain_nightshade.sql`
  - Commit: `08a117b`
  - Notes: Migration is two ADD COLUMN NOT NULL DEFAULT true. Lefthook check-migrations + check-contrast both passed.

- [x] **Task 2:** Add Zod schemas + service for user preferences
  - Files: `packages/validators/src/user-preferences.ts`, `packages/services/src/user-preferences/*`, validators/services barrel updates
  - Commit: `f12230b`
  - Notes: 5 unit tests pass; typecheck green.

- [x] **Task 3:** Add GET + PATCH `/api/v1/profile/preferences` route
  - Files: `apps/web/src/server/operations/user-preferences.ts`, `apps/web/src/app/api/v1/profile/preferences/route.ts`
  - Commit: `7b0c0f9`
  - Notes: Web typecheck green.

- [x] **Task 4:** Add `<AccountBackLink />` component
  - Files: `apps/web/src/app/(app)/account/_components/back-link.tsx`
  - Commit: `ae59940`
  - Notes: Plain server component, ~19 lines.

- [ ] **Task 5:** Add `listMessageRecipientsForEmail` + `getPostAuthorForEmail` helpers
  - Files: `packages/services/src/messages/service.ts`, `packages/services/src/community/service.ts`, tests
  - Commit: —
  - Notes: —

- [ ] **Task 6:** Wire email-send in `sendMessageOp` + `addInterestOp` handlers
  - Files: `apps/web/src/server/operations/messages.ts`, `apps/web/src/server/operations/community.ts`
  - Commit: —
  - Notes: —

- [ ] **Task 7:** Build `/account/notifications` page + toggle component
  - Files: `apps/web/src/app/(app)/account/notifications/page.tsx`, `apps/web/src/app/(app)/account/notifications/_components/preference-toggles.tsx`
  - Commit: —
  - Notes: —

- [ ] **Task 8:** Build `/account/privacy-security`, `/account/terms`, `/account/about` pages
  - Files: three new `page.tsx` under `apps/web/src/app/(app)/account/`
  - Commit: —
  - Notes: —

- [ ] **Task 9:** Update `/account` hub and `/profile` to wire new routes + back link
  - Files: `apps/web/src/app/(app)/account/page.tsx`, `apps/web/src/app/(app)/profile/page.tsx`
  - Commit: —
  - Notes: —
