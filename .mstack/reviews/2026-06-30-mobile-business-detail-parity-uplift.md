# Review: Mobile Business Detail screen — parity uplift bundle

**Date:** 2026-06-30
**Slug:** 2026-06-30-mobile-business-detail-parity-uplift
**Plan reviewed:** [2026-06-30-mobile-business-detail-parity-uplift.md](../plans/2026-06-30-mobile-business-detail-parity-uplift.md)
**Status:** approved
**UI-Significant:** no
**Reviewer:** framer@millionlabs.co.uk (via /mlabs-review)

---

## Summary

Approved with two net-new decisions locked during review and four of the
plan's five Open Questions auto-resolved from code reading. No blockers, no
backend changes, no new deps, no Expo Go incompatibility. UI-Significant is
**no** because every touched file is under `apps/mobile/` — the heuristic only
fires on `apps/web/src/**/*.tsx` paths. Hand off to `/mlabs-code`.

The single ambiguity the user resolved during review was the bottom Go-back
button styling — locked to the full Button-primitive variant (matches web
parity) rather than the softer text-link variant the plan proposed.

## Findings

### Blockers (must fix before /mlabs-code)

None.

### Concerns (raised, decided, recorded)

- **Concern:** Plan OQ #1 asked whether `TIER_LABELS` should be inlined in
  mobile or pulled from a shared package. Codebase reading showed it is
  already exported from `@aira/validators` (`packages/validators/src/businesses.ts:29`)
  and consumed in 5 places on web. Inlining on mobile would deliberately
  re-introduce the duplication risk web already eliminated.
  **Decision:** Mobile imports `TIER_LABELS` from `@aira/validators`. One
  source of truth. Plan OQ #1 dropped.

- **Concern:** Plan proposed the bottom "Go back" affordance as a "centered
  text link" (`text-sm font-semibold text-primary`). Web's equivalent
  (`apps/web/src/features/listings/components/business-detail.tsx:196-204`)
  is a full shadcn `Button` with `buttonVariants()` + `<ArrowLeft>` icon — a
  visually prominent control, not a text link. Two defensible directions
  (full parity vs softer mobile-native affordance).
  **Decision (user, locked):** Match web — full mobile `Button` primitive
  (variant `secondary`), MaterialCommunityIcons `arrow-left` glyph, label
  "Go back". Self-width centered (not `fullWidth`). Same ~44pt tap target
  the existing Button primitive enforces.

- **Concern:** Plan claimed mobile tailwind classes `bg-tier1` /
  `text-tier1Foreground` are emitted from `gen-mobile-tailwind.ts`.
  Confirmed in `apps/mobile/tailwind.config.js:49-53` (light) and `:82-87`
  (dark). However, no existing mobile code consumes any `bg-tier*` class
  yet — TierPill is the first user. NativeWind v4 first-use risk is low but
  non-zero; check that the generated CSS actually contains the rule after
  the first commit.
  **Decision:** Proceed. If NativeWind silently drops the class (because
  no source file referenced it during the JIT scan), add an explicit
  `safelist: ["bg-tier1", "bg-tier2", "text-tier1Foreground", "text-tier2Foreground"]`
  to `tailwind.config.js`. Document the fix in the commit message if it
  triggers.

- **Concern:** Plan OQ #3 asked dot indicators position (below image vs
  overlay). Web does below the image
  (`business-image-carousel.tsx:91-108`). No reason to deviate.
  **Decision:** Below the image. OQ #3 dropped.

- **Concern:** Plan OQ #4 asked the hero socials row vertical position.
  Web puts the social row immediately under the rating/category block
  (`business-detail.tsx:89`). No reason to deviate.
  **Decision:** Below the rating row. OQ #4 dropped.

- **Concern:** Plan OQ #5 asked whether T3 ("Get directions") should add
  `accessibilityHint` to the row. Existing contact rows have label only.
  Adding the hint is a small a11y win at no cost.
  **Decision:** Yes — add `accessibilityHint="Opens directions to <address>"`
  on the directions row only. Don't backfill the other rows in this
  bundle (out of scope; would be a separate a11y pass).

### Suggestions (taken or deferred)

- **Taken:** Each task ends with `pnpm --filter @aira/mobile typecheck` and
  `pnpm --filter @aira/mobile lint` before commit. Already in the plan's
  acceptance criteria but worth re-stating per task in the implementation
  plan so `/mlabs-code` doesn't skip.
- **Taken:** T2 (Gallery rewrite) needs to verify the FlatList
  `scrollToIndex` race-on-unmount: store interval id in a ref, clear in the
  effect's cleanup function. Plan called this out in Edge Cases; reiterating
  in T2 acceptance.
- **Deferred:** Test that ContactCard's Apple Maps URL scheme actually opens
  the Maps app on a real iOS device. `Linking.canOpenURL` returning true is
  a reasonable proxy but not a guarantee. Validation belongs in `/mlabs-qa`
  on Expo Go, not in this implementation pass.
