# Plan: Mobile parity (P2a) — Community / Post on AIRA board

**Date:** 2026-06-29
**Slug:** 2026-06-29-mobile-parity-p2a-community-board
**Status:** reviewed
**Author:** Claude (Opus 4.7) via `/mlabs-plan`

---

## Problem

P1 shipped the listings browse chain on mobile (Home / Categories /
Listings / Detail) but the Post tab is still a centered "Post on AIRA
/ Coming in the next update." placeholder. The community board is one
of AIRA's two pitch surfaces (alongside business listings) — without
it, a TestFlight installer sees a dead tab on the bottom bar.

This is **P2a of the mobile-parity series.** P2 was split into three
ships during the planning consultation:

| Phase | Scope | Status |
|---|---|---|
| **P2a** (this plan) | Community / Post on AIRA board + detail + comments + composer | draft |
| P2b | Favorites wiring (FavoriteHeart → real toggle + /account/favorites mini-screen) | not started |
| P2c | Account hub redesign + remaining sub-pages + Notifications entry | not started |

Who benefits: the user (Atlanta resident asking the community for
recommendations, services, items) gets a place to post and respond
to community requests on the mobile app. Wedge: **complete the
Post-on-AIRA loop on mobile so the Post tab is real, not a teaser.**

## Scope

**In:**

- **Post tab — real board.** Replace `apps/mobile/app/(app)/post.tsx`
  with a Stack-rooted directory: `post/index.tsx` (the board),
  `post/_layout.tsx` (Stack), `post/[id].tsx` (detail), `post/new.tsx`
  (composer). The Tab registration in `(app)/_layout.tsx` stays
  `name="post"` — expo-router resolves the tab to `post/index.tsx`
  via the directory.
