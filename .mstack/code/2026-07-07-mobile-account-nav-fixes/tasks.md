# Implementation: Mobile account nav fixes

**Started:** 2026-07-07 15:30
**Finished:** 2026-07-07 15:40
**Review:** [2026-07-07-mobile-account-nav-fixes](../../reviews/2026-07-07-mobile-account-nav-fixes.md)
**Branch:** feature/mobile-account-nav-fixes
**Status:** complete

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [x] **Task 1:** Restore back chevron on account sub-screens
  - Files: `apps/mobile/app/(app)/account/_layout.tsx`, `apps/mobile/app/(app)/account/index.tsx`
  - Commit: 0e4e5cf
  - Notes: Dropped `headerBackVisible: false` from the account layout's `screenOptions` (default is `true`); explicit `headerBackVisible: false` on the hub's `Stack.Screen` options suppresses the arrow on the tab root. All 8 primary sub-screens and `posts/edit/[id].tsx` inherit the flipped default cleanly — no per-screen edits.

- [x] **Task 2:** Force tab-tap reset on account, categories, and post tabs
  - Files: `apps/mobile/app/(app)/_layout.tsx`
  - Commit: aab57ad
  - Notes: Pattern A (`router.replace("/(app)/<tab-root>")` inside `tabPress` + `e.preventDefault()`) worked; no fallback to `navigation.reset` needed. Home tab (no nested stack) and hidden listings tab (`href: null`, no tab-bar entry) untouched.
