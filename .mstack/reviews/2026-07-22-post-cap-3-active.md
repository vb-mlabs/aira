# Review: Multi-post support with 3-active cap on Post on AIRA

**Date:** 2026-07-22
**Slug:** 2026-07-22-post-cap-3-active
**Plan reviewed:** [2026-07-22-post-cap-3-active.md](../plans/2026-07-22-post-cap-3-active.md)
**Status:** approved
**UI-Significant:** yes
**Reviewer:** /mstack-review (with vinod@millionlabs.co.uk)

---

## Summary

Plan is sound and implementable. The single-post gate is well-isolated
(`packages/services/src/community/service.ts:221-245`), the data model
already supports N posts (no DB change), and the plan correctly picks
server-authority + client hint for the cap-reached UX. Four Concerns
were raised and locked with the user during review; two of them
tighten copy consistency (caption wording, invalidate-on-mutate), two
close small gaps the plan left open (test infra precedent, mobile
composer-screen deep-link). No Blockers. Ready for `/mstack-code`.

## Findings

### Blockers (must fix before /mstack-code)

_(none)_

### Concerns (raised, decided, recorded)

- **Concern:** The plan's reached-cap caption reads "You've reached 3
  active posts — expire or delete one to add another." Users can't
  manually expire a post (expiry is time-driven by
  `posts_expiry_days`), so the "expire" verb is misleading and
  probably surfaces support tickets.
  **Decision:** Use **"You've reached 3 active posts. Delete one to
  add another."** as the canonical caption. Export it from
  `packages/validators/src/community.ts` as
  `POST_CAP_REACHED_CAPTION` alongside `MAX_ACTIVE_POSTS_PER_USER` so
  the string can't drift between web and mobile.

- **Concern:** Mobile creates a `useMyPostLimits()` TanStack Query,
  but `useCreatePost` (`apps/mobile/features/community/hooks.ts:68-76`)
  and `useDeleteMyPost` (whatever the hook is named for
  `deleteMyCommunityPostOp`) only invalidate `["community","posts"]`
  today. If they don't also invalidate the limits query, a user could
  see stale "cap reached" or stale "you're OK" state until they
  backgrounded and reopened the app.
  **Decision:** Both `useCreatePost` and `useDeleteMyPost` add
  `qc.invalidateQueries({ queryKey: ["community","my-post-limits"] })`
  to `onSuccess`. Deterministic + follows the existing invalidation
  pattern at mobile/features/community/hooks.ts:72-74.

- **Concern:** `packages/services/src/community/__tests__/` contains
  only `recipients-helper.test.ts` — no fixture set for `createPost`.
  The plan doesn't specify a testing pattern for
  `create-post-cap.test.ts`.
  **Decision:** Match whatever pattern other service tests use in
  `packages/services/**/__tests__/` (likely the mockable in-memory
  db pattern from the T11 sprint per learnings 2026-06-30). If the
  pattern turns out ambiguous when writing the test, Task 4 pauses
  and asks the user before pushing a bespoke approach.

- **Concern:** The plan gates the two "New post" CTAs on mobile but
  doesn't cover the composer screen (`apps/mobile/app/(app)/post/new.tsx`)
  itself. A user hitting `/post/new` via deep link, universal link, or
  back-nav while at cap would see a fully-functional form that will
  409 on submit.
  **Decision:** The composer screen also calls `useMyPostLimits()`; if
  `remaining === 0`, replace the form with the same cap-reached
  caption + a "Manage your posts" button linking to `/account/posts`.
  Same treatment on both mobile and web composer surfaces.

### Suggestions (taken or deferred)

- **Taken:** Export the caption as a shared constant (see Concern 1).
- **Taken:** `getMyPostLimits()` return type stays
  `{ active, max, remaining }` in v1. `active_post_ids: string[]` for
  inline delete affordances was called out as an open question in the
  plan — deferred per user instruction in /mstack-plan.
