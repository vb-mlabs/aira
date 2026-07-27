# Debug — Mobile back arrow strands users when returning to /account/* nested screens

**Started:** 2026-07-27 09:30
**Source:** user-report (session 2026-07-27, conversation turn after Directions-icon ship)
**Env:** localhost / Expo Go
**Status:** ready-for-fix
**Investigator:** /mstack-debug

## Symptom

User taps a `BusinessCard` on **Account → My Listings** (or **Favorites**),
lands on the business detail screen, then taps the top-left back arrow.
The arrow does nothing — or, worse, leaves the user visually stuck inside
the hidden Listings tab's shell showing the "Account / My Listings"
screen. Expected return-to-origin: `/account/listings`.

The bug reproduces identically from any nested `/account/*` screen that
renders `BusinessCard`. Origins under Home (`/`), Categories
(`/categories`), and Categories → subcategory (`/listings/<slug>`) are
unaffected.

## Repro

1. Sign in on mobile (any user).
2. Bottom-tab bar → **Account** → **My Listings**.
3. Tap any listing.
4. On the business detail screen, tap the top-left back arrow.

**Expected:** return to `/account/listings` with the list restored.
**Actual:** back arrow no-ops (or the target renders inside the wrong
tab shell — same visual result as "it just didn't do anything").

**Artifact:** `specs/repro.test.ts` — vitest unit spec, currently
1-failing / 3-passing, pinpoints the exact primitive called
(`router.dismissTo`) in the failing branch.

## Investigation

Verified against the actual code, top-down:

- `apps/mobile/features/listings/components/BusinessCard.tsx:60` — the
  card reads `useBuildBackHref()` which returns `usePathname()` verbatim
  for the My Listings screen (`/account/listings`). No query params, no
  route-segment collisions. The push at `:67` fires
  `router.push("/listings/[category]/[id]?from=/account/listings")`.

- `apps/mobile/app/(app)/_layout.tsx:224` — the `listings` tab is
  `href: null` (hidden from the tab bar; entry via
  `router.push("/listings/...")` from any card). So the biz detail
  screen lives in the **`listings` tab's stack**, not the `account`
  tab's — the push is a **cross-tab** move.

- `apps/mobile/lib/nav/goBackTo.ts:38` — on back, this branches on
  `isTabRootPath(from)`:
  - Regex at :7 `TAB_ROOT_RE = /^\/(?:(?:\(app\)\/?)?)?(?:categories|post|account)?$/`
    matches ONLY bare tab-root segments: `/`, `/categories`, `/post`,
    `/account`. `/account/listings` has an extra `/listings` after
    `/account` → regex misses → `isTabRootPath` returns `false`.
  - Falls into `router.dismissTo("/account/listings")` (:43). The
    documented dismissTo behaviour is "pop the current stack back to
    the target, or replace the current screen with it if not in
    stack." Either way, dismissTo cannot cross into another tab's
    stack — it walks whatever stack the caller is inside. The caller
    is inside the **listings** tab; the target is in the **account**
    tab; dismissTo either no-ops or replaces the current listings-tab
    screen with the target-path payload, leaving the user in the
    wrong tab shell.

- `apps/mobile/lib/nav/buildBackHref.ts` — the pathname captured for
  `/account/listings` is correct; no route-segment stripping issue.

- Cross-reference: `.claude/memory/expo-router-cross-tab-replace.md`
  documents that `router.replace('/listings/<slug>')` on cross-tab
  targets replaces the CURRENT tab's screen, not the target tab's.
  This means the fix cannot simply widen the existing `router.replace`
  branch to nested paths — a cross-tab-nested target needs a
  different primitive.

- Why Home / Categories origins work today:
  - `useBuildBackHref()` on Home returns `"/"` → tab-root regex matches
    → `router.replace("/")` → crosses tabs correctly (bare tab-root =
    tab-shell swap, not a target-inside-wrong-shell case).
  - Categories → subcategory → detail: whole flow lives inside the
    `listings` tab stack, so `dismissTo` reaches the target within
    one stack (same-tab pop, correct primitive).

## Root cause

`goBackTo` treats "nested path" as synonymous with "same tab" — which
was true when the only nested origins were `/listings/<slug>` (inside
the same hidden Listings tab as the biz detail). Once `BusinessCard`
started getting mounted under `/account/*` screens, nested paths that
belong to **different** tabs than the current caller landed in the
same branch as same-tab nested paths, and `dismissTo` silently failed.

The regex `TAB_ROOT_RE` was the encoded decision boundary; it needs to
grow into a "which tab does this path belong to?" helper so `goBackTo`
can split three ways instead of two:

| Origin shape                          | Correct primitive        |
|---------------------------------------|--------------------------|
| Bare tab-root (`/`, `/categories`, …) | `router.replace(from)`   |
| Nested inside CURRENT tab             | `router.dismissTo(from)` |
| Nested inside DIFFERENT tab           | cross-tab primitive ⇒ TBD |

Only the last row is broken today.

