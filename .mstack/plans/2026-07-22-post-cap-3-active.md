# Plan: Multi-post support with 3-active cap on Post on AIRA

**Date:** 2026-07-22
**Slug:** 2026-07-22-post-cap-3-active
**Status:** reviewed
**Author:** /mstack-plan (with vinod@millionlabs.co.uk)

---

## Problem

Post on AIRA today enforces **one active post per user** — after creating a
post, the composer's submit fails with a 409 until that post expires or
is resolved. Users routinely have several concurrent needs (a room to
rent + a class they're offering + a favor they need) that they can't
surface simultaneously, and the current gate reads as an arbitrary
restriction rather than a moderation policy.

The fix is to lift the cap from 1 → 3 active posts per user. "Active"
retains the current definition (status = `pending` OR `approved`), so
expired and rejected posts continue not to count. The cap needs to be
enforced server-side (the two clients — Next.js web + Expo mobile —
never independently drift) and surfaced proactively on both surfaces so
the user sees the cap state before filling in the composer.

Beneficiaries: every signed-in community member. Success = a user with 3
active posts sees a helpful "cap reached" state on the CTA (not a
failure at submit), and users with < 3 active posts can create as many
new posts as needed up to the cap.

## Scope

**In:**

- Change the create-post gate at
  `packages/services/src/community/service.ts:221-245` from a
  `LIMIT 1 → 409 if exists` check to a `COUNT(*) < 3 → 409 if at cap`
  check. Update error copy so users understand it's a "3 active posts"
  cap, not a "1 active post" cap.
- Export a shared `MAX_ACTIVE_POSTS_PER_USER = 3` constant from
  `packages/validators/src/community.ts` so both server and clients
  reference the same number.
- Add a new server op `getMyCommunityPostLimitsOp` (permission: `user`)
  that returns `{ active: number, max: number, remaining: number }` for
  the caller. Wired at `/api/v1/community/posts/limits`. Web + mobile
  fetch this to render the proactive cap-reached state on the CTA.
- Web: gate the `<PostForm />` trigger on the board and the composer
  Dialog. When `remaining === 0`, replace the Post CTA with a disabled
  affordance + inline caption "You've reached 3 active posts — expire
  or delete one to add another." Update the Dialog description on the
  composer to reflect the new cap.
- Mobile: gate the `/post` board header "+" button and the empty-state
  "Create the first post" pressable at
  `apps/mobile/app/(app)/post/index.tsx:44-64,117-127`. Show the same
  cap-reached caption + disable the CTAs.
- Update the stale doc comment at
  `packages/services/src/community/service.ts:848` (currently says
  "0 or 1 active post at a time given the 1-active-post limit").
- Update the stale header comment at
  `apps/web/src/app/api/v1/community/posts/route.ts:4` (currently reads
  "enforces 1-active-post limit").
- Add service-layer coverage for the new cap (boundary tests: 2 active
  → allowed, 3 active → 409). The service `__tests__/` dir already
  exists; add a new test file rather than trying to extend a missing
  fixture set.

**Out (deferred):**

- Bulk-delete of expired posts. Users can delete individual expired
  posts today via `/account/posts` (web) / `/account/posts` (mobile).
  A "Clear expired" quick-action to free up cap slots is a UX
  improvement but not required for the fix.
- Admin per-user cap override. Some users could get a higher cap; if
  it's needed later, super-admin can edit the DB directly.
- Notify users when a post expires so they can post again. Nice
  re-engagement hook (push / email) but a separate feature.
- Analytics events for cap-reached / cap-exceeded attempts.
- Making the cap number app-setting-configurable (see Approach note
  below — kept as a code constant to ship simple; promotion to
  `app_setting` is a straightforward follow-up if that lever is needed).

## Approach

**One authoritative gate at the service boundary; two thin proactive
checks on the clients; one small new endpoint bridging them.**

The current gate is a single well-placed function
(`createPost` at `packages/services/src/community/service.ts:216`). The
change is mechanical: swap the `.limit(1)` + boolean existence check
for a `count(*)` query filtered on `user_id + status IN ('pending',
'approved')`, then throw the same 409 `community.active_post_exists`
when the count is at or above the cap. Reusing the existing error code
means route handlers, mobile client, and web client all keep working
without special-case error handling — only the human-facing message
changes.

The 3-post cap is exported as a plain `MAX_ACTIVE_POSTS_PER_USER`
constant from `packages/validators/src/community.ts`. That file is
already the shared source of truth for the domain's length limits
(`COMMUNITY_POST_TITLE_MAX` etc.), so this is a natural home and both
`apps/web` and `apps/mobile` can import it without pulling in
`packages/services`. If the cap ever needs to be runtime-tunable, the
project already has the `app_setting` precedent (migration 0016 seeded
`posts_expiry_days` this way); promoting the constant is a small
follow-up.

The proactive client UX needs one thing the clients don't have today: a
cheap read of "how many active posts do I have right now?" Neither
surface loads My Posts on the board page, so filter-client-side on the
existing `listMyCommunityPostsOp` won't work there (`/account/posts` is
the only place that data is available). Rather than force-fetch the
full list, a new tiny op `getMyCommunityPostLimitsOp` returns
`{ active, max, remaining }` — one Postgres `COUNT(*)` on an indexed
column (`community_post_user_idx` at community-post.ts:40 covers the
predicate). Web `/community` and mobile `/post` both fetch this at
mount and use `remaining === 0` to switch the CTA into its
cap-reached state.

