# Implementation report: Mobile parity (P2c) — Account hub + sub-pages

**Review:** [2026-06-29-mobile-parity-p2c-account-hub](../../reviews/2026-06-29-mobile-parity-p2c-account-hub.md)
**Branch:** `feat/qa-test-accounts-seed`
**Status:** complete
**Started:** 2026-06-29
**Completed:** 2026-06-29

---

## Tasks

| # | Task | Status | Commit |
|---|---|---|---|
| T1 | Hub layout restructure (flat row list) | ✓ done | `1093448` |
| T2 | Notifications move | ✓ done | `361fb3f` |
| T3 | /account/listings (read-only) | ✓ done | `ac9ee6c` |
| T4 | /account/posts (author's posts list) | ✓ done | `f44f528` |
| T5 | /account/posts/edit/[id] (editor + Delete) | ✓ done | `dd17c7b` |
| T6 | Privacy & Security + Terms + About bundle | ✓ done | `6316aac` |

## Commits (chronological)

```
9ce3b72  chore(mstack): mobile parity P2c plan + review               [prep]
1093448  feat(mobile): Account hub restructured to flat row list mirroring web
361fb3f  feat(mobile): move notifications screen to /account/notifications
ac9ee6c  feat(mobile): /account/listings — read-only owned businesses
f44f528  feat(mobile): /account/posts — author's own posts list with status pills
dd17c7b  feat(mobile): /account/posts/edit/[id] — author editor + delete
6316aac  feat(mobile): Privacy & Security + Terms + About account sub-pages
```

## What shipped

**P2c closes the P2 mobile-parity series.** Together with P1, P2a, P2b
the mobile app now mirrors every non-admin surface the web app has.

Account hub end-to-end:
- Hub is a flat vertical list of 7 sub-page rows + Sign out + Delete
  account. Drop iOS Settings sections from the legacy P2b layout.
  Avatar header preserved byte-for-byte.
- Every row has a MaterialCommunityIcons glyph + chevron. Tap →
  router.push to the matching `/account/<slug>`.
- `/account/favorites` (from P2b) ✓
- `/account/listings` — read-only `BusinessCard` list with mailto:
  "Claim my business" EmptyState
- `/account/posts` — author's own posts with status pills
  (pending / approved / expired / rejected) + rejected_reason
- `/account/posts/edit/[id]` — pre-filled editor (PATCH) + Delete
  confirm Dialog
- `/account/notifications` — moved from the orphaned
  `(app)/notifications.tsx`; reachable via hub
- `/account/privacy-security` — relocated "Enable notifications"
  push-permission row + 4 short policy sections
- `/account/terms` — short Terms of Service text
- `/account/about` — brand block + support email + version footer

New code structure under `apps/mobile/`:
- `features/community/api.ts` — adds `listMyCommunityPosts`,
  `editMyCommunityPost`, `deleteMyCommunityPost`
- `features/community/hooks.ts` — adds `useMyCommunityPosts`,
  `useEditMyPost`, `useDeleteMyPost`
- `features/community/components/MyPostRow.tsx`
- `features/listings/api.ts` — adds `getMyListings`
- `features/listings/hooks.ts` — adds `useMyListings`
- `app/(app)/account/_layout.tsx` (from P2b) ✓
- `app/(app)/account/index.tsx` (rewritten)
- `app/(app)/account/notifications.tsx`
- `app/(app)/account/listings.tsx`
- `app/(app)/account/posts.tsx`
- `app/(app)/account/posts/edit/[id].tsx`
- `app/(app)/account/privacy-security.tsx`
- `app/(app)/account/terms.tsx`
- `app/(app)/account/about.tsx`

Edited:
- `app/(app)/_layout.tsx` — dropped the hidden
  `Tabs.Screen name="notifications"` entry

Deleted:
- `app/(app)/notifications.tsx` (moved to `account/notifications.tsx`)

## Verification status

- `pnpm --filter @aira/mobile typecheck` — ✓ clean after every task
- `pnpm --filter @aira/mobile lint` — ✓ clean after every task
- Lefthook pre-commit hooks ran on every commit
  (check-migrations, check-contrast) — ✓ all green
- **Verified on Expo Go** — pending; you should re-launch the
  workflow and walk the hub → every sub-page.

## P2 mobile-parity series — final state

| Phase | Scope | Status |
|---|---|---|
| P1 (`1aff165` → `d9ebb8d`) | 4-tab refactor + Home + Categories + Listings + Detail | ✅ shipped |
| P2a (`5a66907` → `589d893`) | Community / Post on AIRA board + composer + detail + comments | ✅ shipped |
| P2b (`f1688d1` → `c246628`) | Favorites wiring + /account/favorites + Account directory | ✅ shipped |
| **P2c** (`1093448` → `6316aac`) | Account hub redesign + 6 remaining sub-pages | ✅ shipped |

Mobile now mirrors every non-admin web surface end-to-end.

## Follow-ups carried to P3

### Polish + TestFlight prep

- **Push deep-link routing** — tap a notification → land at the
  specific surface (post detail / business detail /
  `/account/notifications`). T2's commit message flagged the URL
  change (`/notifications` → `/account/notifications`) for the
  routing implementation. Currently push opens the app to the
  default Home tab.
- **`/account/profile` editor** — Name / Email / Avatar edit. P2c
  dropped the legacy no-op rows. Web has a `/profile` route; the
  form is non-trivial.
- **`/account/settings` Change password** — P2c dropped the no-op
  row. P3 implements with Better Auth.
- **Heart disabled state during in-flight mutation** — P2b
  shipped without; P3 adds if TestFlight QA flags rapid-tap
  confusion.
- **`/account/favorites` optimistic-splice** — rows cache currently
  invalidates `onSettled`; P3 could splice for the immediate
  open-favorites-after-toggle case.
- **AIRA wordmark gradient on Home** — `bg-clip-text` analogue on
  RN. Either swap to `react-native-linear-gradient` (native
  rebuild) or accept `text-primary` as the mobile finish.
- **`expo-image` adoption** if TestFlight surfaces image-load
  jank — config-plugin change requiring native rebuild.
- **Force-update dialog** (F26) — seed `min_supported_build_ios`
  / `_android` + admin form + mobile startup check.
- **F25 mobile half — Deep links wiring** (Universal Links / App
  Links).
- **Store metadata + submission** — App Store + Play Store
  descriptions / screenshots / privacy nutrition labels / data
  safety form.

### Outside P3, on the horizon

- **Block-user functionality** — Apple Guideline 1.2 minimum bar
  is satisfied by Report-via-mailto (P2a); Block lands if
  reviewer asks.
- **Comment polling** — manual pull-to-refresh covers MVP; P3+
  if user feedback wants near-realtime.

## Recommended next step

`/mlabs-qa` on Expo Go focused on the full Account hub flow:

1. Open Account tab → confirm flat row list (7 sub-pages + Sign
   out + Delete account)
2. Tap each row → verify the matching screen loads
3. `/account/notifications` → see the in-app notifications you've
   received
4. `/account/listings` → see businesses you own (or EmptyState
   with mailto:)
5. `/account/posts` → see your authored posts with status pills
6. Tap a post → editor pre-fills correctly
7. Edit + Save → "Edits sent for moderation" toast → back to
   list → status pill flips to Pending if previously Approved
8. Tap Delete → confirm Dialog → "Post deleted" toast → row gone
9. `/account/privacy-security` → "Enable notifications" row
   triggers the system prompt
10. `/account/terms` + `/account/about` → text renders correctly
11. Sign out + Delete account from the hub → flows still work

After QA lands a clean report, you're in P3 territory — push
deep-link routing, TestFlight prep, store submissions.