**Failing test:**
`specs/repro.test.ts` — asserts `goBackTo("/account/listings")` must
NOT call `router.dismissTo` AND must call at least one cross-tab
primitive (`replace` / `push` / `navigate`). The current implementation
fails the first assertion (dismissTo IS called with
`"/account/listings"`) — exactly matching the user-reported symptom.
The three regression-guard tests pass, so the fix scope is contained
to the cross-tab-nested branch only.

Test output (run via `node_modules/.bin/vitest run` inside the
`specs/` directory):

```
 ❯ repro.test.ts (4 tests | 1 failed)
   × returns to /account/listings via a cross-tab primitive (NOT dismissTo)
   ✓ still routes '/' via router.replace (Home tab-root)
   ✓ still routes '/account' via router.replace (Account tab-root)
   ✓ still routes '/listings/<slug>' via dismissTo (same-stack pop)
```

## Fix plan (for /mstack-fix)

**Files to change:**

- `apps/mobile/lib/nav/goBackTo.ts` — refactor the two-way branch into
  three ways.
  1. Add a small pure helper `getTargetTab(href): "index" | "categories" | "post" | "account" | null` that maps a href to the visible tab it lives under. Return values track the `name=` attributes on the `Tabs.Screen` entries in `(app)/_layout.tsx:141–222` (index, categories, post, account). The hidden `listings` tab (`_layout.tsx:224`, `href: null`) is deliberately NOT enumerated — anything under `/listings/*` returns `null` so the caller stays in the "same current stack" pop path (this is the current correct behaviour for the Categories → subcategory → detail flow).
  2. Extend the branching in `goBackTo`:
     - `getTargetTab(from) === null` → same as today's non-tab-root branch: `router.dismissTo(from)` (same-tab-or-hidden-tab pop).
     - `getTargetTab(from) !== null` AND the target IS a bare tab-root (existing `isTabRootPath(from)` returns true) → `router.replace(from)` (unchanged from today).
     - `getTargetTab(from) !== null` AND the target is nested under a known tab → **cross-tab-nested**: the new branch. Preferred primitive is `router.navigate(from)` (expo-router's tab-aware navigation — brings the target's tab screen forward if it exists, else pushes a fresh screen inside it). If `router.navigate` is unavailable at the workspace's expo-router version or its semantics don't match the description above, fall back to a two-step: `router.replace("/<targetTab>")` first to switch tab shells, then `router.push(from)` to land on the nested screen.
- `apps/mobile/lib/nav/__tests__/goBackTo.test.ts` — port the four
  assertions from `.mstack/debug/<slug>/specs/repro.test.ts` into the
  mobile package's tree so future edits to `goBackTo` re-run them.
  Mobile has no test runner wired at the workspace level (see
  `apps/mobile/package.json:14` — the `test` script is a stub), so the
  test file goes in a location a future runner setup will pick up, but
  is not required to run in CI as part of this fix.

**Why it fixes the cause:** the failing assertion in
`specs/repro.test.ts` states that `goBackTo("/account/listings")` must
NOT call `router.dismissTo`. The refactored branch routes the same
input through `router.navigate` (or the two-step fallback), which
satisfies both the negative assertion AND the positive
"cross-tab-primitive was called" assertion.

**Hard-rule reminders:**

- **No new nav library / router abstraction.** The fix stays inside
  `apps/mobile/lib/nav/goBackTo.ts` and a co-located test.
- **Do not touch `BusinessCard` or `useBuildBackHref`.** The origin is
  captured correctly; only the return-path helper is wrong.
- **Regression guards must keep passing** — the three passing tests in
  `specs/repro.test.ts` enumerate the historically-working scenarios
  (Home tab-root, Account tab-root, same-tab nested Listings). Any
  refactor that regresses them fails the acceptance check.
- **`Tabs.Screen` list is the source of truth** for `getTargetTab`.
  When a new visible tab lands in `(app)/_layout.tsx`, add the
  corresponding return value; the debug memory
  `.claude/memory/expo-router-cross-tab-replace.md` documents that
  hidden tabs (`href: null`) must NOT appear in the helper.
- **`import "server-only"` / Zod boundaries / brand-string rule** —
  none apply to this fix (mobile client code only).

**Acceptance:**

1. `node_modules/.bin/vitest run --dir .mstack/debug/2026-07-27-0930-back-nav-cross-tab-nested/specs` → all 4 tests pass.
2. Manual repro: signed-in Expo Go build, Account → My Listings → tap
   a listing → tap back arrow → user lands back on My Listings with
   the list visible.

**Out of scope:**

- **Favorites screen** shows the identical bug (same `BusinessCard`
  under `/account/favorites`) and is fixed by the same `goBackTo`
  change — flag in the fix commit so QA verifies both.
- **`useOriginAwareBack`** (the OS-gesture interceptor) calls the same
  `goBackTo` helper, so iOS edge-swipe / Android hardware back get the
  same fix for free. Explicitly note this in the QA follow-up; no code
  change needed in that file.
- **Bottom "Go back" button** on biz detail — same helper, same fix.
- No changes to `useBuildBackHref`, `BusinessCard`, or the `Tabs`
  layout. Any drift in the `Tabs.Screen` names would be caught by a
  future test — out of scope for this fix.

## External references

None. The fix is a mechanical refactor within a helper the repo
already owns; no third-party doc lookups were required.