- **Board screen** (`post/index.tsx`) — paginated infinite scroll over
  `listCommunityPostsOp` (filtered to `status=approved`, which the
  service already does for non-admin callers). Each row uses
  `PostCard` (new component mirroring web's `apps/web/src/features/community/components/post-card.tsx`):
  initials avatar + title + author + relative-time + 1-line body
  preview + comment count. Tap row → push `/post/<id>`. FAB or
  header button "+ New Post" → push `/post/new`. Pull-to-refresh +
  empty state ("No posts yet — be the first to ask.").
- **Detail screen** (`post/[id].tsx`) — fetches via
  `getCommunityPostOp`. Renders the full post (title, author,
  relative time, body, contact reveal for phone/email when set), then
  the comment thread (via `listCommunityCommentsOp`), then a
  comment composer pinned at the bottom (or top, matching web).
  Author-only "Edit" + "Delete" affordances via
  `editMyCommunityPostOp` / `deleteMyCommunityPostOp` — deferred
  to P2c's "/account/posts" sub-page; the detail screen in P2a is
  read-only + commentable.
- **Composer screen** (`post/new.tsx`) — full-screen Stack screen
  pushed from the board. Form fields mirror web's `post-fields.tsx`:
  title (required, max 100 chars), body (required, max 2000), phone
  (optional E.164-ish), email (optional). Submit calls
  `createCommunityPostOp`; on success, `router.replace('/post/<new-id>')`
  so back goes to the board, not back to the empty composer. Composer
  state: TanStack mutation, optimistic-disable on submit, error toast
  on failure.
- **Comment thread** on detail — `listCommunityCommentsOp` ordered
  newest-first (mirror web). Composer pinned to one end of the
  thread (web pins to top — match that). Submit calls
  `createCommunityCommentOp`; optimistic append on success +
  invalidate.
- **Author-side affordance** on a post the viewer owns — the comment
  composer is replaced with a "You posted this" muted banner OR the
  composer stays + a "Delete" icon button. Web's pattern: composer
  stays, "Delete" lives elsewhere (in /account/posts). Match web:
  composer always shown for any signed-in user, including the author.

**Out (deferred):**

- **Edit/delete your own post from the detail screen.** Web exposes
  this via `/account/posts`; mobile mirrors in P2c.
- **Admin moderation.** Never on mobile (admin is web-only per the
  P1 ground rules).
- **`addInterestOp` / `removeInterestOp` ("I'm interested" intent
  signal)** — RETIRED in the 2026-06-17 "Post on AIRA rebrand";
  comments replaced it. We don't wire interest on mobile.
- **Favorites wiring** — P2b.
- **Account hub sub-pages** (including `/account/posts` for editing
  your own) — P2c.
- **Notifications entry-point** — P2c.
- **Push deep-link routing** (tap a post-comment notification →
  navigate to that post) — P3.
- **Image attachments on posts** — never planned (web doesn't have it).
- **Realtime comment subscriptions** — never planned; mobile + web
  rely on pull-to-refresh + cache invalidation.

## Approach

5 atomic tasks, bottom-up. Each leaves the Post tab in a working
state.

1. **Listings-side api + hooks scaffold** — extend
   `apps/mobile/features/community/` (new directory) with `api.ts`
   (wraps the 5 ops above), `hooks.ts` (`usePosts`, `usePost`,
   `useComments`, `useCreatePost`, `useCreateComment`). No UI yet.
2. **Board screen** — `post/_layout.tsx` (Stack) + `post/index.tsx`
   (the board, replaces the placeholder). FAB pushes `/post/new`
   even though that screen doesn't exist yet (404 → next task
   fills it).
3. **Composer** — `post/new.tsx` with title/body/phone/email form +
   submit + redirect. Order before detail because the user's most
   natural acceptance test is "post a thing and see it on the
   board."
4. **Detail screen (read-only)** — `post/[id].tsx` renders full
   post + contact reveal. No comments yet. Acceptance: tap a row
   on the board → see the post body.
5. **Comments** — extend detail with `CommentThread` + `CommentComposer`
   (new components mirroring web). Submit → optimistic append.

**Why this order over alternatives:**

- **Why composer before detail?** The user's mental loop is "I write
  a post → I see it on the board → I open it." Shipping composer
  first means task 2 + 3 land a complete create-flow, even if detail
  is still a stub. Building detail first would leave the board with
  no posts to tap (in fresh accounts).
- **Why comments as a separate task instead of part of detail?**
  Detail without comments is still useful (read someone's post,
  contact them via the reveal). Comments add a second component +
  a mutation; separating keeps each commit small and the
  acceptance check unambiguous.
- **Why a directory instead of editing post.tsx in place?** expo-router
  resolves the `name="post"` tab to either `post.tsx` OR
  `post/index.tsx`. The directory form gives us the stack layout
  we need for `[id]` and `new` sub-screens without inventing a
  parallel `post-detail` route.

**Reuse from web (what's already on the wire):**

- `listCommunityPostsOp` (paginated browse with search; non-admin
  callers only see approved posts)
- `getCommunityPostOp` (single post for detail)
- `createCommunityPostOp` (composer submit)
- `listCommunityCommentsOp` (comments thread for a post)
- `createCommunityCommentOp` (composer submit)
- All exposed via the same fetch client mobile already uses for
  listings.

**Component reuse from P1:**

- `EmptyState` — for board with zero approved posts
- `SearchBar` — board search input (matches listings UX). Web's
  board has search; we mirror that.
- `Skeleton` — loading states
- The mobile BusinessCard chrome standard (no border, soft shadow,
  inline elements within Text) applies to `PostCard` too.

**Navigation pattern:**

- Tab `Post` (registered in `(app)/_layout.tsx`) → resolves to
  `post/_layout.tsx` (Stack) → default screen `post/index.tsx`.
- `router.push("/post/<id>")` from board → `post/[id].tsx`.
- `router.push("/post/new")` from board's FAB →
  `post/new.tsx`.
- `router.replace("/post/<new-id>")` from composer on submit so
  back goes to board, not back to the empty composer.

**Data fetching:**

- TanStack Query (established).
- Board: `useInfiniteQuery` for pagination (mirrors the listings
  pattern from P1). Page size 12.
- Detail: `useQuery`.
- Comments: `useQuery` keyed by `["community", "comments", postId]`.
- Mutations: `useMutation` with `onSuccess` cache invalidation
  (board after create-post; comments thread after create-comment).
- Pull-to-refresh on board + detail.

**Styling:**

- NativeWind (established). PostCard mirrors the BusinessCard chrome
  standard.
- Inline verified-tick pattern doesn't apply (posts don't carry a
  verified badge), but the multi-line title cap (`numberOfLines={2}`)
  + ellipsis pattern does — apply to post titles on the card.

**Alternatives considered:**

- **Build community as a flat list at `post.tsx` + `post-detail.tsx`
  + `post-new.tsx` (no subdirectory).** Rejected because expo-router
  doesn't compose Stack layouts on sibling files cleanly — you'd
  lose the back-chevron behavior.
- **Comment thread polls every 5s like web's `usePollingInterval`.**
  Rejected for P2a — mobile bandwidth is more constrained than
  web; manual pull-to-refresh is the right cost/benefit. Add polling
  in P3 if user feedback wants it.
- **Composer as bottom-sheet modal.** User picked full-screen Stack
  in consultation; matches the rest of the app's nav.

## Data model changes

None. Every endpoint required is already on the wire.

## Files to touch

**New:**

- `apps/mobile/features/community/api.ts` — fetch-client wrappers
  for the 5 community ops
- `apps/mobile/features/community/hooks.ts` — `usePosts`, `usePost`,
  `useComments`, `useCreatePost`, `useCreateComment`
- `apps/mobile/features/community/components/PostCard.tsx`
- `apps/mobile/features/community/components/CommentThread.tsx`
- `apps/mobile/features/community/components/CommentComposer.tsx`
- `apps/mobile/features/community/components/ContactReveal.tsx` —
  shows phone/email rows on the detail screen when set; tappable
  to `tel:` / `mailto:`
- `apps/mobile/app/(app)/post/_layout.tsx` — Stack wrapper
- `apps/mobile/app/(app)/post/index.tsx` — board (replaces the
  flat `post.tsx`)
- `apps/mobile/app/(app)/post/[id].tsx` — detail screen
- `apps/mobile/app/(app)/post/new.tsx` — composer screen

**Edit:**

- `apps/mobile/app/(app)/_layout.tsx` — no JSX change needed; the
  `Tabs.Screen name="post"` registration still resolves to the new
  `post/` directory. Verify nothing breaks here.

**Delete:**

- `apps/mobile/app/(app)/post.tsx` — the P1 placeholder. The new
  `post/index.tsx` takes its route.

## Edge cases

- **Composer submit on an expired session.** The mutation returns a
  401 → apiClient's refresh-once kicks in. If refresh also fails,
  the (app) auth gate redirects to `/(auth)/welcome` and the
  composer state is lost. P2a accepts that — it's a rare path and
  recovering composer state would require a draft layer not worth
  building for MVP. Toast: "Sign in again to post."
- **Long post titles wrap weirdly on the card.** Apply
  `numberOfLines={2}` on the card title, matching the listings card
  pattern. Body preview already gets `line-clamp-1` on web — match
  with `numberOfLines={1}` on mobile.
- **Comments composer submitted while offline.** TanStack mutation
  surfaces the error → toast "Couldn't post comment. Try again."
  No background-retry queue in P2a; deferred to P3 if user
  feedback wants it.
- **Empty body on detail.** `description: null` on the post → just
  hide the body section. Same pattern as BusinessCard's optional
  fields.
- **Phone/email contact reveal copy.** Mirror web's contact-reveal
  affordance: tappable rows that open `tel:` / `mailto:`. If both
  are unset, hide the contact section entirely.
- **Comment thread pagination.** Mirror web — comments are not
  paginated on web today (small per-post count). Mobile follows.
  If a future power-user thread blows up, P3 adds pagination.
- **expo-router file-routing conflict.** Removing `post.tsx` and
  introducing `post/` directory should resolve cleanly because no
  two files would claim the same route segment. Verify on the
  first task that the Tab still renders.
- **Stale board after a successful post.** Composer on success
  must invalidate `["community", "posts"]` query so the new post
  appears immediately when the back navigation lands on the board.
- **Search debouncing on the board.** Same 300ms debounce pattern
  as `SearchBar` from P1. Reuse the same component.
- **First-time install — empty board.** Render EmptyState with
  "No posts yet — be the first to ask." + an inline CTA button
  pushing `/post/new`.

## Acceptance criteria

- [ ] Tapping the Post tab on mobile shows the real community
  board, not the "Coming in the next update." placeholder.
- [ ] The board fetches via `listCommunityPostsOp` and renders an
  infinite-scroll list of approved posts, 12 per page.
- [ ] Pull-to-refresh on the board re-fetches the first page.
- [ ] A "+ New Post" button (FAB or header) pushes the composer.
- [ ] The composer has title (required), body (required), phone
  (optional), email (optional) fields; submit calls
  `createCommunityPostOp` and on success navigates back to the
  board via `router.replace`.
- [ ] After a successful post-create, the new post appears at the
  top of the board (cache invalidation works).
- [ ] Tapping a post on the board pushes `/post/<id>` with the
  Stack back-button.
- [ ] The detail screen renders the full post body, author name,
  relative time, and (when set) phone + email contact rows.
- [ ] Tapping a phone row opens the dialer; email opens the mail
  app.
- [ ] The detail screen shows the comment thread below the body,
  oldest-first (matching web's order).
- [ ] A signed-in user can post a comment via the inline composer;
  optimistic append updates the thread immediately, server
  confirmation invalidates the cache.
- [ ] `apps/mobile/app/(app)/post.tsx` is deleted; the route is
  now `apps/mobile/app/(app)/post/index.tsx`.
- [ ] `pnpm --filter @aira/mobile typecheck` + `pnpm lint` clean.
- [ ] Verified on Expo Go via the ws-tunnel against the live API:
  open the Post tab → see real prod community posts; create a
  test post; tap it; comment on it.

## Open questions

For the reviewer (`/mlabs-review`) to resolve before implementation.

- **Author edit/delete on the detail screen.** Plan defers these to
  P2c's `/account/posts` sub-page (which is the web pattern). If
  the reviewer would rather surface "Delete" on the detail screen
  too (no nav cost), the composer area becomes a "You posted this —
  Edit / Delete" row instead of a comment composer for the author.
  Recommendation: defer (match web).

- **Contact reveal — gated by interaction or always visible?**
  Web shows phone + email inline on the detail screen (always
  visible, no "reveal" tap). Mirror that, OR add an explicit
  "Show contact" tap to reduce inadvertent dials. Recommendation:
  match web (always visible).

- **Search on the board.** Web's `/community` has a search input;
  mobile board mirrors with `SearchBar`. But the listing-screen
  search drove infinite-scroll re-keying which can feel busy.
  Recommendation: ship search on the board.

- **Composer success — replace navigation or push?** Plan says
  `router.replace('/post/<new-id>')`. An alternative: `router.back()`
  + invalidate so the user lands on the board with their post
  visible. Replace-and-detail is more satisfying UX; back-to-board
  is more discoverable. Recommendation: `router.replace` to detail.

- **"+ New Post" CTA placement: FAB vs header?** FAB (Material
  pattern) is more discoverable; header button (iOS pattern) is
  less obtrusive. The app already mixes — no FAB elsewhere. For
  consistency, header button. For affordance, FAB. Recommendation:
  header button.

- **Comment thread order.** Web puts the composer at TOP and the
  thread oldest-first below. Some apps (Twitter, Reddit) do the
  reverse. Match web exactly. Acceptance criterion locks
  "oldest-first" to avoid `/mlabs-code` re-deciding.

- **Post titles wrapping** — apply `numberOfLines={2}` like
  BusinessCard? Or `{1}` since post titles are usually shorter?
  Recommendation: `{2}` for safety; cards size to content otherwise.
