# Plan: Mobile account navigation UX fixes

**Date:** 2026-07-07
**Slug:** 2026-07-07-mobile-account-nav-fixes
**Status:** implemented
**Author:** framer@millionlabs.co.uk (via /mlabs-plan)

---

## Problem

Two related mobile-app navigation issues on the Account section, reported
2026-07-07:

1. **No back affordance on account sub-screens.** From the Account hub,
   tapping any row (Edit profile, My posts, Notifications, Privacy &
   Security, Terms, About, etc.) pushes into a stack screen with the
   header title but no visible back chevron. Users have no obvious way
   to return to the hub and report having to close the app.
2. **Account tab tap doesn't reset to the hub.** After navigating deep
   (e.g. `/account/profile`), tapping the Account tab in the bottom bar
   restores the deep screen rather than returning to the hub — feels
   like "resume" instead of "open."

**Who benefits:** every mobile user. Sub-navigation is unusable for
signed-in users who need to change any setting from the Account section.

**Success:** users can leave any account sub-screen with a single visible
tap, and the Account tab always opens the hub.

### Prior UAT decision (must be surfaced)

`apps/mobile/app/(app)/listings/_layout.tsx:19-24` documents this
comment on the same `headerBackVisible: false` setting: "Hide the back
chevron. The bottom tab bar is always visible, Android has hardware
back, and iOS keeps its edge-swipe gesture. Radha 2026-07-06 UAT."

That decision assumed the tab-bar-tap escape hatch would work — but
issue 2 above is exactly the case where it doesn't. This plan partially
reverses that UAT call **only for the account stack**, per user's scope
lock (2026-07-07). Categories, post, and listings stacks keep their
Radha-locked chrome. Radha may want re-consult before ship.

## Scope

**In:**

- Restore back chevron on account sub-screens (all screens in the
  account stack except the hub). Hub (`account/index.tsx`) keeps no
  back arrow.
- Force tab-tap reset on **Account**, **Categories**, and **Post**
  tabs: tapping any of these three tabs (whether focused or not)
  navigates to the tab's root screen, dropping any deeper stack
  state.

**Out (deferred):**

- Back chevron on categories, post, or listings sub-screens — kept
  per the Radha UAT decision until re-consulted.
- Listings tab (hidden `href: null`, entered via router.push from
  Categories) — user didn't scope it. The categories-tab reset will
  still fire on tab press, which is one indirect escape.
- Unsaved-changes warning when a tab reset would clobber user input
  (e.g. name change on `/account/profile`). The app has no
  unsaved-changes pattern anywhere today; adding one is its own
  feature.
- Web app account navigation — this is a mobile-only plan.

## Approach

Two small edits in the Expo Router tree, no new deps.

**1. Account back chevron.** Flip `apps/mobile/app/(app)/account/_layout.tsx`
to omit the `headerBackVisible: false` line (default is `true`) so every
child screen in the account stack gets the standard back chevron. Then
override on the hub: `apps/mobile/app/(app)/account/index.tsx`'s existing
`<Stack.Screen options={{ title: "Account" }} />` becomes
`<Stack.Screen options={{ title: "Account", headerBackVisible: false }} />`
so the tab's root doesn't show a back arrow (there's nothing to go back
to). Every current sub-screen (`about.tsx`, `favorites.tsx`,
`listings.tsx`, `notifications.tsx`, `posts.tsx`, `privacy-security.tsx`,
`profile.tsx`, `terms.tsx`, `posts/edit/[id].tsx`) already sets
`<Stack.Screen options={{ title: "..." }} />` without touching
`headerBackVisible`, so they'll inherit the new default — no edits
needed on the sub-screens.

**2. Tab-tap reset.** Add a `listeners` prop on the account, categories,
and post `<Tabs.Screen>` entries in `apps/mobile/app/(app)/_layout.tsx`.
The listener intercepts `tabPress`, prevents the default (which would
restore state or popToTop-only-when-focused), and calls
`router.replace("/(app)/<tab-root>")`. This is Expo Router's simplest
reliable pattern: `router.replace` dismisses the current stack and
lands on the tab's index route, regardless of focus.

```tsx
<Tabs.Screen
  name="account"
  listeners={{
    tabPress: (e) => {
      e.preventDefault();
      router.replace("/(app)/account");
    },
  }}
  options={{ ... }}
/>
```

Same shape for `categories` (→ `/(app)/categories`) and `post`
(→ `/(app)/post`). Home tab (`index`) doesn't need it — it has no
nested stack.

**Alternatives considered:**

- **Add the back chevron across all four stacks** (undo Radha UAT
  globally) — rejected per user's scope lock. Ships one uniform pattern
  but re-consults with Radha would delay.
- **Fix tab reset only; skip back chevron** — rejected. The tab-tap
  reset does solve the "how do I escape" problem, but users still have
  no per-screen back affordance while inside the stack, which is
  disorienting even after they learn the tab trick.
