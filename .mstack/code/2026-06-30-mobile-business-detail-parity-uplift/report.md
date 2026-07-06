# Implementation report: Mobile Business Detail parity uplift

**Review:** [2026-06-30-mobile-business-detail-parity-uplift](../../reviews/2026-06-30-mobile-business-detail-parity-uplift.md)
**Branch:** `feat/qa-test-accounts-seed`
**Status:** complete
**Started:** 2026-06-30
**Completed:** 2026-06-30

---

## Tasks

| # | Task | Status | Commit |
|---|---|---|---|
| T1 | TierPill component + render on Hero and Card | ✓ done | `2e9a76d` |
| T2 | ContactCard — Get directions via native maps | ✓ done | `67e7e59` |
| T3 | BusinessHero — inline SocialIcons row | ✓ done | `4baad69` |
| T4 | Bottom Go-back Button on detail screen | ✓ done | `1e37147` |
| T5 | Gallery — full-width auto-advancing carousel | ✓ done | `0ab6478` |

Neither of the two Pause-if triggers fired:
- T1's NativeWind tier-class concern resolved on first build — the
  bg-tier1 / bg-tier2 / text-tier1Foreground / text-tier2Foreground
  classes compiled correctly without a safelist.
- T5's FlatList scrollToIndex out-of-range concern resolved by
  setting `getItemLayout` upfront with a fixed `screenWidth` per
  item, locking the layout deterministically from the first frame.

## Commits (chronological)

```
2e9a76d  feat(mobile): TierPill badge on BusinessHero + BusinessCard
67e7e59  fix(mobile): ContactCard address row opens native directions
4baad69  feat(mobile): inline SocialIcons row in BusinessHero
1e37147  feat(mobile): bottom Go-back Button on Business Detail screen
0ab6478  feat(mobile): Gallery — full-width auto-advancing carousel with dots
```

(Preceded by `chore(mstack)` commit pinning plan + review.)

## What shipped

**Visible parity gaps closed:**

- **Tier badges** — paid-sponsorship businesses (tier1, tier2) now
  show their tier on every public mobile surface they appear on
  (Hero + Card). Labels come from the shared `TIER_LABELS` export in
  `@aira/validators`, so a future rename propagates everywhere with
  no drift risk. Tier3 (Regular) businesses correctly render no
  badge.
- **Get directions** — Address row taps now open Apple Maps on iOS
  / Google Maps Navigation on Android in directions mode (turn-by-
  turn ready). Falls back to the universal Google Maps HTTPS
  directions URL when the native scheme rejects. Row relabeled
  "Address" → "Get directions" to match the action; added
  `accessibilityHint` for VoiceOver / TalkBack.
- **Inline hero socials** — BusinessHero now renders the same
  compact social/contact icon row that the BusinessCard does, just
  below the rating row. Mirrors web's hero. ContactCard stays
  unchanged for users who scroll.
- **Bottom Go-back Button** — Detail screen now ends with a
  secondary Button + arrow-left glyph + "Go back" label, matching
  web's affordance at the bottom of the card stack. Additive to
  Stack chevron + iOS swipe + Android system back.
- **Full-width auto-advancing Gallery** — Gallery rewritten from
  240×160 horizontal thumbnails to a full-width swipeable carousel
  with dot indicators below. Auto-advances every 3.5s, pauses on
  touch, single-image case renders static + no dots, empty array
  renders nothing. Screenshot-worthy for App Store / Play Store
  listings.

## Verification status

- `pnpm --filter @aira/mobile typecheck` — ✓ clean after every task
- `pnpm --filter @aira/mobile lint` — ✓ clean after every task
- Lefthook pre-commit hooks ran on every commit
  (`check-migrations`, `check-contrast`) — ✓ all green
- **Verified on Expo Go** — pending; rebuild + re-test the detail
  screen on a real phone.

## Follow-ups not in this bundle

Carried forward as separate work items:

- **Auth-gated favorite heart** — Mobile still renders the heart
  for signed-out users; tap silently fails because `useToggleFavorite`
  needs a session. Explicitly excluded from this bundle's scope.
  Quick fix: read `useMe()` in `BusinessHero` and `BusinessCard`,
  suppress the heart when `!me.data?.emailVerified`. ~15 min.
- **Subcategory rollup for "All <Root>" listings** — flagged in
  commit `eaa586c`. "All Restaurants" still queries the single root
  slug, so businesses tagged directly with sub-cat slugs don't
  appear. Needs `listBusinessesOp` to accept multi-slug; moderate
  backend change.
- **`expo-image` for the gallery** — would give a blur-up while
  loading + better memory management. Config-plugin change requiring
  native rebuild; deferred per `feedback_expo_sdk_for_iteration.md`.
- **Native `@react-native-menu/menu` for the SubcategoryPicker**
  (separate from this bundle) — also Dev Client territory.
- **a11y hint backfill on the other ContactCard rows** — T2 added
  a hint only on the directions row. A broader pass covers Call /
  WhatsApp / Website / Hours.

## Recommended next step

`/mlabs-qa` on Expo Go focused on the Detail screen — verify:

1. Open a tier1 business → "Sponsored" pill renders on hero +
   card; tier2 shows "Sponsored Level 2"; tier3 shows nothing.
2. Tap the address row → Apple Maps opens with directions to the
   business (iOS device).
3. Tap a social icon in the hero → phone / WhatsApp / website / IG
   opens the correct app.
4. Scroll to the bottom of a detail page → "← Go back" button
   visible; tapping returns to the listings page.
5. Open a multi-image business → gallery auto-advances every
   ~3.5s; touching pauses; dots reflect the active image; tapping
   a dot snaps.
6. Single-image business → gallery shows the one image, no dots,
   no auto-advance.
7. Verify the heart still works for signed-in users (separate
   from this bundle but adjacent to changes).