Reactive fallback stays intact: if a user opens the composer somehow
(deep link, race with an approval that just landed), the server still
returns the same 409 and the composer's existing `setError(err.message)`
inline banner (post-form.tsx:70-74; new.tsx:95-104) surfaces it. The
client gate is a UX improvement, not a security check.

**Alternatives considered:**

- **Move the gate to a DB CHECK / partial-unique constraint.** Rejected
  because a check like "count < 3" isn't expressible as a per-row DB
  constraint without triggers, and adding a stateful trigger for a
  read-only piece of business policy is disproportionate. The service
  layer is the right altitude.
- **Client counts via existing `listMyCommunityPostsOp` on both
  surfaces.** Rejected because the board pages (`/community`,
  `/post`) don't fetch that list, so we'd either need to duplicate the
  fetch (drift risk) or move the data-fetch into a shared hook (bigger
  refactor). A dedicated `/limits` endpoint is one COUNT(*) and
  bounded by design.
- **Let submit fail with the server error, no pre-check UI.** Rejected
  because the user has to fill in Title/Body/Phone/Email before finding
  out they've hit the cap — poor UX for a well-known constraint. Also
  wastes moderation team's time evaluating attempts they should have
  been able to prevent.
- **Read cap from `app_setting` from day one.** Rejected because we
  have no near-term plan to tune it. Keeping it as a constant is
  simpler; migration to app_setting stays a clean single-file follow-up
  if that lever becomes needed.

## Data model changes

**None.** The `community_post` schema already supports N posts per
user (only a non-unique `community_post_user_idx` on `user_id`, no
UNIQUE / CHECK constraint that would have to be dropped). The gate has
always been service-layer only. No migration.

## Files to touch

**New:**

- `apps/web/src/app/api/v1/community/posts/limits/route.ts` — wires the
  new `getMyCommunityPostLimitsOp` to `/api/v1/community/posts/limits`.
