# Implementation: Mobile — My Profile screen (email + password) + drop avatar crop step

**Started:** 2026-07-06
**Review:** [2026-07-06-mobile-my-profile-and-avatar-nocrop](../../reviews/2026-07-06-mobile-my-profile-and-avatar-nocrop.md)
**Branch:** main
**Status:** complete

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [x] **Task 1:** Wire `requestEmailChange` API + `useRequestEmailChange` hook
  - Files: `apps/mobile/features/profile/api.ts`, `apps/mobile/features/profile/hooks.ts`
  - Commit: `512f621`
  - Notes: bundled plan + review docs and code ledger scaffolding into this commit

- [x] **Task 2:** Add hub row + new `/account/profile` screen
  - Files: `apps/mobile/app/(app)/account/index.tsx`, `apps/mobile/app/(app)/account/profile.tsx` (new)
  - Commit: `df096aa`
  - Notes: —

- [x] **Task 3:** Drop the avatar crop step
  - Files: `apps/mobile/features/avatar/api.ts`
  - Commit: `e149736`
  - Notes: —
