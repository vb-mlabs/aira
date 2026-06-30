# Plan: Mobile parity (P2c) — Account hub redesign + remaining sub-pages

**Date:** 2026-06-29
**Slug:** 2026-06-29-mobile-parity-p2c-account-hub
**Status:** reviewed
**Author:** Claude (Opus 4.7) via `/mlabs-plan`

---

## Problem

P1 + P2a + P2b shipped the listings browse chain, Community/Post on
AIRA board, and Favorites wiring. The Account hub today is a single
"Favorites" row tacked above the legacy iOS-Settings sections (Profile
/ Notifications / Security / Danger Zone) — itself a placeholder
preserved byte-for-byte from the pre-P2b account.tsx. The Notifications
screen is still orphaned (registered as `href:null` hidden tab from P1,
no UI entry-point). Author-side actions for community posts (edit,
delete) deferred from P2a sit waiting. And web has 7 `/account/*`
sub-pages of which mobile only has `/account/favorites`.

Who benefits: any signed-in user who wants to manage their own stuff —
see their listings as a business owner, edit a post they made, check
notifications, find Terms / Privacy / About without leaving the app.
Wedge: **complete the web→mobile parity for the entire non-admin
surface, so TestFlight has a real shippable app.**

This is **P2c of the mobile-parity series — the last sub-plan in P2.**

| Phase | Scope | Status |
|---|---|---|
| P2a | Community / Post on AIRA board | ✅ shipped (`589d893`) |
| P2b | Favorites wiring + /account/favorites + Account directory restructure | ✅ shipped (`c246628`) |
| **P2c** (this plan) | Account hub redesign + remaining sub-pages + Notifications entry | draft |

After P2c, the P2 mobile-parity series closes. P3 = polish + TestFlight
prep (force-update dialog, push deep-link routing, perf tuning, store
metadata).

## Scope

**In:**