- **Deferred:** Bulk-delete of expired posts (already in plan's Out).
- **Deferred:** Admin per-user cap override (already in plan's Out).
- **Deferred:** Notify user when a post expires (already in plan's
  Out).
- **Deferred:** Analytics events for cap-reached / cap-exceeded
  (already in plan's Out).

## Decisions locked

Net new decisions beyond what was in the plan:

- **Canonical caption:** `"You've reached 3 active posts. Delete one
  to add another."` — exported as `POST_CAP_REACHED_CAPTION` from
  `packages/validators/src/community.ts`.
- **Constant name:** `MAX_ACTIVE_POSTS_PER_USER = 3` (plan's proposal
  survived — no rename to `POST_CAP_ACTIVE`).
- **Web data flow:** RSC `apiServerFetch` in `community/page.tsx` +
  prop-drill `remaining` into `<PostForm />`. Web does NOT get a
  hooks.ts. (Mobile does.)
- **Mobile data flow:** `useMyPostLimits()` in
  `apps/mobile/features/community/hooks.ts`, called by both
  `PostBoardScreen` and `PostComposerScreen`.
- **Cache invalidation:** `useCreatePost` and `useDeleteMyPost` on
  mobile invalidate `["community","my-post-limits"]` on `onSuccess`
  alongside their existing `["community","posts"]` invalidation.
- **Composer screen gate:** both web Dialog and mobile
  `PostComposerScreen` render the cap-reached state when
  `remaining === 0`, with a link/CTA to `/account/posts` for slot
  management.
- **Test pattern:** Match precedent from other service `__tests__/`
  dirs; pause and ask if none applicable.

## Implementation plan

Ordered tasks for `/mstack-code` to execute top-to-bottom. Each task is
atomic (reviewable as a single commit). `/mstack-code` runs
autonomously but pauses if a task lists a **Pause if** trigger that
matches the situation.

### Task 1: Add `MAX_ACTIVE_POSTS_PER_USER` + `POST_CAP_REACHED_CAPTION` + limits schema to validators

- **Files:** `packages/validators/src/community.ts` (edit)
- **What:** Export `MAX_ACTIVE_POSTS_PER_USER = 3` and
  `POST_CAP_REACHED_CAPTION = "You've reached 3 active posts. Delete
  one to add another."`. Add `MyPostLimitsOutputSchema` (Zod) with
  shape `{ active: z.number().int().nonnegative(), max:
  z.number().int().positive(), remaining: z.number().int().nonnegative() }`.
  Add `MyPostLimitsInputSchema = z.object({}).strict()`.
- **Acceptance:** `pnpm --filter @aira/validators typecheck` clean. The
  new symbols are importable from `@aira/validators/community`.

### Task 2: Swap gate to count-based + add `getMyPostLimits` service function

- **Files:** `packages/services/src/community/service.ts` (edit),
  `packages/services/src/community/index.ts` (edit)
- **What:** Replace the `.limit(1)` + existence check at lines 221-245
  with a `count(*)` query filtered on `user_id + status IN
  ('pending','approved')`. Import `MAX_ACTIVE_POSTS_PER_USER` from
  `@aira/validators/community`. When count is `>= MAX`, throw the same
  409 `community.active_post_exists` with a message updated to
  reference the cap. Add a new exported service function
  `getMyPostLimits(db, ctx)` returning
  `{ active, max: MAX_ACTIVE_POSTS_PER_USER, remaining: MAX - active }`
  using the same COUNT(*). Update stale doc comment at line 848 to
  reflect the new cap. Re-export `getMyPostLimits` from
  `packages/services/src/community/index.ts`.
- **Acceptance:** `pnpm --filter @aira/services typecheck` clean.
  Grepping for the literal `3` in the diff shows only the acceptable
  validator constant usage — no hardcoded numeric duplicates.

### Task 3: Wire `getMyCommunityPostLimitsOp` + route

- **Files:**
  `apps/web/src/server/operations/community.ts` (edit),
  `apps/web/src/app/api/v1/community/posts/limits/route.ts` (new)
- **What:** Add `getMyCommunityPostLimitsOp` defineOperation
  (permission: "user") with `MyPostLimitsInputSchema` /
  `MyPostLimitsOutputSchema` — handler thin passthrough to
  `communityService.getMyPostLimits(db, ctx)`. Create the new route
  file with `runtime = "nodejs"` and `GET =
  getMyCommunityPostLimitsOp.runFromRequest`. Also update the stale
  header comment in the existing
  `apps/web/src/app/api/v1/community/posts/route.ts` line 4 (currently
  says "1-active-post limit").
- **Acceptance:** `pnpm --filter @aira/web typecheck` clean.
  `curl -sS -H 'Cookie: <auth>' http://localhost:3000/api/v1/community/posts/limits`
  returns `{ active: N, max: 3, remaining: 3-N }` for a signed-in
  user. Signed-out call returns 401.

### Task 4: Add service test for the cap boundary

- **Files:** `packages/services/src/community/__tests__/create-post-cap.test.ts` (new)
- **What:** Add boundary tests for the new gate: (a) 0 active → allowed;
  (b) 2 active → allowed; (c) 3 active → throws `ApiError` with
  `code: "community.active_post_exists"`; (d) 3 expired + 3 rejected +
  2 active → allowed (only active counts). Match the testing pattern
  used by other tests in `packages/services/**/__tests__/` (likely the
  mockable in-memory db from T11).
- **Acceptance:** `pnpm --filter @aira/services test` includes the new
  file with 4 passing cases.
- **Pause if:** No usable in-memory / mockable db pattern exists in
  `packages/services/**/__tests__/` — surface the situation to the
  user and ask whether to (a) skip this task and move service-test
  acceptance to manual repro only, (b) introduce a new mocking
  pattern, or (c) escalate to `/mstack-plan` for an integration-test
  infra track.

### Task 5: Web — dialog copy + page-level RSC fetch + gate the trigger

- **Files:**
  `apps/web/src/features/community/components/post-form.tsx` (edit),
  `apps/web/src/app/(app)/community/page.tsx` (edit)
- **What:** In `post-form.tsx`: accept a new prop `remaining: number`
  (required). Update the Dialog description text at line 104 to
  `"Share something with the community — an offer, a request, an
  item, anything. A moderator will review before it goes live. You can
  have up to 3 active posts at a time."`. When `remaining === 0`,
  render a disabled button showing `POST_CAP_REACHED_CAPTION` plus a
  `<Link href="/account/posts">Manage my posts</Link>` in place of the
  Dialog.Trigger; when `remaining > 0`, current behaviour. In
  `community/page.tsx`: fetch limits alongside the existing posts
  fetch via `apiServerFetch(getMyCommunityPostLimitsOp, { input: {} })`
  and pass `remaining` to `<PostForm />`.
- **Acceptance:** `pnpm --filter @aira/web typecheck` + `pnpm lint`
  clean. Manual repro on dev: with 0 active posts, dialog opens
  normally and description mentions "up to 3 active posts"; with 3
  active posts, the Post CTA is disabled and shows the cap-reached
  caption + Manage link.

### Task 6: Mobile — add `useMyPostLimits` hook + invalidations + gate the board CTAs and composer

- **Files:**
  `apps/mobile/features/community/hooks.ts` (edit),
  `apps/mobile/features/community/api.ts` (edit — add `getMyPostLimits` fetch fn),
  `apps/mobile/app/(app)/post/index.tsx` (edit),
  `apps/mobile/app/(app)/post/new.tsx` (edit)
- **What:** In `api.ts`: add `getMyPostLimits(): Promise<{ active,
  max, remaining }>` calling `GET /api/v1/community/posts/limits` via
  the existing bearer client. In `hooks.ts`: add `useMyPostLimits()`
  (TanStack Query, `queryKey: ["community","my-post-limits"]`, plain
  queryFn wrapping `api.getMyPostLimits`). Update `useCreatePost`
  and `useDeleteMyPost` (find its current name — probably
  `useDeleteMyPost`) to also
  `qc.invalidateQueries({ queryKey: ["community","my-post-limits"] })`
  on success. In `post/index.tsx`: read `useMyPostLimits()`. When
  `remaining === 0`, disable the header `+` Pressable (lines 44-64),
  swap its `accessibilityLabel` to "Post limit reached", and render a
  small caption row directly under the SearchBar with
  `POST_CAP_REACHED_CAPTION` + a `Manage my posts` button navigating
  to `/account/posts`. Also disable + swap the empty-state pressable
  at lines 117-127 similarly. In `post/new.tsx`: read
  `useMyPostLimits()` at mount; when `remaining === 0`, replace the
  form with the same caption + Manage-posts button (keep the TopBar
  BackButton). Update the trailing helper copy near line 205 to also
  mention "You can have up to 3 active posts at a time." even when
  `remaining > 0`.
- **Acceptance:** `pnpm --filter @aira/mobile typecheck` clean.
  Manual repro on device via Expo Go: with < 3 active posts, the `+`
  button and empty-state CTA work as before; with 3 active posts,
  both are disabled and the caption appears. Creating a 3rd post via
  the composer (from `remaining=1` state) immediately flips the board
  CTA to disabled without a manual refresh (invalidation
  works). Deleting one from `/account/posts` immediately re-enables it.

### Task 7: Housekeeping — CLAUDE.md addendum for the cap

- **Files:** `CLAUDE.md` (edit)
- **What:** Add a short bullet under the "Post on AIRA" or "When in
  doubt" section noting the cap lives at
  `MAX_ACTIVE_POSTS_PER_USER` in `packages/validators/src/community.ts`
  and is enforced server-side only. Bump the number here whenever
  the constant changes, so future readers don't grep the wrong place.
- **Acceptance:** CLAUDE.md diff includes the addendum. No other
  changes.

## Open questions

Anything still unresolved that `/mstack-code` should escalate, not
guess:

- **Task 4 test-pattern precedent.** If no usable mockable-db pattern
  exists across `packages/services/**/__tests__/`, Task 4's Pause-if
  trigger fires. This is deliberate — we don't want `/mstack-code`
  inventing a testing infrastructure track.
- **The exact `useDeleteMyPost` hook name on mobile.** If the current
  hook name is different (e.g. `useDeleteMyCommunityPost`), Task 6
  follows the actual name — no ambiguity, just a discoverability note.
- **The mobile `useMyPostLimits` staleness policy.** No answer is
  required — Task 6 uses TanStack Query defaults (stale immediately +
  refetch on window focus + explicit invalidation from mutations).
  Only surface if a follow-up needs a different policy.
