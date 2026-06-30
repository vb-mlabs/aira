# Plan: Mobile Business Detail screen — parity uplift bundle

**Date:** 2026-06-30
**Slug:** 2026-06-30-mobile-business-detail-parity-uplift
**Status:** reviewed
**Author:** framer@millionlabs.co.uk (via /mlabs-plan)

---

## Problem

The mobile Business Detail screen is the surface a paid-tier business pays
to land users on, and it's the screen Apple/Google reviewers will inspect
when judging store-submission screenshots. A parity audit against the web
detail page surfaced four user-visible gaps:

1. **Tier badges are missing.** Web shows a small "Sponsored Top" /
   "Sponsored Level 2" pill on `BusinessHero` + `BusinessCard` whenever
   `business.tier !== "tier3"`. Mobile has no tier visibility anywhere. A
   paid-sponsorship-tier business gets nothing for its upgrade on mobile
   today, which weakens the sponsorship product as mobile becomes the
   primary surface heading into store launch.

2. **Gallery doesn't auto-advance.** Web's `business-image-carousel`
   rotates every 3.5s with pause-on-interaction; mobile is a static
   240×160 horizontal thumbnail scroll. Multi-image businesses (the ones
   that uploaded a gallery — usually higher-effort listings) look static
   on mobile.

3. **No explicit "Go back" affordance.** Web ends the card stack with a
   "Go back" link to `/listings/<category>`. Mobile relies entirely on
   iOS edge-swipe / Android system back. Discoverable enough for power
   users; not for the long tail.

4. **Address opens a pin, not directions.** Mobile's ContactCard taps
   `https://maps.google.com/?q=<addr>` which drops a pin in Google
   Maps. Users tap "Address" expecting turn-by-turn directions to the
   business — the universal directory-app contract — and don't get it.

Plus one structural deviation worth fixing while we're in the file:
mobile's `BusinessHero` doesn't include the inline social row that web's
detail hero shows above the contact card. Users have to scroll a card-
height to act on a phone/whatsapp/website tap.

Success: every gap above closed, mobile Detail screen is screenshot-
worthy for App Store + Play Store submission, and a paid tier1/tier2
business shows its tier on every mobile surface where it's visible on web.

## Scope

**In:**

- Add a `TierPill` mobile component matching web's TierPill visual.
  Render conditionally on `BusinessHero` and `BusinessCard` when
  `business.tier !== "tier3"`. Source colors from the existing
  `tier1` / `tier1Foreground` / `tier2` / `tier2Foreground` tokens
  (already in `packages/config/src/design.ts`, contrast-checked by the
  lefthook `check-contrast` hook).
- Rewrite `Gallery.tsx` from horizontal-scroll thumbnails (240×160) to
  a full-width swipeable carousel with auto-advance, pause-on-touch,
  and dot indicators below the image. Matches web's
  `business-image-carousel.tsx` shape + animation.
- Switch `ContactCard`'s "Address" row from `?q=<addr>` (pin) to native
  maps directions: `maps://?daddr=<addr>` on iOS opens Apple Maps in
  directions mode; `google.navigation:q=<addr>` on Android opens Google
  Maps Nav. Use `Linking.canOpenURL` to probe and fall back to the
  Google Maps universal HTTPS directions URL
  (`https://www.google.com/maps/dir/?api=1&destination=<addr>`) if the
  native scheme is rejected. Rename the row label "Address" → "Get
  directions" so the action is obvious; keep the address string as the
  row value.
- Add an inline `SocialIcons` row to `BusinessHero` (compact mode,
  same component used in `BusinessCard`) just below the rating row.
  Same set of actions stays in `ContactCard` for users who scroll.
- Add a "Go back" `Pressable` at the bottom of the detail
  `ScrollView`, calling `router.back()`. Mirrors web's bottom-of-card
  affordance; doesn't override iOS swipe-back.

**Out (deferred):**

- Auth-gated favorite heart (mobile shows heart for signed-out users
  → mutation silently fails). Real bug, but separate concern;
  belongs in its own atomic commit. See follow-up note.
- Sub-cat rollup for "All Restaurants" view (flagged in commit
  `eaa586c` — separate backend change to `listBusinessesOp`).
- Anything outside the Business Detail screen + its component tree
  (`BusinessHero`, `BusinessCard`, `Gallery`, `ContactCard`,
  `SocialIcons`).
- `expo-image` adoption for the gallery — config-plugin change
  requiring a native rebuild; carried in the P3 follow-up list.
- Long-press preview on iOS gallery images — native module territory.
- Native `@react-native-menu/menu` for action menus — already
  documented as "upgrade path when Dev Client" elsewhere.

## Approach

Five atomic commits, one per item, in the order they reduce risk:

**T1 — TierPill component + render sites.** Net-new file
`apps/mobile/features/listings/components/TierPill.tsx`. Read the
`business.tier` field (string union: `"tier1" | "tier2" | "tier3"`,
already on the Business validator). Render `null` for `"tier3"`.
For `"tier1"` and `"tier2"`, render a small `<View>` with rounded
corners and the tier-coloured background + foreground text from the
mobile tailwind config (NativeWind class `bg-tier1 text-tier1Foreground`
etc — the generator script `scripts/gen-mobile-tailwind.ts` already
emits these from `design.ts`). Label sources from a shared
`TIER_LABELS` map ported from web's `business-card.tsx` for parity
("Sponsored Top" / "Sponsored Level 2"). Render in two places:
top-right of `BusinessHero` (next to the heart) and top-right of
`BusinessCard` (above the existing "More Info" chevron analogue).
Mirrors web's `business-card.tsx:128` placement.

**T2 — Gallery rewrite.** Drop the horizontal `ScrollView` for a
controlled `FlatList` with `pagingEnabled` + `horizontal` + image
items sized to the screen width. Track active index in state; an
interval (3500ms) auto-advances by calling `flatListRef.current?.scrollToIndex({
index: nextIndex, animated: true })`. Pause via `isPausedRef` toggled
in `onScrollBeginDrag` / `onScrollEndDrag`. Dot indicators below
the carousel; each dot a `Pressable` that calls `scrollToIndex(i)`.
Auto-advance only fires when `images.length > 1` (matches web).
Active-dot styling mirrors web (filled foreground for active,
0.4-alpha for inactive). Image height stays ~224pt to match web's
`h-56`. Hidden entirely on empty array.

**T3 — ContactCard directions.** Add a `directionsUrlFor(address)`
helper at the top of `ContactCard.tsx` that returns the best
platform-specific URL: try `maps://?daddr=<encoded>` on iOS or
`google.navigation:q=<encoded>` on Android via
`Platform.OS`, then `Linking.canOpenURL`-probe before
`Linking.openURL`. If the native scheme rejects (Google Maps not
installed on Android), fall back to
`https://www.google.com/maps/dir/?api=1&destination=<encoded>`
(universal Google Maps directions URL — opens the app if installed,
else the browser). Rename the row label from "Address" to "Get
directions"; the address string stays as the row's `value`.
Accessibility label updates accordingly: "Get directions to
<address>".

**T4 — Inline SocialIcons in Hero.** Drop a `<SocialIcons compact />`
row inside `BusinessHero` just below the category/rating row, gap-6
above the heart. Same icon set + ordering as the BusinessCard (Phone
→ WhatsApp → Web → IG/FB). No new component — just reuse the
existing `SocialIcons.tsx` which already accepts `phone`,
`whatsapp_number`, `website`, `facebook_url`, `instagram_url`.
Hidden when none of those fields are present (the component already
short-circuits on `icons.length === 0`).

**T5 — Bottom "Go back" button.** Final child of the detail
`ScrollView`, after the Gallery. A `Pressable` styled as a centered
text link (`text-sm font-semibold text-primary`) reading "← Go back"
that calls `router.back()`. No conditional render — always visible.
Doesn't touch the Stack header's existing back chevron; this is an
additive affordance at the bottom for users who don't think to swipe
or hit the chevron after a long scroll.

**Alternatives considered:**

- **Gallery: keep 240×160 horizontal thumbnails + add auto-advance** —
  rejected because the user explicitly picked the full-width swipe
  variant during consultation for the App Store screenshot value.
- **Directions: cross-platform Google Maps HTTPS URL only (one code
  path, no platform branch)** — rejected because the user explicitly
  picked the native-maps variant for the better tap-to-navigate UX.
  The HTTPS URL stays as the fallback so the change is safe even when
  the native scheme is unavailable.
- **Hero socials: keep ContactCard-only** — rejected because the
  user explicitly picked mirroring web's inline-social hero for
  faster contact action.
- **Skip the bottom Go-back button (rely on Stack header chevron +
  swipe)** — rejected: the user listed it explicitly; an extra
  affordance at the bottom of a long scroll is a no-cost win.
- **Add `expo-image` for the gallery (blur-up while loading,
  better memory)** — rejected: requires a native rebuild, which
  the documented preference rules out.

## Data model changes

None. All required fields already exist on `Business` /
`BusinessImage` validators.

## Files to touch

**New:**

- `apps/mobile/features/listings/components/TierPill.tsx` — small
  rounded pill, tier1/tier2 only, sourced from existing tokens.

**Edit:**

- `apps/mobile/features/listings/components/BusinessHero.tsx` —
  render `TierPill` next to the heart; render `SocialIcons` (compact)
  below the category/rating row.
- `apps/mobile/features/listings/components/BusinessCard.tsx` —
  render `TierPill` in the actions column.
- `apps/mobile/features/listings/components/Gallery.tsx` — full
  rewrite to full-width FlatList + auto-advance + dots.
- `apps/mobile/features/listings/components/ContactCard.tsx` — new
  `directionsUrlFor()` helper + native scheme probe, rename row label
  to "Get directions".
- `apps/mobile/app/(app)/listings/[category]/[id].tsx` — add the
  "← Go back" Pressable at the bottom of the detail ScrollView.

No backend / validator / route changes.

## Edge cases