- **Hub layout restructure.** Drop the legacy iOS Settings sections
  (Profile / Notifications / Security / Danger Zone) from
  `account/index.tsx`. Replace with a single flat vertical list of
  sub-page rows mirroring web's `/account/page.tsx`:
  - Favorites (P2b ✓)
  - My Listings (new — T3)
  - My Posts (new — T4)
  - Notifications (new — T2)
  - Privacy & Security (new — T6)
  - Terms (new — T6)
  - About (new — T6)
  - Sign out (existing)
  - Delete account (existing)
  
  The no-op Name / Email / Change password rows from the pre-P2c
  layout get dropped. The "Enable notifications" push-permission
  re-prompt row moves into the new `/account/privacy-security`
  sub-page (logical home; matches web's pattern).

- **/account/notifications.** Move the orphaned
  `apps/mobile/app/(app)/notifications.tsx` into
  `apps/mobile/app/(app)/account/notifications.tsx`. Remove the
  `href:null` hidden `Tabs.Screen` entry from `(app)/_layout.tsx`.
  No content change — just re-rooting the file. P3's push deep-link
  routing lands at the new path.

- **/account/listings.** New stack screen at
  `apps/mobile/app/(app)/account/listings.tsx`. Renders the
  current user's owned businesses (via `listMyBusinessesOp`)
  using the existing `BusinessCard` component. Read-only on mobile
  — owner edits stay admin-only on web. EmptyState when the user
  owns no businesses ("You don't manage any listings yet. Contact
  AIRA support to claim a business.").

- **/account/posts (list).** New stack screen at
  `apps/mobile/app/(app)/account/posts.tsx`. Renders the current
  user's community posts (via `listMyCommunityPostsOp`) — note
  this op returns ALL the user's posts including pending /
  rejected / expired ones (admin filter doesn't apply for the
  author). Each row shows the post title + status pill + body
  preview + tap-to-edit-via-stack-push. Reuses
  `PostStatusBanner`'s status copy for the per-row pill.

- **/account/posts/edit/[id] (editor).** New stack screen.
  Pre-fills the existing `PostFields`-equivalent form (title /
  body / phone / email) from `getCommunityPostOp` (the same fetch
  the detail screen uses, so we can reuse `usePost`). Submit
  calls `editMyCommunityPostOp` via a new `useEditMyPost` hook.
  On success: navigate back to `/account/posts` + brief banner
  "Edits sent for moderation" (server reverts approved posts to
  pending on edit per the F20 v2 review). A Delete button on the
  editor opens a confirm Dialog → `useDeleteMyPost`
  (`deleteMyCommunityPostOp`) → navigate back to
  `/account/posts`.

- **/account/privacy-security.** Content + the relocated "Enable
  notifications" push-permission re-prompt row from the legacy
  hub. Plus inline legal copy (locked in T6 — short text only,
  not a full TOS).

- **/account/terms.** Content-only — port the web `/account/terms`
  page's text into a ScrollView.

- **/account/about.** Content-only — port the web `/account/about`
  page's brand block + version info.

**Out (deferred):**

- **/account/profile (Name / Email / Avatar edit).** P3 polish.
  Today's no-op rows on the Profile section get DROPPED in P2c,
  not relocated; web's `/profile` route exists but the form for
  editing is non-trivial. P3 ships a real editor.
- **/account/settings (Change password).** P3. The legacy row was
  a no-op stub.
- **Push deep-link routing** (tap notification → land at
  `/account/notifications`). P3.
- **/account/listings owner-edit affordances.** Admin-only on web;
  not coming to mobile.
- **My Posts list filtering by status** (filter chips for
  pending/approved/rejected). P3 polish if user feedback wants it.
- **"Submitted for re-review" notification when an author edits an
  approved post.** Server already sends this; mobile doesn't need
  to do anything special.

## Approach

6 atomic tasks. Mirrors the locked task grouping from consultation.
Each leaves the app in a working state.

1. **Hub layout restructure.** `account/index.tsx` rewritten as the
   flat row list. All new rows route to screens that don't exist
   yet (404 falls through until later tasks fill them in). Sign
   out + Delete account stay at the bottom (preserved). The "Enable
   notifications" push-permission action moves out of the hub
   entirely; T6 picks it up under privacy-security.
2. **Notifications move.** Delete `(app)/notifications.tsx`; create
   `account/notifications.tsx` with the same content; remove the
   `href:null` Tabs.Screen entry. After T2, tapping the
   Notifications row on the hub resolves to a real screen.
3. **/account/listings.** New stack screen + new `useMyListings`
   hook in `features/listings/hooks.ts` (calls a new
   `getMyListings` api wrapper).
4. **/account/posts (list).** New stack screen + new
   `useMyCommunityPosts` hook in `features/community/hooks.ts`.
5. **/account/posts/edit/[id].** New stack screen + new
   `useEditMyPost` + `useDeleteMyPost` hooks. Reuses the existing
   `usePost` hook to pre-fill the form. Reuses the existing
   `Input` + `Button` primitives. Reuses the post-composer copy
   patterns from `(app)/post/new.tsx`.
6. **Content sub-pages bundle** — privacy-security + terms +
   about. All three in one commit because each is small (≤120
   lines on web) and content-only. Privacy-security includes the
   relocated "Enable notifications" row (the only non-content
   thing).

**Why this order:**

- T1 first because every other task lands a sub-page that the hub
  routes to. Hub-first means the navigation surface is visible
  before any sub-page exists, so the user can see what's coming.
- T2 second because Notifications is the smallest move (no new
  feature code, just a file relocation + Tabs cleanup). Closes the
  P1 orphan immediately.
- T3 + T4 are independent data-fetching screens (no
  cross-dependencies). T3 (listings) is smaller than T4 (posts)
  because My Listings is read-only; My Posts has the status pill
  rendering and edit-row affordance.
- T5 builds on T4 (the posts list is the entry-point to the
  editor). Splitting them lets T4 ship a usable read-only my-posts
  screen even if T5 surfaces an issue.
- T6 last because the content-only pages are the lowest leverage
  for the user but easiest to write — natural placement at the
  end of the run.

**Sub-page navigation pattern (locked from P2b):**

Account directory already a Stack via `account/_layout.tsx` (shipped
in P2b's `c246628`). New screens are just additional files in the
directory; tap row → `router.push('/account/<slug>')` → stack
header with back chevron returns to the hub.

**Hub row component (new):**

The current hub uses an inline `Row` helper from the pre-restructure
account.tsx. T1 keeps the same `Row` helper but drops the section
headers — the visual rhythm becomes one flat list. Each row gets:
- A leading icon (MaterialCommunityIcons) matching the web hub's
  lucide icon set (Heart → heart, Store → store-outline,
  MessageCircle → message-outline, Bell → bell-outline,
  Lock → lock-outline, FileText → file-document-outline,
  Info → information-outline).
- The label.
- A trailing chevron `›` (already in the existing `Row` helper as
  the "no value" branch).
- onPress = `router.push('/account/<slug>')`.

**Alternatives considered:**

- **Keep iOS Settings structure.** Rejected because adding 5 new
  rows into existing sections forces redundant section headers
  (Notifications header for one row, Security header for one row).
  Flat list scales cleaner as the row count grows.
- **Modal sheet for posts edit.** Rejected (locked decision). Stack
  screen matches the rest of the app's nav (composer, business
  detail, favorites all use stack screens).
- **Re-mount notifications via two routes.** Rejected. Moving the
  file is cleaner; the orphan was always a P1 deferral.

## Data model changes

None. All ops + schemas exist on the wire.

## Files to touch

**New:**

- `apps/mobile/app/(app)/account/notifications.tsx` (T2 — moved from `(app)/notifications.tsx`)
- `apps/mobile/app/(app)/account/listings.tsx` (T3)
- `apps/mobile/app/(app)/account/posts.tsx` (T4)
- `apps/mobile/app/(app)/account/posts/edit/[id].tsx` (T5)
- `apps/mobile/app/(app)/account/privacy-security.tsx` (T6)
- `apps/mobile/app/(app)/account/terms.tsx` (T6)
- `apps/mobile/app/(app)/account/about.tsx` (T6)

**Edit:**

- `apps/mobile/app/(app)/account/index.tsx` (T1 — flat row list + drop iOS Settings sections; drop Enable Notifications row which moves to privacy-security in T6)
- `apps/mobile/app/(app)/_layout.tsx` (T2 — drop the `<Tabs.Screen name="notifications" options={{ href: null }} />` entry)
- `apps/mobile/features/listings/api.ts` (T3 — add `getMyListings` wrapper)
- `apps/mobile/features/listings/hooks.ts` (T3 — add `useMyListings`)
- `apps/mobile/features/community/api.ts` (T4 — add `listMyCommunityPosts`; T5 — add `editMyCommunityPost` + `deleteMyCommunityPost`)
- `apps/mobile/features/community/hooks.ts` (T4 — add `useMyCommunityPosts`; T5 — add `useEditMyPost` + `useDeleteMyPost`)

**Delete:**

- `apps/mobile/app/(app)/notifications.tsx` (T2 — moved to `account/notifications.tsx`)

## Edge cases

- **`listMyBusinessesOp` for a user with zero owned businesses.**
  Empty array → EmptyState with the locked copy: "You don't
  manage any listings yet. Contact AIRA support to claim a
  business." + a mailto: button to `brand.supportEmail`.
- **`listMyCommunityPostsOp` includes pending / rejected /
  expired posts** (admin filter doesn't apply for the author).
  Per-row status pill clearly indicates state. Tap-to-edit works
  on any author-owned post regardless of status; the server
  rejects edits on expired / rejected rows per
  EditMyPostInputSchema's service-side guard.
- **Edit submit on an expired/rejected post.** Server returns
  ApiError; surface inline message. Don't disable the editor
  upfront because the status might've flipped between list-load
  and editor-open.
- **Approved post edit → re-pending.** The F20 v2 review locked
  that author edits on approved rows revert status to pending.
  Mobile shows "Edits sent for moderation" banner on success;
  the row in /account/posts list re-renders with pending pill
  after `useMyCommunityPosts` invalidates.
- **Delete confirmation race.** Two rapid taps on Delete in the
  Dialog → TanStack queues; second call hits a now-deleted row,
  server returns 404, we surface the error gracefully (toast
  "Already deleted"). Acceptable.
- **Notifications file move + push deep-link routing in P3.** When
  push lands an in-app notification tap, P3's deep-link router
  must route to `/account/notifications` (not the deleted
  `/notifications`). Document in the T2 commit message so P3
  doesn't get caught off-guard.
- **Hub row icon resolution.** MaterialCommunityIcons names
  for each row need to be picked + verified to exist in the
  icon font. Use names already used elsewhere in the app where
  possible (heart, message, web, etc.).
- **Sign out / Delete account dialogs.** Hub keeps the existing
  Dialog state machine for both. T1 preserves the
  `useSignOut` + `useDeleteAccount` + Toast plumbing
  byte-for-byte.
- **Brand copy on About + Terms + Privacy.** Pull text from web
  pages verbatim if it's short enough to copy; otherwise
  paraphrase to mobile-tone. Don't import brand strings inline
  (CLAUDE.md hard rule); use `brand.name`, `brand.legalEntity`,
  etc. from `@aira/config`.

## Acceptance criteria

- [ ] Account hub renders a flat vertical list of 7 sub-page rows
  + Sign out + Delete account. No iOS Settings section headers.
- [ ] Each hub row has a leading MaterialCommunityIcons glyph + a
  trailing chevron.
- [ ] Tapping a hub row pushes the matching `/account/<slug>`
  stack screen.
- [ ] `apps/mobile/app/(app)/notifications.tsx` no longer exists.
  Route resolves at `apps/mobile/app/(app)/account/notifications.tsx`.
- [ ] `(app)/_layout.tsx` no longer registers a hidden
  `Tabs.Screen name="notifications"` (the orphan entry is gone).
- [ ] `/account/listings` fetches via `listMyBusinessesOp`,
  renders results as `BusinessCard` rows, shows the locked empty
  state when the user owns zero businesses.
- [ ] `/account/posts` fetches via `listMyCommunityPostsOp`,
  renders results with per-row status pills (`pending`,
  `approved`, `expired`, `rejected`).
- [ ] Tapping a posts row pushes `/account/posts/edit/<id>`.
- [ ] The editor pre-fills from `usePost(id)`, submits via
  `useEditMyPost`, navigates back to `/account/posts` on success.
- [ ] The editor shows a Delete button → confirm Dialog →
  `useDeleteMyPost` → navigate back to `/account/posts` on
  success.
- [ ] `/account/privacy-security` renders the relocated "Enable
  notifications" push re-prompt row + locked legal copy.
- [ ] `/account/terms` renders the ported terms text in a
  ScrollView.
- [ ] `/account/about` renders the brand block + (optional)
  version info.
- [ ] Sign out + Delete account still work from the hub.
- [ ] `pnpm --filter @aira/mobile typecheck` + `pnpm lint` clean
  after every task.
- [ ] Verified on Expo Go: walk every sub-page from the hub,
  confirm push permission re-prompt still works from
  `/account/privacy-security`, edit + delete one of the seeded
  QA posts.

## Open questions

For the reviewer (`/mlabs-review`) to resolve before implementation.

- **Icon set for the 7 hub rows.** Web uses lucide; mobile uses
  `@expo/vector-icons` (`MaterialCommunityIcons`). Recommended
  mapping (lock unless reviewer pushes back):
  - Favorites → `heart-outline`
  - My Listings → `store-outline`
  - My Posts → `message-text-outline`
  - Notifications → `bell-outline`
  - Privacy & Security → `lock-outline`
  - Terms → `file-document-outline`
  - About → `information-outline`

- **Sign out + Delete row styling.** Web's
  `/account/page.tsx` has Sign out as a button (not a hub row)
  and Delete account lives under privacy-security. Mobile P2c
  preserves the current P2b pattern (both as destructive rows
  on the hub) for simplicity. Reviewer may push to match web
  exactly — minor surface change, would touch T1 + T6.

- **Editor's Delete button placement.** Bottom of the form vs
  header right? Web puts Delete in /account/posts row actions
  (not on the editor). Recommendation: bottom of the editor
  form, destructive-tinted, opens a `Dialog` confirm.

- **/account/posts row component.** New `MyPostRow` component or
  reuse `PostCard` with added status pill + edit affordance?
  `PostCard` is built for the public board (no status pill, no
  edit). Recommendation: new `MyPostRow` under
  `features/community/components/` since the affordances differ
  enough to not contort `PostCard`.

- **Privacy & Security copy.** Web's
  `/account/privacy-security` is only 39 lines — minimal
  text. Mobile port can be straight copy. Reviewer locks the
  exact copy.

- **About page version info.** Web doesn't show a version. Mobile
  could pull from `expo-application` (`Application.nativeApplicationVersion`
  + `Application.nativeBuildVersion`). Adds an import but no new
  package (expo-application is part of the expo prebundled set).
  Recommendation: include it — useful for TestFlight QA who
  needs to report bugs against a specific build.
