# Review: Mobile account navigation UX fixes

**Date:** 2026-07-07
**Slug:** 2026-07-07-mobile-account-nav-fixes
**Plan reviewed:** [2026-07-07-mobile-account-nav-fixes.md](../plans/2026-07-07-mobile-account-nav-fixes.md)
**Status:** approved
**UI-Significant:** no
**Reviewer:** framer@millionlabs.co.uk (via /mlabs-review)

---

## Summary

Small, tightly scoped mobile-only navigation fix. Three files, no new
deps, no schema change. The plan correctly identifies the root cause of
both reported issues (Radha's 2026-07-06 UAT `headerBackVisible: false`
default across all four mobile stacks, plus the lack of a `tabPress`
listener anywhere on the tab bar) and picks a targeted resolution
(account-stack back arrow + reset on 3 stack-owning tabs). Review
verified the file assumptions in code and locked the two implementation
details the plan left open (tab-reset pattern + Radha sign-off). No
blockers. `UI-Significant: no` — all touched files are under
`apps/mobile/`; the heuristic only counts `apps/web/` UI files.

## Findings

### Blockers (must fix before /mlabs-code)

None.

### Concerns (raised, decided, recorded)

- **Concern:** Plan-time open question: `router.replace("/(app)/account")`
  vs `navigation.reset({ index: 0, routes: [{ name: 'index' }] })` for
  the tab-reset. Real semantics matter here — the target is different
  depending on whether the tab is currently focused (stack pop) or not
  (tab switch + stack reset).
  **Decision:** Use `router.replace(<tab-root-path>)`, per the plan's
  proposal. Rationale: in Expo Router 6, `router.replace` with the tab
  root path handles both the "already-focused, deep in stack" case (pops
  the account stack down to the hub) and the "different tab, want to
  land on account hub" case (switches tab and drops deeper state) in
  one call. `navigation.reset` is more explicit but needs a
  focused-tab check to work correctly across both cases. If Pattern A
  turns out to not fully reset the stack during dev testing, Task 2
  has a `Pause if` trigger — /mlabs-code stops and asks rather than
  guessing at Pattern B.