- **Deferred:** Long-press preview on iOS gallery images (already excluded
  in plan's Out section — native module territory).
- **Deferred:** Track `business.tier` changes via admin and recheck mobile
  rendering — outside scope, this bundle just makes the field visible.

## Decisions locked

Net new decisions made during review (beyond what was in the plan):

- **`TIER_LABELS` source = `@aira/validators`** (not inline, not @aira/config).
- **Bottom Go-back styling = mobile `Button` primitive** with `secondary`
  variant + `arrow-left` icon, NOT a text link.
- **NativeWind safelist as fallback only** — don't pre-add the tier classes
  to the safelist; add only if the first commit fails to compile them.
- **Accessibility hint = directions row only** — no backfill on other contact
  rows in this bundle.

## Implementation plan

Ordered tasks for `/mlabs-code` to execute top-to-bottom. Each task is atomic
(reviewable as a single commit). Tasks ordered so the codebase stays in a
working state at every commit. Tier badge first (zero risk, highest user
value); gallery rewrite last (largest diff).

### Task 1: TierPill component + render on Hero and Card

- **Files:**
  - `apps/mobile/features/listings/components/TierPill.tsx` (new)
  - `apps/mobile/features/listings/components/BusinessHero.tsx` (edit)
  - `apps/mobile/features/listings/components/BusinessCard.tsx` (edit)
- **What:** New `TierPill` component takes `tier: BusinessTier` prop, returns
  `null` when `tier === "tier3"`, otherwise renders a small rounded-full
  pill with `bg-tier1 text-tier1Foreground` (or `tier2` equivalents) +
  the label from `TIER_LABELS` imported from `@aira/validators`. Same visual
  proportions as web's TierPill (`px-1.5 py-px`, `text-[0.55rem]` analogue
  on RN: 9pt font size, font-bold, tracking-wide). Render on
  `BusinessHero` (top-right corner of the hero, above the heart) and on
  `BusinessCard` (in the actions column, above the existing right-side
  controls — mirrors web's `business-card.tsx:128` placement).
- **Acceptance:**
  - TierPill returns `null` for tier3 (verified by viewing a tier3 business).
  - tier1 + tier2 businesses show the pill with the correct label.
  - Pill bg/fg colors match the tier tokens — pill on tier1 is olive
    `#496036` bg with cream `#f2eadd` fg; tier2 is burnt orange `#c16e2d`
    bg with the same cream fg.
  - Hero pill sits at the top-right above the heart with no layout shift
    when absent.
  - Card pill sits in the right-side actions column.
  - `pnpm --filter @aira/mobile typecheck` clean.
  - `pnpm --filter @aira/mobile lint` clean.
  - Lefthook `check-contrast` passes on commit.
- **Pause if:**
  - NativeWind silently drops `bg-tier1` / `bg-tier2` classes (visual check
    shows the pill rendering with no background). If this happens, add the
    four classes to a `safelist` array in `apps/mobile/tailwind.config.js`
    and document in the commit message.

### Task 2: ContactCard — Get directions via native maps schemes

- **Files:**
  - `apps/mobile/features/listings/components/ContactCard.tsx` (edit)
- **What:** Rename the address row label from "Address" to "Get
  directions" (keep `business.address` as the row's `value` so the address
  string still renders below the label). Replace the `Linking.openURL`
  call with a new top-of-file helper `openDirections(address: string)` that:
  - On iOS: probe `maps://?daddr=<encoded>` via `Linking.canOpenURL`;
    open it if true.
  - On Android: probe `google.navigation:q=<encoded>` via
    `Linking.canOpenURL`; open it if true.
  - Fallback (either platform if the probe fails or rejects): open
    `https://www.google.com/maps/dir/?api=1&destination=<encoded>`.
  Add `accessibilityHint="Opens directions to <address>"` on the directions
  row (no other rows touched).
- **Acceptance:**
  - Row label reads "Get directions" not "Address".
  - Tapping the row on iOS opens Apple Maps in directions mode (validated in
    QA on real device — implementation just checks the `Linking.canOpenURL`
    branch is taken).
  - Tapping on Android opens Google Maps Navigation when installed.
  - When the native scheme rejects, the HTTPS Google Maps directions URL
    opens (browser or Google Maps app if installed).
  - Address string still renders below the label as today.
  - `pnpm --filter @aira/mobile typecheck` clean.
  - `pnpm --filter @aira/mobile lint` clean.

### Task 3: BusinessHero — inline SocialIcons row

- **Files:**
  - `apps/mobile/features/listings/components/BusinessHero.tsx` (edit)
