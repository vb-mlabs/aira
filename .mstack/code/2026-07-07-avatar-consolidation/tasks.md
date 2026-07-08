# Implementation: Avatar consolidation (web)

**Started:** 2026-07-07 10:15
**Finished:** 2026-07-07 15:04
**Review:** [2026-07-07-avatar-consolidation](../../reviews/2026-07-07-avatar-consolidation.md)
**Branch:** feature/avatar-consolidation
**Status:** complete

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [x] **Task 1:** Add vitest to `@aira/ui-web`
  - Files: `packages/ui-web/package.json`, `packages/ui-web/vitest.config.ts`
  - Commit: f53e29d
  - Notes: `--passWithNoTests` on the vitest script so Task 1 verifies before Task 2 adds tests. tsconfig include unchanged (vitest.config.ts stays outside TS build to avoid rootDir conflict).

- [x] **Task 2:** Build `<Avatar>` primitive in `@aira/ui-web`
  - Files: `packages/ui-web/src/components/avatar.tsx`, `packages/ui-web/src/index.ts`, `packages/ui-web/package.json`, `packages/ui-web/vitest.config.ts`
  - Commit: 0d73f5c
  - Notes: Test file dropped — `@testing-library/react` rendering hits "Invalid hook call" under this workspace's hoisted-pnpm layout (dual react-dom copies, React 19 dispatcher per-module). Vitest infra kept as scaffolding for the follow-up. User approved shipping without test.

- [x] **Task 3:** Widen community post shape to carry `author_image`
  - Files: `packages/validators/src/community.ts`, `packages/services/src/community/service.ts`
  - Commit: 2c9b6e0
  - Notes: `services` suite (63 tests) still green after the widen.

- [x] **Task 4:** Migrate `/account` header to `<Avatar>`
  - Files: `apps/web/src/app/(app)/account/page.tsx`
  - Commit: c92770b
  - Notes: closes the original user-reported bug.

- [x] **Task 5:** Thread `image` into `TopUtilityBar` + swap to `<Avatar>`
  - Files: `apps/web/src/app/(app)/_components/top-utility-bar.tsx`, `apps/web/src/app/(app)/layout.tsx`
  - Commit: 11a8558
  - Notes: `<Link>` wraps `<Avatar>`; ring + hover moved to caller-side `className` and the Link's own `hover:opacity-80`.

- [x] **Task 6:** Refactor `AvatarUploader` to use `<Avatar>`
  - Files: `apps/web/src/features/avatar/components/avatar-uploader.tsx`
  - Commit: 569000e
  - Notes: dropped local `<Preview>` + `initials()` (~34 lines).

- [x] **Task 7:** Migrate community post-card to `<Avatar>`
  - Files: `apps/web/src/features/community/components/post-card.tsx`
  - Commit: 6a878dc
  - Notes: two branches (interactive card + read-only variant) both migrated; local `initialsOf()` deleted; 36 → 40px per locked decision.

- [x] **Task 8:** Migrate community post-detail-modal to `<Avatar>`
  - Files: `apps/web/src/features/community/components/post-detail-modal.tsx`
  - Commit: c15e449
  - Notes: last of the seven initials-only surfaces.