- **Concern:** The plan partially reverses a documented UAT decision
  ("Radha 2026-07-06 UAT — hide back chevron across all four
  mobile stacks"). Should implementation hold for Radha's sign-off, or
  ship?
  **Decision:** Ship. The user's report is the counter-signal that
  the escape hatch Radha's UAT relied on (bottom tab bar as escape)
  is broken by React Navigation's default behavior. Reverting on the
  account stack only is the minimum change to fix the reported pain
  while keeping her chrome decision intact for categories/post/listings.
  Follow-up: re-consult with Radha after ship — this review's
  reasoning stays on record if she pushes back.

- **Concern:** Deep-linked notifications (`/account/notifications`
  from a push) followed by a tap on the Account tab will reset to
  the hub — the user loses the notification context.
  **Decision:** Accept. This is the exact behavior the user asked for
  ("open first screen with no other screen which user left previously").
  QA acceptance criterion #7 exercises this path so the behavior is
  observed, not assumed.

- **Concern:** The `posts/edit/[id].tsx` screen is one level deeper
  than the primary sub-screens (nested under `/account/posts/edit/`).
  With the layout flip, its back chevron will pop to `/account/posts`
  (the parent list) — not `/account` (the hub). Is that the expected
  behavior?
  **Decision:** Yes, that's the correct default stack behavior and
  what users typically expect ("back = one step up in the stack").
  Locked as expected behavior; no code change needed.

### Suggestions (taken or deferred)

- **Suggestion (deferred):** Add haptic feedback on the tab-reset tap
  so the reset action feels tactile. Nice-to-have; not blocking. Plan
  already deferred; keeping deferred.
- **Suggestion (deferred):** Fold in the same tab-reset listener on
  the Home tab for symmetry. Home has no nested stack, so it's a
  no-op — save the code churn.
- **Suggestion (taken):** Add explicit dev-time verification steps to
  the acceptance list so the QA run has a scripted path, not just a
  vague "check the back chevron works." Integrated into Task 2's
  acceptance below.

## Decisions locked

- **Tab-reset pattern:** `router.replace("/(app)/<tab-root>")` inside
  a `tabPress` listener with `e.preventDefault()`. Applied to
  account, categories, and post tabs.
- **Back-arrow scope:** account stack only. Categories, post, and
  listings stacks keep Radha's `headerBackVisible: false`.
- **Hub screen exception:** `account/index.tsx` explicitly sets
  `headerBackVisible: false` on its `Stack.Screen` options to
  suppress the back arrow that the flipped layout default would
  otherwise show on the tab's root.
- **Deeper nested screens** (`posts/edit/[id].tsx`) get back arrows
  automatically and pop to their parent list — this is expected
  stack-navigation semantics, not a special case.
- **Radha UAT re-consult** captured as a post-ship follow-up, not a
  pre-ship gate.

## Implementation plan

Ordered tasks. `/mlabs-code` executes top-to-bottom, one commit each.

### Task 1: Restore back chevron on account sub-screens

- **Files:**
  `apps/mobile/app/(app)/account/_layout.tsx` (edit) ·
  `apps/mobile/app/(app)/account/index.tsx` (edit)
- **What:** In `_layout.tsx`, remove the `headerBackVisible: false`
  line from `screenOptions` (default is `true`, which is what we want
  for all sub-screens). In `index.tsx`, change the existing
  `<Stack.Screen options={{ title: "Account" }} />` to
  `<Stack.Screen options={{ title: "Account", headerBackVisible: false }} />`
  so the tab's root screen keeps its clean chrome without a back
  arrow.
- **Acceptance:**
  - `pnpm --filter @aira/mobile typecheck` passes.
  - Manual repro on device or simulator: launch app → tap Account tab
    → hub has NO back chevron in the header. Tap "My Profile" (or
    any other sub-row) → sub-screen HAS a back chevron. Tap the
    chevron → back on the hub.
  - iOS edge-swipe back and Android hardware back both still work on
    sub-screens.
  - Categories, post, and listings stacks all still show NO back
    chevron on their sub-screens (Radha UAT untouched).

### Task 2: Force tab-tap reset on account, categories, and post tabs

- **Files:** `apps/mobile/app/(app)/_layout.tsx` (edit)
- **What:** Import `router` from `expo-router` alongside the existing
  `Redirect, Tabs` import. Add a `listeners` prop to each of the
  `<Tabs.Screen name="account">`, `<Tabs.Screen name="categories">`,
  and `<Tabs.Screen name="post">` entries:

  ```tsx
  listeners={{
    tabPress: (e) => {
      e.preventDefault();
      router.replace("/(app)/<tab-root>");
    },
  }}
  ```

  where `<tab-root>` is `account` / `categories` / `post` respectively.
  Home tab (`name="index"`) does NOT get a listener — it has no nested
  stack. Listings tab (`href: null`, hidden) does not get a listener
  either.
- **Acceptance:**
  - `pnpm --filter @aira/mobile typecheck` passes.
  - Manual repro: from any account sub-screen (e.g. `/account/profile`),
    tap the Account tab in the bottom bar → land on `/account` hub.
  - From `/home`, tap Account tab → land on `/account` hub (not the
    last visited sub-screen).
  - From a categories sub-screen (e.g. `/categories/<slug>`), tap
    Categories tab → land on `/categories` root.
  - From a post detail screen (e.g. `/post/<id>`), tap Post tab →
    land on `/post` root.
  - Cross-tab `router.push` still works — simulate a deep-link by
    calling `router.push("/(app)/account/notifications")` from the
    console (or wait for a real push notification) → lands on the
    notifications sub-screen, doesn't get intercepted by the listener.
- **Pause if:**
  - `router.replace("/(app)/account")` doesn't fully reset the account
    stack in manual testing (e.g. tapping Account tab from
    `/account/profile` still shows the profile screen). Pause and ask
    the user to confirm switching to
    `navigation.reset({ index: 0, routes: [{ name: 'index' }] })`
    inside the listener (needs the `({ navigation })` destructure on
    the listener signature).
  - `e.preventDefault()` throws or produces a TypeScript error at the
    listener signature — pause; the correct pattern may need
    `listeners={({ navigation }) => ({ tabPress: (e) => ... })}`
    with a destructured navigation prop.

## Open questions

None. All plan-time questions resolved above.

## Follow-ups (recorded, not blocking)

- Re-consult with Radha on whether the account-only back-arrow
  restoration should extend to categories, post, and listings stacks
  for chrome consistency. Post-ship.
- Consider haptic feedback on tab-reset taps.
- If the `router.replace` pattern needs the `navigation.reset` fallback
  during Task 2, document the working incantation in
  `.mstack/learnings.jsonl` so the next mobile navigation plan can
  reference it directly.