- **What:** Add `<SocialIcons compact />` row inside `BusinessHero` just
  below the category/rating row (above any new gap to the ContactCard).
  Reuse the existing `SocialIcons.tsx` component — its compact mode
  already accepts `phone`, `whatsapp_number`, `website`, `instagram_url`,
  `facebook_url` props. Wire each from `business.*`. No new component.
  Component already short-circuits to `null` when `icons.length === 0`,
  so businesses with no contact fields don't show an empty row.
- **Acceptance:**
  - Hero renders the social row below the rating row on businesses with
    at least one social/contact field.
  - Hero shows no social row when all fields are empty.
  - Icon order matches the existing compact ordering (Phone → WhatsApp →
    Web → IG/FB).
  - Same icon set + bg colors as the BusinessCard's row.
  - `pnpm --filter @aira/mobile typecheck` clean.
  - `pnpm --filter @aira/mobile lint` clean.

### Task 4: Bottom "Go back" Button on detail screen

- **Files:**
  - `apps/mobile/app/(app)/listings/[category]/[id].tsx` (edit)
- **What:** Add the existing mobile `Button` primitive (from
  `apps/mobile/components/ui/Button.tsx`) as the final child of the detail
  `ScrollView`, after the Gallery. Variant `secondary`, NOT `fullWidth`
  (centered, self-width — matches web's button look). Label "Go back" with
  a leading MaterialCommunityIcons `arrow-left` glyph rendered inside a
  Text alongside the label (matches the inline-glyph pattern established
  in `BusinessHero` for the verified tick). `onPress={() => router.back()}`.
  Wrap in `paddingTop: 24` so it sits well below the last card. The
  surrounding `SafeAreaView edges={["bottom"]}` already handles the system
  home indicator inset.
- **Acceptance:**
  - Button renders at the bottom of every detail screen (no conditional).
  - Tapping calls `router.back()` and lands on the previous screen.
  - Button visual matches the existing `secondary` variant in the
    Button primitive (cream-on-secondary border + cream-fg text).
  - Arrow-left glyph sits inline left of "Go back" text.
  - Tap target ≥44pt (enforced by Button primitive's size styles).
  - `pnpm --filter @aira/mobile typecheck` clean.
  - `pnpm --filter @aira/mobile lint` clean.

### Task 5: Gallery — full-width auto-advancing carousel with dots

- **Files:**
  - `apps/mobile/features/listings/components/Gallery.tsx` (edit, near
    full rewrite)
- **What:** Rewrite the existing horizontal `ScrollView` of 240×160
  thumbnails to a full-width swipeable carousel:
  - `FlatList` ref, `horizontal`, `pagingEnabled`, `showsHorizontalScrollIndicator={false}`,
    `keyExtractor={(img) => img.id}`.
  - Each item is a full-width Image (`width: Dimensions.get("window").width`,
    `height: 224` to match web's `h-56`), `resizeMode="cover"`.
  - `activeIndex` state, updated in `onMomentumScrollEnd` from the
    `contentOffset.x / itemWidth` rounded.
  - Auto-advance via `setInterval(3500)` calling
    `flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true })`
    when `images.length > 1`. Skip the advance when `isPausedRef.current`
    is true. Store the interval id in a ref; clear in the effect cleanup.
  - `isPausedRef` toggled true in `onScrollBeginDrag`, false in
    `onScrollEndDrag` (mirrors web's mouseenter/mouseleave +
    touchstart/touchend).
  - Dot indicators row below the carousel — only renders when
    `images.length > 1`. Each dot is a `Pressable` (8×8, rounded-full)
    that calls `scrollToIndex(i)`. Active dot: `bg-foreground` + 110%
    scale; inactive: `bg-mutedForeground/40`. Matches web's pattern at
    `business-image-carousel.tsx:91-108`.
  - Component still returns `null` when the images array is empty.
  - Single-image case: just renders the one full-width image, no dots,
    no auto-advance.
- **Acceptance:**
  - Full-width image swipe with snap-paging.
  - Auto-advance every 3500ms when `images.length > 1`.
  - Auto-advance pauses while the user drags; resumes on drag end.
  - Dot indicators render only when `images.length > 1`.
  - Tapping a dot snaps the carousel to that index and updates `activeIndex`.
  - Single-image gallery renders a static full-width image with no dots.
  - Empty gallery still returns `null` (component absent).
  - No `scrollToIndex` errors during unmount (interval cleared in effect
    cleanup).
  - `pnpm --filter @aira/mobile typecheck` clean.
  - `pnpm --filter @aira/mobile lint` clean.
- **Pause if:**
  - `FlatList.scrollToIndex` throws an "out of range" warning on the
    first auto-advance. Common cause: variable item widths during the
    initial layout. Fix by setting `getItemLayout` with a fixed
    `Dimensions.get("window").width` and document.

## Open questions

Anything still unresolved that `/mlabs-code` should escalate, not guess.

- None. All five plan OQs resolved (#1, #3, #4, #5 auto-resolved from code;
  #2 (back button style) locked by user during review).
