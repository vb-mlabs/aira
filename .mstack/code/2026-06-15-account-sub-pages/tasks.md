# Implementation: Account sub-pages

**Started:** 2026-06-15
**Review:** [2026-06-15-account-sub-pages](../../reviews/2026-06-15-account-sub-pages.md)
**Branch:** feat/rest-api-migration
**Status:** complete

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

- [x] **Task 5:** Add `listMessageRecipientsForEmail` + `getPostAuthorForEmail` helpers
  - Files: `packages/services/src/messages/service.ts`, `packages/services/src/community/service.ts`, `__tests__/recipients-helper.test.ts` (x2)
  - Commit: `79c0bae` (service edits, auto-committed by Replit Agent as "Published your App") + `104e048` (tests, auto-committed by Replit Agent)
  - Notes: A Replit auto-commit agent intercepted the task mid-flight and split my changes across two commits with its own messages. Functional outcome is correct: 7 new tests pass; 19 messages tests still pass.

- [x] **Task 6:** Wire email-send in `sendMessageOp` + `addInterestOp` handlers
  - Files: `apps/web/src/server/operations/messages.ts`, `apps/web/src/server/operations/community.ts`, `apps/web/src/lib/email/index.ts` (re-export buildAppLinkUrl), service barrels (re-export helpers + types), community service (added post_title to helper) + test
  - Commit: `f297096`
  - Notes: Two layers of try/catch: inner around each send (PII-stripped log), outer around the lookup. Extended getPostAuthorForEmail to return post_title so the op handler can build the email body without a follow-up query.

- [x] **Task 7:** Build `/account/notifications` page + toggle component
  - Files: `apps/web/src/app/(app)/account/notifications/page.tsx`, `apps/web/src/app/(app)/account/notifications/_components/preference-toggles.tsx`
  - Commit: `3640c16`
  - Notes: Switches built with role="switch" buttons (no ui-web Switch primitive exists). Optimistic update with revert-on-error.

- [x] **Task 8:** Build `/account/privacy-security`, `/account/terms`, `/account/about` pages
  - Files: three new `page.tsx` under `apps/web/src/app/(app)/account/`
  - Commit: `f148432`
  - Notes: Brand strings flow through `{brand.*}` exclusively; `no-brand-string-literal` ESLint rule passes. Terms/About marked "pre-launch drafts" / "Version: MVP".

- [x] **Task 9:** Update `/account` hub and `/profile` to wire new routes + back link
  - Files: `apps/web/src/app/(app)/account/page.tsx`, `apps/web/src/app/(app)/profile/page.tsx`
  - Commit: `19d54ff`
  - Notes: Removed the `placeholder: true` flag entirely (no more dimmed rows). `/profile` now only renders `<AccountBackLink />` + heading + `<AccountSection />`.
