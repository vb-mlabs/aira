# Implementation: post-cap 3-active

**Started:** 2026-07-22 18:40
**Review:** [2026-07-22-post-cap-3-active](../../reviews/2026-07-22-post-cap-3-active.md)
**Branch:** feat/landing-explainer-videos
**Status:** complete

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [x] **Task 1:** Add MAX_ACTIVE_POSTS_PER_USER + POST_CAP_REACHED_CAPTION + limits schema to validators
  - Files: `packages/validators/src/community.ts`
  - Commit: `efb4e51`
  - Notes: spec ok; validators typecheck clean

- [x] **Task 2:** Swap gate to count-based + add getMyPostLimits service function
  - Files: `packages/services/src/community/service.ts`, `packages/services/src/community/index.ts`
  - Commit: `097b099`
  - Notes: spec ok; services typecheck clean

- [x] **Task 3:** Wire getMyCommunityPostLimitsOp + route
  - Files: `apps/web/src/server/operations/community.ts`, `apps/web/src/app/api/v1/community/posts/route.ts`, `apps/web/src/app/api/v1/community/posts/limits/route.ts` (new)
  - Commit: `ac8d884`
  - Notes: spec ok; web typecheck clean

- [x] **Task 4:** Add service test for the cap boundary
  - Files: `packages/services/src/community/__tests__/create-post-cap.test.ts` (new)
  - Commit: `4aefa12` (+ `0f2664a` type-narrowing follow-up)
  - Notes: Pause-if did NOT trigger — usable precedent found at `packages/services/src/user-preferences/__tests__/service.test.ts` (hand-rolled chain-mock). 7 boundary cases pass (0/MAX-1 allowed, MAX rejected + insert-not-called guard, ApiError instance check, getMyPostLimits shape + clamp + empty-result fallback). Total suite: 62/62.
  - ⚠ concern — Vitest 4's `ReturnType<typeof vi.fn>` is a `Mock<Procedure | Constructable>` union that breaks TS's `?.(…)` optional-call narrowing; had to type the spy as a plain callable. Recorded as a follow-up learning for future service tests.

- [x] **Task 5:** Web — dialog copy + page-level RSC fetch + gate the trigger
  - Files: `apps/web/src/features/community/components/post-form.tsx`, `apps/web/src/app/(app)/community/page.tsx`
  - Commit: `9e0717e`
  - Notes: spec ok; web typecheck + lint clean (0 errors, 17 pre-existing warnings in unrelated files)

- [x] **Task 6:** Mobile — add useMyPostLimits hook + invalidations + gate the board CTAs and composer
  - Files: `apps/mobile/features/community/api.ts`, `apps/mobile/features/community/hooks.ts`, `apps/mobile/app/(app)/post/index.tsx`, `apps/mobile/app/(app)/post/new.tsx`
  - Commit: `b4ac0d3`
  - Notes: spec ok; mobile typecheck clean

- [x] **Task 7:** CLAUDE.md addendum for the cap
  - Files: `CLAUDE.md`
  - Commit: `af9239a`
  - Notes: spec ok
