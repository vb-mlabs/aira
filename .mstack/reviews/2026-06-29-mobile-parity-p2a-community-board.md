# Review: Mobile parity (P2a) — Community / Post on AIRA board

**Date:** 2026-06-29
**Slug:** 2026-06-29-mobile-parity-p2a-community-board
**Plan reviewed:** [2026-06-29-mobile-parity-p2a-community-board.md](../plans/2026-06-29-mobile-parity-p2a-community-board.md)
**Status:** approved
**UI-Significant:** no
**Reviewer:** Claude (Opus 4.7) via `/mlabs-review`

---

## Summary

P2a is ready to implement. The plan's 5-task bottom-up sequencing is
sound; reading the codebase surfaced three spec drifts (body optional
not required, title max 120 not 100, comments threaded not flat) and
two material decisions (App Store UGC report affordance; how to handle
the author's pending post on success). All resolved in consultation
and folded into the locked task list below. UI-Significant flag is
`no` — task list touches only `apps/mobile/**`.

## Findings

### Blockers (must fix before /mlabs-code)

None.

### Concerns (raised, decided, recorded)

- **Concern:** Plan said the composer body field is REQUIRED.
  `CreatePostInputSchema` says
  `body: z.string().trim().max(1000).optional()` — body is OPTIONAL.
  **Decision:** Locked optional. Submit succeeds with title-only.
  Acceptance criterion updated.

- **Concern:** Plan said max title length is 100 chars.
  `COMMUNITY_POST_TITLE_MAX = 120`.
  **Decision:** Locked at 120 to match validator. Mobile input enforces
  client-side `maxLength={120}`.

- **Concern:** Plan said "comment thread" but didn't specify reply
  nesting. Web's `comment-thread.tsx` renders `CommentThreadNode[]`
  with 1 level of replies (F20 v2 enforced the cap server-side).
  **Decision:** Mobile renders comments as a tree with one indent
  level for replies. T5 ships threaded layout, not a flat list.

- **Concern:** App Store Guideline 1.2 (User-Generated Content)
  requires an in-app way to report objectionable content + block
  users. Mobile P2a ships community comments without either; web has
  admin moderation but no user-facing report flow either. TestFlight
  reviewer pushback is a real risk.
  **Decision:** Ship a Report-via-mailto affordance in P2a. Small
  "Report" Pressable on the post detail screen + on each comment row.
  Tap → opens `mailto:support@airabynisarga.com` with the
  post/comment id pre-filled in the subject + body. ~30 lines per
  surface, no backend work, covers the Apple requirement cheaply.
  Lands in T4 (post-detail Report) + T5 (per-comment Report).

- **Concern:** Composer success redirect. Plan said
  `router.replace('/post/<new-id>')` but didn't address that the
  new post is in `pending` status and won't appear on the public
  board until admin approves.
  **Decision:** Verified `getCommunityPostOp` returns the author's
  own pending post (the service checks `is_author === userId`).
  Lock: composer success → `router.replace('/post/<new-id>')`. The
  detail screen renders a muted "Waiting for moderation" banner when
  `post.status === 'pending'` (T4 scope). Author sees their post
  body, can verify what they wrote, learns it's queued.

- **Concern:** The plan's 4 open questions all needed locking.
  **Decision:** All locked at the recommended options:
  1. Edit/delete on detail — **deferred to P2c** (`/account/posts`).
  2. Contact reveal — **always-visible** (match web).
  3. "+ New Post" CTA — **header button** (no FAB elsewhere in the
     app; consistency wins).
  4. Comment thread order — **oldest-first with composer at TOP**
     (match web).

### Suggestions (taken or deferred)

- **Suggestion:** Block (mute) functionality — same App Store
  pressure as Report.
  **Deferred** — adds a backend `block_user` table + filtering on
  every comment fetch. Out of P2a scope. Locked decision: Report is
  enough for Apple's minimum bar; Block lands in a P3 ship if
  reviewer asks.

- **Suggestion:** Add the post status branch as a shared
  `PostStatusBanner` component so it can be reused on `/account/posts`
  (P2c).
  **Taken** — banner lives at
  `apps/mobile/features/community/components/PostStatusBanner.tsx`
  rendering different copy per status (pending / rejected / expired).
  P2c imports it.

- **Suggestion:** Use a shared `ReportButton` component (mailto-only
  for now) so the same pattern is consistent across detail + comments
  + future surfaces.
  **Taken** — lives at
  `apps/mobile/features/community/components/ReportButton.tsx`.

- **Suggestion:** Empty-state copy for the board.
  **Locked** — "No posts yet — be the first to ask." + an inline
  CTA button pushing `/post/new`. Locked as acceptance criterion so
  `/mlabs-code` doesn't ask.

- **Suggestion:** Empty-state copy for the comments thread.
  **Locked** — "No comments yet." Plain.

- **Suggestion:** Polling on the comments thread (web's
  `usePollingInterval` pattern).
  **Deferred** — mobile bandwidth more constrained; manual
  pull-to-refresh covers MVP. Add in P3 if user feedback wants it.

## Decisions locked

Net new decisions made during review (beyond what was in the plan):

- Composer body field is **optional** (validator authority).
- Title max length is **120 chars** (validator authority).
- Comments render as a **1-level threaded tree** matching web's
  `CommentThreadNode[]`.
- **Report-via-mailto affordance** ships in P2a on post detail + each
  comment row (Apple UGC requirement). Subject + body templated with
  the post/comment id; opens
  `mailto:support@airabynisarga.com` via `Linking.openURL`.
- Composer success → `router.replace('/post/<new-id>')` with a
  **`PostStatusBanner`** on detail rendering "Waiting for moderation"
  when status is `pending` (and per-status copy for `rejected`,
  `expired`).
- All 4 plan open questions locked at recommended:
  - Edit/delete on detail → deferred to P2c.
  - Contact reveal → always visible.
  - "+ New Post" CTA → header button.
  - Comment thread order → oldest-first; composer at top.
- New shared components: `PostStatusBanner` + `ReportButton` live
  under `apps/mobile/features/community/components/`.

## Implementation plan

Ordered tasks for `/mlabs-code` to execute top-to-bottom. Each task is
atomic (reviewable as a single commit). `/mlabs-code` runs autonomously
but pauses if a task lists a **Pause if** trigger that matches the
situation.

### Task 1: Community feature scaffold (api + hooks)

- **Files:**
  - `apps/mobile/features/community/api.ts` (new)
  - `apps/mobile/features/community/hooks.ts` (new)
- **What:** Build the data layer. `api.ts` wraps the 5 ops needed:
  `listCommunityPosts(input)`, `getCommunityPost(id)`,
  `createCommunityPost(input)`, `listCommunityComments(postId)`,
  `createCommunityComment({ id, body, parent_id? })`. Each calls
  `apiGet` / `apiPost` from `lib/api/client`. `hooks.ts` exposes:
  `usePosts(q?: string)` — `useInfiniteQuery` keyed by
  `["community", "posts", q ?? ""]`, page size 12;
  `usePost(id?: string)` — `useQuery` keyed by
  `["community", "post", id]`, enabled when id is set;
  `useComments(postId?: string)` — `useQuery` keyed by
  `["community", "comments", postId]`;
  `useCreatePost()` — `useMutation` with onSuccess invalidating
  `["community", "posts"]`;
  `useCreateComment(postId)` — `useMutation` with onSuccess
  invalidating `["community", "comments", postId]`.
  No UI changes — this task is purely the data layer.
- **Acceptance:**
  - `pnpm --filter @aira/mobile typecheck` + `pnpm lint` clean.
  - The 5 hooks export with correct TS signatures inferring from
    `@aira/validators` schemas (`PostRow`, `CommentThreadNode`,
    `CreatePostInput`, `CreateCommentInput`).
  - `useInfiniteQuery.getNextPageParam` returns the next page when
    `lastPage.page * lastPage.pageSize < lastPage.total`, undefined
    otherwise (mirrors the listings pattern from P1).
- **Pause if:**
  - The `CreateCommentInputSchema` uses `id` (the post id) as the
    field name vs `post_id` — verify with the validator before
    naming the API wrapper's param.
  - `ListCommentsOutputSchema` returns `{ items: CommentThreadNode[] }`
    or `{ comments: ... }` — check before typing the hook return.

### Task 2: Board screen — replace placeholder with paginated post list

- **Files:**
  - `apps/mobile/app/(app)/post.tsx` (delete — the P1 placeholder)
  - `apps/mobile/app/(app)/post/_layout.tsx` (new — Stack wrapper)
  - `apps/mobile/app/(app)/post/index.tsx` (new — the board screen)
  - `apps/mobile/features/community/components/PostCard.tsx` (new)
- **What:** Delete the flat `post.tsx` placeholder. Add `post/` as a
  directory: `_layout.tsx` registers a `<Stack>` with default screen
  options (same paper-cream header colors as `listings/_layout.tsx`).
  `index.tsx` is the board: SearchBar at top (debounced 300ms,
  reuse `SearchBar` from `features/listings/components/`), then a
  `FlatList` over `PostCard` rows driven by `usePosts(q)`. Header
  has a "New Post" right-side button that pushes `/post/new`.
  Empty state: "No posts yet — be the first to ask." plus a
  "Create the first post" Pressable that also pushes `/post/new`.
  Pull-to-refresh via FlatList `refreshControl`. Infinite scroll
  via `onEndReached` (same pattern as listings).
  `PostCard`: BusinessCard chrome standard (no border, soft shadow
  via `CARD_SHADOW`). Layout: initials-avatar (36×36, primary
  background, primary-foreground text) + title (numberOfLines={2})
  + "author · relative time" + body preview (numberOfLines={1}).
  Tap routes to `/post/<id>`. Mirrors web's `post-card.tsx`
  structure.
- **Acceptance:**
  - The Post tab opens to the board screen, not the placeholder.
  - `apps/mobile/app/(app)/post.tsx` is deleted.
  - `usePosts` fires on mount; pull-to-refresh re-fetches page 1.
  - Search input is debounced 300ms and re-keys the query.
  - Infinite scroll loads page 2 when scrolled near the end.
  - Header "New Post" button is visible; tap navigates to
    `/post/new` (404s for now — fixed in T3).
  - Empty state renders the locked copy when zero posts.
  - `pnpm --filter @aira/mobile typecheck` + `pnpm lint` clean.
- **Pause if:**
  - expo-router complains about the `name="post"` tab now resolving
    to a directory vs the previous file — may need a Metro cache
    clear or explicit `Tabs.Screen name="post"` rewire.

### Task 3: Composer screen

- **Files:**
  - `apps/mobile/app/(app)/post/new.tsx` (new)
- **What:** Full-screen Stack screen with a form: Title (required,
  max 120 chars), Body (optional, max 1000), Phone (optional, max as
  validator), Email (optional). Submit calls `useCreatePost()`;
  disable submit + show spinner while mutation pending. On error,
  show inline error from `ApiError.message`. On success,
  `router.replace('/post/<new-id>')` so back navigates to board,
  not to an empty composer. Stack header shows "New Post" title +
  a Cancel button (left, pops back to board).
- **Acceptance:**
  - `/post/new` route resolves and renders the form.
  - Title field enforces `maxLength={120}`; empty title disables
    submit (or shows inline "Please add a short title").
  - Body field has `maxLength={1000}`.
  - Phone + Email are optional; empty values are sent as `undefined`
    (not `""`).
  - Submit calls `createCommunityPostOp` via `useCreatePost`.
  - Mutation success → `router.replace('/post/<new-id>')`.
  - Mutation error → inline error message, form re-enabled.
  - `pnpm --filter @aira/mobile typecheck` + `pnpm lint` clean.

### Task 4: Detail screen (read-only post + status banner + Report)

- **Files:**
  - `apps/mobile/app/(app)/post/[id].tsx` (new)
  - `apps/mobile/features/community/components/PostStatusBanner.tsx` (new)
  - `apps/mobile/features/community/components/ContactReveal.tsx` (new)
  - `apps/mobile/features/community/components/ReportButton.tsx` (new)
- **What:** Stack screen at `post/[id].tsx`. Reads `id` from
  `useLocalSearchParams`. Fetches via `usePost(id)`. Layout:
  - Title (font-display, text-2xl, numberOfLines={3})
  - Author name + relative time (text-mutedForeground)
  - `<PostStatusBanner status={post.status} />` — renders nothing
    for `approved`; "Waiting for moderation" muted card for
    `pending`; "Rejected: {reason}" destructive-tinted card for
    `rejected` (only visible to author per service); "This request
    has expired" muted card for `expired`.
  - Body text (text-foreground)
  - `<ContactReveal phone={post.phone} email={post.email} />` —
    renders two ContactCard-style rows (phone tappable to `tel:`,
    email tappable to `mailto:`); the whole component returns null
    when both are empty.
  - `<ReportButton kind="post" id={post.id} />` — small text-only
    "Report" Pressable below the body. Tap opens
    `mailto:support@airabynisarga.com?subject=Report community post {id}&body=Reason: `.
  - Loading skeleton during initial fetch. 404 EmptyState
    ("Post not found.") when service returns null.
  - Header title = post.title (truncated by Stack header default).
  - No comment thread yet — that's T5.
- **Acceptance:**
  - `/post/<id>` route resolves and renders the post body.
  - Status banner renders correctly per status branch (test via
    creating a post → land on detail → see "Waiting for moderation").
  - Contact rows tappable; phone opens dialer, email opens mail app.
  - Report button opens the mail app with the templated subject.
  - 404 EmptyState renders when `usePost` returns null.
  - `pnpm --filter @aira/mobile typecheck` + `pnpm lint` clean.

### Task 5: Threaded comments with composer + per-comment Report

- **Files:**
  - `apps/mobile/app/(app)/post/[id].tsx` (edit — append the
    thread + composer below the body)
  - `apps/mobile/features/community/components/CommentThread.tsx` (new)
  - `apps/mobile/features/community/components/CommentComposer.tsx` (new)
- **What:** Below the post body (and above any status banner if a
  rejected/expired post still shows comments), mount the comment
  thread. `CommentThread` calls `useComments(postId)` and renders
  the `CommentThreadNode[]` recursively — one indent level for
  replies (F20 v2 caps reply depth server-side at 1). Each comment
  row shows: author name, relative time, body, optional "Reply"
  link (which expands an inline `CommentComposer` for that
  comment's `id` as `parent_id`), and `<ReportButton kind="comment"
  id={comment.id} />`.
  `CommentComposer` is pinned at the TOP of the thread (matches
  web), single textarea + Submit button. Empty state when no
  comments: "No comments yet." Composer hidden when
  `post.status !== 'approved'` (matches web's `acceptsComments`
  prop).
- **Acceptance:**
  - Comments fetch on detail mount; thread renders newest reply
    nested under its parent, max 1 level deep.
  - Composer pinned at top of thread, oldest comments below.
  - Submit calls `createCommunityCommentOp` via `useCreateComment`.
  - Optimistic append: new comment shows immediately, then
    cache-invalidates to reconcile with server response.
  - Reply expands an inline composer for the parent comment's id
    as `parent_id`.
  - Composer hidden when `post.status !== 'approved'`; muted
    "Comments are closed on this post" line shown instead.
  - Per-comment Report button opens
    `mailto:support@airabynisarga.com?subject=Report community comment {id}&body=Reason: `.
  - Empty thread renders "No comments yet."
  - `pnpm --filter @aira/mobile typecheck` + `pnpm lint` clean.
- **Pause if:**
  - The optimistic-append shape diverges from `CommentThreadNode`
    in a way that requires inventing a temporary id + reconciling
    on server response — if the shape can't accept a quick
    optimistic insert, fall back to invalidate-only and accept the
    300ms flicker for MVP.

## Open questions

Anything still unresolved that `/mlabs-code` should escalate, not
guess.

- **Stack header layout on the composer.** The header in P1's
  listings stack shows category name + system back chevron. The
  composer needs a "Cancel" left + "Save" (or no Save — submit
  button is in the form). Web's PostForm uses a Dialog with
  X-close. Mobile equivalent: just the Stack default + a
  `<Stack.Screen options={{ headerLeft: () => <Cancel /> }} />`
  override OR keep the default back chevron. The task says "Cancel
  button (left, pops back)" — `/mlabs-code` may decide to use the
  default back chevron if implementing a custom headerLeft is
  fiddly. Either is acceptable.

- **Post title rendering on the Stack header.** Stack defaults
  truncate the title. If the post title is very long, the header
  may show "Bright Minds Acad…" — that's fine, matches iOS
  behavior. Document the truncation in the AC for T4.

- **Report subject template wording.** Locked at
  "Report community post {id}" / "Report community comment {id}".
  Reviewer (you) may want to tweak after seeing it land —
  one-line code change, no need to re-plan.

- **Time formatting for comments.** Web uses
  `relativeTime(created_at)` with the
  `MM/DD/YYYY > 7d` fallback. Mobile doesn't have a
  `relativeTime` util yet. Two options for `/mlabs-code`:
  (a) Inline a small `relativeTime` helper inside
  `apps/mobile/features/community/` for now;
  (b) Port the web helper to a shared location.
  Recommendation: (a) — small, scoped, easy to lift later if a
  second mobile feature needs it.

- **Author rendering when `author_name` is null.** Service
  guarantees author_name is set via LEFT JOIN on user, but
  defensive. If null, render "AIRA user" or similar. Lock to
  "AIRA user" so `/mlabs-code` doesn't reinvent.
