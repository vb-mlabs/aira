# Implementation: Mobile parity (P2a) — Community board

**Started:** 2026-06-29
**Completed:** 2026-06-29
**Review:** [2026-06-29-mobile-parity-p2a-community-board](../../reviews/2026-06-29-mobile-parity-p2a-community-board.md)
**Branch:** feat/qa-test-accounts-seed
**Status:** complete

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [x] **Task 1:** Community feature scaffold (api + hooks)
  - Commit: `5a66907`
  - Notes: 5 API wrappers + 5 TanStack hooks. Pause-If checks for comment schema field names resolved cleanly (id=postId in body + URL, items: CommentThreadNode[]).

- [x] **Task 2:** Board screen + Stack layout + PostCard
  - Commit: `f3ef186`
  - Notes: Deleted placeholder post.tsx, added post/ directory with _layout (Stack) + index (board). PostCard mirrors web with BusinessCard chrome. Companion helpers: initials.ts, relative-time.ts (inlined per review open question).

- [x] **Task 3:** Composer screen (post/new.tsx)
  - Commit: `8553efc`
  - Notes: Full-screen Stack. KeyboardAvoidingView on iOS. router.replace('/post/<new-id>') on success.

- [x] **Task 4:** Detail screen + PostStatusBanner + ContactReveal + ReportButton
  - Commit: `ba6a9ef`
  - Notes: 4 components shipped at once (detail page + 3 supporting). Status banner branches on 4 statuses. Report uses brand.supportEmail with templated subject/body.

- [x] **Task 5:** Threaded comments + composer + per-comment Report
  - Commit: `589d893`
  - Notes: useCreateComment upgraded with full optimistic-append + onError rollback + onSettled invalidate (not the pause-if fallback). Replies render 1-level nested with `paddingLeft: 16`. Hidden comments render moderator tombstone.