- `packages/services/src/community/__tests__/create-post-cap.test.ts` —
  boundary tests for the new cap (`existingActiveCount` 2 → 3 allowed;
  3 → 409; rejected/expired don't count).
- `apps/web/src/features/community/hooks.ts` — if a shared client hook
  file exists here already, add `useMyPostLimits()`; otherwise create.
  (Check first — mobile has a hooks file at
  `apps/mobile/features/community/hooks.ts`; web may or may not have
  a matching one.)
- `apps/mobile/features/community/hooks.ts` — add `useMyPostLimits()`
  companion to the existing `useMyCommunityPosts` at line 138.

**Edit:**

- `packages/validators/src/community.ts` — export
  `MAX_ACTIVE_POSTS_PER_USER = 3` constant. Add a Zod output schema for
  the limits endpoint (`MyPostLimitsOutputSchema`).
- `packages/services/src/community/service.ts` — replace the gate at
  lines 221-245 with a count-based check; update error messages; add a
  new `getMyPostLimits(db, ctx)` service function; update stale doc
  comment at line 848.
- `packages/services/src/community/index.ts` — export the new
  `getMyPostLimits` alongside existing exports.
- `apps/web/src/server/operations/community.ts` — add
  `getMyCommunityPostLimitsOp` defineOperation next to the existing
  create/list ops. Update stale header comment at
  `apps/web/src/app/api/v1/community/posts/route.ts:4`.
- `apps/web/src/features/community/components/post-form.tsx` —
  update Dialog description at line 104 (new cap wording). Optionally
  accept a `remaining?: number` prop; when 0, render the cap-reached
  state in place of the Dialog trigger.
- `apps/web/src/app/(app)/community/page.tsx` — fetch limits and pass
  `remaining` into `<PostForm />`.
- `apps/mobile/app/(app)/post/index.tsx` — fetch limits via
  `useMyPostLimits()`, gate the two "New post" CTAs (lines 44-64 and
  117-127), render the cap-reached caption.
- `apps/mobile/app/(app)/post/new.tsx` — surface cap in helper copy
  (currently silent about the cap at line 205).

## Edge cases

- **Race between approval and create.** A user has 2 approved + 1
  pending; a moderator approves the pending row concurrently with the
  user submitting a new post from a stale limits fetch. Client sees
  `remaining = 1` but server sees count = 3. Server-side gate catches
  it, returns 409, client shows the inline error. This is fine — the
  proactive check is a UX layer, the server is the truth.
- **Edit-then-revert path.** `editMyPost` (service.ts:878-1018) reverts
  an `approved` row back to `pending` on substantive edits. Both remain
  in the "active" set for the cap. No count change. Confirmed no
  interaction with cap logic.
- **Deleted expired posts vs. still-in-DB expired posts.** Only status
  ∈ `{pending, approved}` counts. Rejected + expired posts don't count
  even if the user hasn't cleaned them up.
- **Cap reached exactly at boundary.** count = 3 → 409, count = 2 →
  allowed. No off-by-one — the check is `count >= MAX` before insert.
- **Client SSR/hydration for the web board.** The board page renders
  server-side; the limits fetch needs to happen either during the RSC
  fetch (via `apiServerFetch`) or on the client after mount. Prefer
  the RSC path for consistency with the existing board page which
  already `apiServerFetch`es the posts list.
- **Signed-out state.** `getMyCommunityPostLimitsOp` is permission:
  `user`; the endpoint 401s for signed-out callers. Both surfaces
  already gate the composer CTA on sign-in state upstream — no
  additional handling needed.
- **The Dialog description on web currently reads "You can only have
  one active post at a time."** Even when `remaining > 0`, if we
  don't update this string it will lie to the user. Update the copy in
  every mode, not just cap-reached.
- **Copy consistency between web and mobile.** The reached-cap caption
  needs to be identical string on both surfaces to avoid subtly
  different messaging. Consider exporting the caption as a constant
  from `packages/validators/src/community.ts` alongside
  `MAX_ACTIVE_POSTS_PER_USER`, so any future tweak lands once.

## Acceptance criteria

- [ ] `MAX_ACTIVE_POSTS_PER_USER` constant is exported from
  `packages/validators/src/community.ts` and imported by service +
  clients. Grep for the literal `3` in this scope finds no hardcoded
  duplicates.
- [ ] Service test file
  `packages/services/src/community/__tests__/create-post-cap.test.ts`:
  passes with cases (a) 0 existing → allowed, (b) 2 existing → allowed,
  (c) 3 existing → throws `ApiError` with code
  `community.active_post_exists`, (d) 3 expired + 3 rejected + 2 active
  → allowed (only active count).
- [ ] `GET /api/v1/community/posts/limits` returns
  `{ active: N, max: 3, remaining: 3-N }` for the caller. Signed-out
  callers get 401.
- [ ] Web board (`/community`) fetches limits server-side; when
  `remaining === 0`, the primary Post CTA is disabled and the caption
  "You've reached 3 active posts — expire or delete one to add
  another." is visible.
- [ ] Web composer Dialog description reads "You can have up to 3
  active posts at a time." (or wording finalized in review).
- [ ] Mobile board (`/post`) fetches limits on mount; the header "+"
  button and the empty-state pressable are disabled with the same
  caption when `remaining === 0`.
- [ ] Attempting to POST when at cap returns 409
  `community.active_post_exists` with the new message. Manual repro on
  a dev account: create 3 posts (via seed script or manual), open the
  composer, attempt submit — see the inline error even if the client
  gate is bypassed.
- [ ] Doc comments at
  `packages/services/src/community/service.ts:848` and
  `apps/web/src/app/api/v1/community/posts/route.ts:4` are updated
  from "1-active-post limit" to reflect the new 3-cap.
- [ ] `pnpm typecheck` + `pnpm lint` clean.

## Open questions

For `/mstack-review` to resolve before implementation:

- **Where does `useMyPostLimits()` live on web?** Web doesn't have a
  `apps/web/src/features/community/hooks.ts` file today — most web
  client-side data-fetching is done via TanStack Query hooks inline in
  the component that uses it, or via RSC + `apiServerFetch`. Should
  this hook be created as a shared hooks file, or should the board
  page just do the fetch server-side and pass `remaining` down as a
  prop (simpler)? Recommendation: server-side fetch + prop on web,
  client hook on mobile (which is what already fits the mobile pattern).
- **Caption copy — is "expire" the right verb?** Posts don't "expire on
  demand" — they expire automatically after
  `posts_expiry_days` past approval. A user at the cap probably
  wants to *delete* a pending or approved post to free a slot. Consider:
  "You've reached 3 active posts. Delete one from Account → My Posts
  to add another." Or keep "expire or delete" since expired posts
  eventually free up a slot too.
- **Should we bump the number in the constant name to signal it's
  policy-scoped?** e.g. `POST_CAP_ACTIVE = 3` vs
  `MAX_ACTIVE_POSTS_PER_USER = 3`. The latter is more self-documenting
  at call sites; keeping unless review disagrees.
- **Reviewer to confirm: do we want the limits endpoint to also return
  the `active_post_ids: string[]` so the client can render quick
  "delete this one" affordances inline?** Adds one array to the
  response; probably worth doing but scope-creep-adjacent for the base
  fix. Note as a fast-follow if not included in v1.