- **`business.tier === "tier3"`** — TierPill returns `null`. No
  layout shift on the hero (heart still right-aligned).
- **Single-image gallery (`images.length === 1`)** — auto-advance
  interval doesn't fire; dot indicators don't render. Falls back
  cleanly to a static full-width image.
- **Empty gallery (`images.length === 0`)** — Gallery component
  returns `null` before any render, same as today.
- **No address on business** — Address row already absent today via
  the existing `if (business.address)` gate. Unchanged.
- **`Linking.canOpenURL` rejects native scheme** — HTTPS Google
  Maps directions URL fallback always works (universal link;
  opens app if installed, else browser). Worst case is the user
  lands in their browser's Google Maps tab, which still shows
  directions.
- **No phone/whatsapp/website/social on business** — inline
  `SocialIcons` in hero short-circuits on empty (its existing
  `icons.length === 0` guard). Hero just doesn't render that row.
- **TierPill `tier` value not in `"tier1" | "tier2" | "tier3"`
  (forward-compat for future tiers)** — render `null` to be safe;
  log nothing (mobile has no observability sink yet).
- **Gallery `scrollToIndex` race during component unmount** —
  store the interval id in a ref; clear in the effect's cleanup.
  Guard `flatListRef.current` access against `null`.
- **Pause on touch leaks pause state if the user scrolls and
  immediately navigates away** — `isPausedRef` is per-component
  instance; component unmount disposes it. No leak.
- **Bottom "Go back" overlap with system home indicator** — wrap
  in the existing `SafeAreaView edges={["bottom"]}` already
  applied to the screen. No new safe-area handling.

## Acceptance criteria

- [ ] TierPill renders on `BusinessHero` for tier1 + tier2 businesses
      and nothing for tier3.
- [ ] TierPill renders on `BusinessCard` for tier1 + tier2 and nothing
      for tier3 (matching web's placement above the More Info chevron
      analogue).
- [ ] TierPill labels match web's `TIER_LABELS` map exactly
      ("Sponsored Top" / "Sponsored Level 2") — no drift like the
      pre-existing web `business-card.tsx:151` issue that web
      already fixed.
- [ ] TierPill bg/fg colors source from NativeWind classes
      `bg-tier1 text-tier1Foreground` / `bg-tier2 text-tier2Foreground`;
      lefthook `check-contrast` passes on commit.
- [ ] Gallery is full-width swipe with `pagingEnabled` snapping
      between images.
- [ ] Gallery auto-advances every 3500ms when `images.length > 1`.
- [ ] Gallery pauses auto-advance during user drag
      (`onScrollBeginDrag`) and resumes after drag end
      (`onScrollEndDrag`).
- [ ] Gallery dot indicators render only when `images.length > 1`;
      active dot is filled `text-foreground` color, inactive is
      `mutedForeground` at 0.4 alpha.
- [ ] Tapping a dot calls `scrollToIndex(i)` and updates `activeIndex`.
- [ ] ContactCard "Get directions" row tap opens Apple Maps in
      directions mode on iOS, Google Maps Nav on Android, when the
      native scheme is available.
- [ ] When `Linking.canOpenURL` rejects the native scheme, the row
      tap falls back to `https://www.google.com/maps/dir/?api=1&destination=<addr>`.
- [ ] BusinessHero shows inline SocialIcons (compact mode) below
      the category/rating row when at least one social/contact
      field is present.
- [ ] "← Go back" Pressable renders at the bottom of the detail
      ScrollView, on every detail screen (no conditional).
- [ ] Tapping "← Go back" calls `router.back()` and lands the user
      on the previous screen in the stack (the listings page,
      typically).
- [ ] `pnpm --filter @aira/mobile typecheck` passes after every
      task.
- [ ] `pnpm --filter @aira/mobile lint` passes after every task.
- [ ] All five tasks ship as separate commits (mstack atomic-commit
      discipline).
- [ ] No new top-level deps added; no Expo Go incompatibility.

## Open questions

For the reviewer (`/mlabs-review`) to resolve before implementation.

- Should the `TIER_LABELS` strings live in `packages/config` (so web
  + mobile share one source) or be inlined in both? Web inlines them
  in `business-card.tsx`; mobile inlining matches that pattern but
  perpetuates the duplication risk web already had.
- Bottom "Go back" button copy: literal "← Go back" (matches web),
  "Back to listings", or just "Back"? Web's exact string is "Go
  back" with a left-arrow ASCII or unicode glyph — preserve it as-is?
- Gallery dot indicator placement: in the white margin below the
  image (web's pattern) or as an overlay on the bottom of the image
  itself (more compact, common on TikTok/Instagram-style carousels)?
  Web does the former.
- Hero SocialIcons row position: gap-6 below rating row (proposed)
  or above the rating row? Web has them in a different vertical
  position relative to the title block — worth a screenshot
  comparison during review.
- Should T3 ("Get directions") also update the `accessibilityHint`
  on the row so VoiceOver previews "Opens Apple Maps with directions
  from your current location"? Currently the contact rows have no
  hint, just label.
