# Implementation: mobile top-bar consistency (shared TopBar component)

**Started:** 2026-07-14 08:06
**Review:** [2026-07-14-mobile-topbar-consistency](../../reviews/2026-07-14-mobile-topbar-consistency.md)
**Branch:** feat/landing-explainer-videos
**Status:** complete

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [x] **Task 1:** Add shared TopBar component
  - Commit: 764d297

- [x] **Task 2:** Convert Categories stack
  - Commit: 8fe3c24

- [x] **Task 3:** Convert Listings stack
  - Commit: 1544304

- [x] **Task 4:** Convert Post stack
  - Commit: d7b7230
  - Notes: sheet options preserved on Stack.Screen; TopBar renders inside sheet content

- [x] **Task 5:** Convert Account stack
  - Commit: d104a7a
  - Notes: notifications.tsx's "Mark all" headerRight moved into TopBar right slot (fits the design intent — no pause needed)
