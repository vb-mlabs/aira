# Implementation report: Mobile parity (P2a) — Community board

**Review:** [2026-06-29-mobile-parity-p2a-community-board](../../reviews/2026-06-29-mobile-parity-p2a-community-board.md)
**Branch:** `feat/qa-test-accounts-seed`
**Status:** complete
**Started:** 2026-06-29
**Completed:** 2026-06-29

---

## Tasks

| # | Task | Status | Commit |
|---|---|---|---|
| T1 | Community feature scaffold (api + hooks) | ✓ done | `5a66907` |
| T2 | Board screen + Stack layout + PostCard | ✓ done | `f3ef186` |
| T3 | Composer screen (post/new.tsx) | ✓ done | `8553efc` |
| T4 | Detail screen + PostStatusBanner + ContactReveal + ReportButton | ✓ done | `ba6a9ef` |
| T5 | Threaded comments + composer + per-comment Report | ✓ done | `589d893` |

## Commits (chronological)

```
e760f2d  chore(mstack): mobile parity P2a plan + review            [prep]
5a66907  feat(mobile): community feature scaffold — api + TanStack hooks
f3ef186  feat(mobile): Community board screen replaces Post tab placeholder
8553efc  feat(mobile): Community composer screen — post/new.tsx
ba6a9ef  feat(mobile): Community detail screen + PostStatusBanner + ContactReveal + Report
589d893  feat(mobile): Community comments — 1-level threaded + composer + per-comment Report
```

## What shipped

The Post tab on mobile now resolves to a real Community board, not the
P1 placeholder. End-to-end loop:

- **Browse** — `usePosts` infinite scroll over approved posts; search
  + pull-to-refresh + empty-state + "Create the first post" CTA.
- **Create** — `/post/new` full-screen composer with the 4 web-parity
  fields (title required, body/phone/email optional). On success,
  `router.replace('/post/<new-id>')` lands the author on detail.
- **Detail** — `/post/[id]` with title + author meta +
  `PostStatusBanner` (renders "Waiting for moderation" for pending,
  destructive "Rejected" for the author-only rejected case, muted
  "Expired" for expired) + body + ContactReveal (phone/email rows
  tappable to tel:/mailto:) + Report-via-mailto.
- **Comment** — 1-level threaded `CommentThread` with composer pinned
  at top, oldest comments below. Reply toggle per comment expands an
  inline compact composer. Per-comment Report. Hidden comments render
  the moderator tombstone. Comments hidden when post is
  rejected/expired.

New code structure under `apps/mobile/features/community/`:
- `api.ts` — `listCommunityPosts`, `getCommunityPost`,
  `createCommunityPost`, `listCommunityComments`,
  `createCommunityComment`
- `hooks.ts` — `usePosts` (`useInfiniteQuery`), `usePost`,
  `useComments`, `useCreatePost`, `useCreateComment` (full
  optimistic-append with onError rollback)
- `initials.ts` — `initialsOf(name)` helper
- `relative-time.ts` — "just now / Nm / Nh / Nd" / UTC fallback
- `components/PostCard.tsx`
- `components/PostStatusBanner.tsx`
- `components/ContactReveal.tsx`
- `components/ReportButton.tsx`
- `components/CommentThread.tsx`
- `components/CommentComposer.tsx`

New routes under `apps/mobile/app/(app)/post/`:
- `_layout.tsx` (Stack)
- `index.tsx` (board)
- `new.tsx` (composer)
- `[id].tsx` (detail + comments)

## Verification status

- `pnpm --filter @aira/mobile typecheck` — ✓ clean after every task
- `pnpm --filter @aira/mobile lint` — ✓ clean after every task
- Lefthook pre-commit hooks ran on every commit
  (`check-migrations`, `check-contrast`) — ✓ all green
- **Verified on Expo Go** — pending; you should re-launch the
  workflow and exercise the chain: tap Post tab → see the board →
  create a test post → land on detail with "Waiting for moderation"
  → comment → see the optimistic comment immediately → refresh →
  see the server-confirmed comment.

## Follow-ups (carried to P2b / P2c)

### P2b — Favorites wiring

- `FavoriteHeart` on `BusinessCard` + `BusinessHero` (currently
  visual-only stubs) becomes a real toggle wired to
  `addFavoriteOp` / `removeFavoriteOp` / `listMyFavoriteIdsOp`.
- `/account/favorites` mini-screen renders `listMyFavoritesOp`
  results.

### P2c — Account hub redesign + Notifications entry

- Account hub becomes a nested Stack with 7 sub-pages mirroring
  `/account/*` on web (favorites, listings, posts, notifications,
  privacy-security, terms, about).
- `/account/notifications` becomes the entry-point for the
  orphaned `(app)/notifications.tsx` screen (P1 deferred the
  bell-icon decision; locked to Account sub-page during P2 planning).
- `/account/posts` exposes author edit + delete for community posts
  (deferred from P2a — keeps detail screen lean).

### P3 — Polish + TestFlight prep

- **Block-user functionality** — Apple Guideline 1.2 minimum bar is
  satisfied by Report-via-mailto in P2a, but Apple may ask for
  Block too. Pre-built backend (`block_user` table + comment
  filter) lands here if reviewer pushes back.
- **Push deep-link routing** — tap a `post_interest` or
  `post_comment` notification → navigate to the relevant
  `/post/<id>` (anchored to the comment id if comment-tap).
- **Comment polling** — web has `usePollingInterval` (5s active /
  60s background). Mobile defers; manual pull-to-refresh covers
  MVP. Add in P3 if user feedback wants it.
- **Composer keyboard handling polish** — `KeyboardAvoidingView`
  works for the basic case; long body content + scrolling may
  need finer-grained insets.

## Recommended next step

Two viable next moves:

1. **`/mlabs-qa` on Expo Go** focused on the Community loop:
   - Tap Post tab → confirm board renders real posts (not the
     placeholder)
   - Search + infinite scroll behavior
   - Create a test post → land on detail → see "Waiting for
     moderation" banner
   - Existing approved posts: tap → detail loads correctly
   - Comment posting → optimistic-append shows immediately,
     server-confirmed body matches
   - Reply to a comment → 1-level indent renders correctly
   - Reject / expired post (if seeded data has one) → composer
     hidden, status banner correct
   - Phone/email contact rows tappable to native intents
   - Report buttons open mailto with templated subject

2. **Plan P2b (Favorites)** — smallest next ship; 3 tasks; would
   close the visual-stub heart on BusinessCard.

I'd recommend `/mlabs-qa` first to surface any P2a issues before P2b
piles new code on top.
