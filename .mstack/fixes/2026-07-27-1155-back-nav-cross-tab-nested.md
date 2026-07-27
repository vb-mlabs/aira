# Fix — mobile back arrow strands users returning from biz detail to /account/*

**Started:** 2026-07-27 11:55
**Source:** debug/2026-07-27-0930-back-nav-cross-tab-nested
**Status:** fixed
**Commit:** 9e204f8

## Symptom / repro

Account → My Listings → tap a business card → business detail opens →
tap top-left back arrow → user does not return to My Listings.
Reproduces identically from `/account/favorites` (same BusinessCard).

Verified by the debug repro at
`.mstack/debug/2026-07-27-0930-back-nav-cross-tab-nested/specs/repro.test.ts`
— pre-fix it fails on the cross-tab-nested case (`router.dismissTo` is
called with `/account/listings`, which cannot cross tabs and no-ops).

## Root cause

`goBackTo` in `apps/mobile/lib/nav/goBackTo.ts` had a two-way branch:
bare tab-root → `router.replace` (crosses tab shells), everything else
→ `router.dismissTo` (same-stack pop). The "everything else" branch
silently conflated same-tab-nested pops (e.g. `/listings/<slug>` inside
the hidden Listings tab) with cross-tab-nested returns
(`/account/listings` when the caller is inside the hidden Listings tab
after tapping a card). `dismissTo` cannot walk between tab stacks;
called with a cross-tab target, it either no-ops or fills the current
tab's shell with the target — visually identical to "back is broken."

Only surfaced now because BusinessCard was recently rendered under
`/account/*` for the first time. Home / Categories origins mask the
gap: Home returns to `"/"` which is a tab-root, and Categories →
subcategory → detail stays in one stack.

## Fix

**Files touched:**

- `apps/mobile/lib/nav/goBackTo.ts` — new pure helper
  `getTargetTab(href)` returns `"index" | "categories" | "post" |
  "account" | null` based on the first segment of the pathname
  (query-stripped, `(app)/` prefix-tolerant). The `null` return is the
  "stay in the current stack" signal — covers both same-tab-nested
  pops AND paths under the hidden `listings` tab, both of which want
  `dismissTo`. Then `goBackTo` splits three ways:
  1. `isTabRootPath(from)` → `router.replace(from)` — unchanged.
  2. `getTargetTab(from) !== null` → `router.navigate(from)` — new
     branch for cross-tab-nested. `navigate` is expo-router's
     tab-aware primitive that brings the target's tab-stack screen
     forward if it exists, else pushes a fresh screen inside it.
     Correct for our case because `.claude/memory/expo-router-cross-tab-replace.md`
     documents `router.replace` on a nested cross-tab target renders
     the content inside the wrong tab shell.
  3. Everything else → `router.dismissTo(from)` — unchanged.
  Also kept the no-`from` fallback (`router.back()` / final
  `router.replace("/(app)")`) verbatim.
- `apps/mobile/lib/nav/__tests__/goBackTo.test.ts` — port of the
  debug repro spec plus regression coverage for every branch:
  cross-tab (`/account/listings`, `/account/favorites`), tab-roots
  (`/`, `/account`), same-stack nested (`/listings/<slug>`), and
  no-`from` fallbacks. 12 tests total, all passing.
- `apps/mobile/lib/nav/__tests__/vitest.config.ts` — standalone
  config so the workspace `node_modules/.bin/vitest` can run the
  file without a mobile-package test setup wired.

## Evidence

- **debug repro spec re-run (acceptance criterion #1):**
  `cd .mstack/debug/2026-07-27-0930-back-nav-cross-tab-nested/specs && node_modules/.bin/vitest run`
  → `Test Files  1 passed (1) · Tests  4 passed (4)`
- **new mobile test file:**
  `cd apps/mobile/lib/nav/__tests__ && node_modules/.bin/vitest run`
  → `Test Files  1 passed (1) · Tests  12 passed (12)`
- **workspace typecheck:** `pnpm typecheck` from repo root
  → `Tasks: 10 successful, 10 total`
- **lefthook pre-commit:** all four hooks (check-migrations,
  check-no-server-actions, check-contrast — mobile Tailwind was not
  regenerated because no design-token file was touched) passed on
  commit `9e204f8`.

Manual repro on Expo Go — Account → My Listings → tap listing → back
arrow — is the second acceptance criterion. It cannot be executed
from this session (no headless Expo driver); user smoke test is the
gate. Same helper drives:
- BackButton (top arrow, tested here)
- useOriginAwareBack (iOS edge-swipe / Android hardware back)
- bottom "Go back" button on biz detail
so all three surfaces get the fix simultaneously.

## Follow-ups

- **QA verification on device:** back arrow, iOS edge-swipe, Android
  hardware back, and the bottom "Go back" button — all four should
  round-trip Account → My Listings → biz detail → back.
- **Mobile test runner:** the ported test currently runs via the
  standalone vitest config trick. When a proper mobile test setup
  lands (jest-expo is already in devDeps), delete
  `apps/mobile/lib/nav/__tests__/vitest.config.ts` and let jest pick
  the file up. Not blocking; noted in TODOS.

None else. No adjacent bugs surfaced during the bounded look.