- **`unmountOnBlur: true` on the account stack** — a heavier way to
  force a fresh mount on tab enter. Rejected because it discards
  legitimate state (form input, loading queries) every time the user
  swipes to Home briefly.
- **`navigation.dispatch(StackActions.popToTop())`** — only works when
  the tab is currently focused. Doesn't cover the "user is on Home,
  taps Account, wants the hub" case. Rejected.

## Data model changes

None.

## Files to touch

**New:**

- None.

**Edit:**

- `apps/mobile/app/(app)/account/_layout.tsx` — remove
  `headerBackVisible: false` from `screenOptions`, or set it to
  `undefined`.
- `apps/mobile/app/(app)/account/index.tsx` — extend the existing
  `<Stack.Screen options={{ title: "Account" }} />` to
  `{ title: "Account", headerBackVisible: false }`.
- `apps/mobile/app/(app)/_layout.tsx` — add `listeners.tabPress`
  handlers to the `account`, `categories`, and `post` `<Tabs.Screen>`
  entries. Requires importing `router` from `expo-router`.

**Verify (no edit expected, but read to confirm no ripples):**

- `apps/mobile/app/(app)/account/about.tsx`,
  `favorites.tsx`, `listings.tsx`, `notifications.tsx`,
  `posts.tsx`, `privacy-security.tsx`, `profile.tsx`,
  `terms.tsx`, `posts/edit/[id].tsx` — confirm each declares its
  own `<Stack.Screen options={{ title: "..." }} />` without
  `headerBackVisible: true` (so the flipped layout default flows
  through naturally). Grep already confirmed this pattern.

## Edge cases

- **Deep-linked navigation via `router.push`** (e.g. from a push
  notification landing at `/account/notifications` or a listing detail
  at `/listings/<slug>`): unaffected — the `tabPress` listener only
  fires on physical tab-bar taps, not on programmatic navigation.
- **User is mid-edit on `/account/profile`** and taps the Account tab
  → the stack pops back to the hub, unsaved input is lost. Matches
  standard iOS Tab Bar behavior and is what the user explicitly
  asked for. No unsaved-changes warning today.
- **iOS edge-swipe back gesture** — still works. React Navigation's
  `gestureEnabled: true` is the default and isn't touched.
- **Android hardware back button** — still works, still pops the
  current stack screen.
- **Rapid double-tap on the Account tab** — first tap resets to the
  hub, second tap re-runs `router.replace("/(app)/account")` (no-op
  since already there). No animation glitches expected but confirm
  during QA.
- **Cold launch of the app after tab reset was armed** — the listener
  fires on the first Account tap post-launch, which is the desired
  behavior (Account tab always opens to the hub, period).
- **Existing hidden `listings` tab** — has `href: null` and no
  `listeners` in the plan. The Categories tab reset (root of the
  categories stack) still gives users an indirect escape from a
  listings deep-dive by tapping Categories.

## Acceptance criteria

- [ ] On the mobile app, from any `/account/*` sub-screen, a back
      chevron appears in the header. Tapping it returns to the previous
      screen in the stack (usually `/account`).
- [ ] The `/account` hub screen itself does NOT show a back chevron.
- [ ] From any screen in the account stack (hub or sub-screen),
      tapping the Account tab returns to `/account`.
- [ ] From any screen in the categories stack, tapping the Categories
      tab returns to `/categories`.
- [ ] From any screen in the post stack, tapping the Post tab returns
      to `/post`.
- [ ] Home tab tap does not change behavior (no nested stack anyway).
- [ ] Cross-tab navigation via `router.push` still works — e.g.
      tapping a notification that deep-links to
      `/account/notifications` still lands there.
- [ ] iOS edge-swipe back and Android hardware back both still work
      on account sub-screens.
- [ ] The categories, post, and listings stacks still have
      `headerBackVisible: false` (Radha UAT untouched outside of
      account).
- [ ] `pnpm --filter @aira/mobile typecheck` passes.
- [ ] No mobile bundle-size regression (edit is a handful of lines).

## Open questions

For `/mlabs-review` to resolve before implementation.

- **`router.replace` vs `navigation.reset`.** Both work for the tab
  reset. `router.replace` is simpler; `navigation.reset` gives finer
  control over the resulting stack. Plan proposes `router.replace`;
  the review should confirm.
- **Radha UAT sign-off.** This partially reverses the 2026-07-06 UAT
  call for the account stack only. Ship without her sign-off, or hold
  for a check-in?
- **Should the listener also fire haptics?** iOS system-tab-bar
  double-taps sometimes get haptic feedback. Nice-to-have; not in the
  plan.
- **Deep-linked notifications and the tab-reset listener.** Push
  notifications open a specific route (e.g. `/account/notifications`).
  If the user then taps Account, the listener will reset to `/account`.
  That's the expected behavior per this plan, but worth double-checking
  during QA that we don't lose the deep-link context prematurely.
