# Plan: Darken brand primary so white text passes WCAG AA

**Date:** 2026-05-24
**Slug:** 2026-05-24-primary-color-darken
**Status:** reviewed
**Author:** VB (framer@millionlabs.co.uk)

---

## Problem

The current brand primary is `oklch(0.69 0.18 39)` (≈`#FF6B2C`, a bright orange).
White text on that orange gets ~2.6:1 — fails WCAG AA (4.5:1 needed for body
text). The repo solves it today by pairing `primary` with a near-black
`primaryForeground` (`oklch(0.205 0 0)`, ~7.5:1), and the pre-commit
`check-contrast` hook (`lefthook.yml:21`, `scripts/check-contrast.ts:180`)
enforces the pair.

The result is dark-on-orange buttons across all 41 `bg-primary` usages on web,
mobile, and email surfaces. The user has decided this looks unfinished for a
production template and wants white-on-orange buttons to be possible.

A secondary problem surfaced during planning: `text-primary` is used on white
backgrounds in marketing (`hero.tsx:20`, `testimonial.tsx:37`, `feature-grid.tsx:54`,
`why-mstack.tsx:47` — eyebrow labels, highlighted words, check icons, brand
dots). At the current bright orange that's ~3.4:1 on white — already failing
AA body text. The contrast script doesn't check `primary` against `background`,
so this has been quietly under-contrast. A darker primary fixes both problems
with one token shift.

**Persona:** fork developers who want a production-grade template that ships
with brand colors that pass accessibility audits out of the box. Secondary:
end-users of forked apps who get higher-contrast UI.

Success: white text on filled brand-orange buttons passes AA across web,
mobile, and email; brand-orange text on white backgrounds (eyebrows,
highlights) also passes AA; check-contrast hook continues to pass on every
commit; brand identity reads as the same warm-orange family, just deeper.

## Scope

**In:**

- Update `packages/config/src/design.ts` light + dark themes:
  - `primary`: `oklch(0.69 0.18 39)` → `oklch(0.55 0.20 32)` (≈`#A8421A`,
    terracotta, white-on-primary ≈ 6.0:1)
  - `primaryForeground`: `oklch(0.205 0 0)` → `oklch(0.985 0 0)` (near-white)
- Update `apps/web/src/app/globals.css` `--primary` and `--primary-foreground`
  CSS vars to mirror (lines 24-25 for `:root`, 68-69 for `.dark`). The
  comment in `design.ts:6` says "Keep in sync with globals.css until v1.1
  ships codegen" — both are the source-of-truth pair today.
- Update `packages/config/src/brand.ts` `emailColors`:
  - `primary`: `#FF6B2C` → `#A8421A`
  - `primaryForeground`: `#1F1F1F` → `#FFFFFF`
- Regenerate `apps/mobile/tailwind.config.js` via
  `pnpm tsx scripts/gen-mobile-tailwind.ts` — the script reads
  `design.colors` directly (`scripts/gen-mobile-tailwind.ts:44-54`) and
  emits the Tailwind color map mobile NativeWind reads.
- Verify the `check-contrast` hook passes (it will block the commit
  otherwise). Add a pair if needed: `primary` vs `background` (currently
  not checked — see Concerns).
- Visual sanity check of:
  - `apps/web/src/components/marketing/hero.tsx` — hero pill, check icons
  - `apps/web/src/components/marketing/marketing-nav.tsx` — brand dot
  - `apps/web/src/components/marketing/feature-grid.tsx` — eyebrow + icon tiles
  - `apps/web/src/components/marketing/testimonial.tsx` — eyebrow + mono tag
  - `apps/web/src/components/marketing/cta-band.tsx` — `font-mono text-primary`
  - `apps/web/src/components/marketing/why-mstack.tsx` — eyebrow + bullet dots
  - `apps/mobile/components/ui/Button.tsx` primary variant
  - `apps/mobile/app/(auth)/welcome.tsx` — Create-account CTA
  - Any rendered React Email template (preview at `/dev/emails`).

**Out (deferred):**

- Changing the `ring` token. User explicitly chose to keep ring as-is
  (`oklch(0.62 0.19 39)`) per "legacy shadcn pattern." See Open Questions —
  there's a real concern this leaves the ring *lighter* than the new
  primary, inverting the "ring is the more prominent accent" relationship.
- Logo SVG / favicon color changes. Brand identity in any standalone asset
  (e.g. `apps/web/public/*`) stays untouched. If forks want to update
  matching assets, that's their call.
- New tokens (e.g. `primaryButton` / `primaryAccent` split). User explicitly
  picked Approach A (one token shift) over Approach B (split). Single
  source of truth.
- Renaming or re-keying the primary token. It stays `primary`.
- Changing other brand-adjacent tokens (`destructive`, `success`, `warning`)
  — only `primary` family in scope.
- Re-running visual regression / Playwright screenshots — `/mlabs-qa` does
  that. This plan ships the token change and a manual visual check.

## Approach

**One-token shift in `design.ts` + mirror in `globals.css` + mirror in
`brand.ts` emailColors.** The design system already has a single
source-of-truth pattern: `design.ts` defines `primary`, every consumer
(Tailwind on web, NativeWind on mobile, React Email on server) reads from
that token. We change two values in `design.ts` (light + dark `primary`,
light + dark `primaryForeground`), mirror to the three downstream surfaces
that need the literal CSS string (globals.css, generated mobile tailwind
config, email hex copy), and the entire codebase picks up the change.

The new primary `oklch(0.55 0.20 32)` is a deeper, more saturated terracotta-
adjacent orange. White on it ≈ 6.0:1 (passes AA body 4.5:1, near AAA 7:1).
Primary-on-white ≈ 4.85:1 (passes AA body too — fixes the latent failure on
marketing text-primary usages "for free").

`primaryForeground` flips from `oklch(0.205 0 0)` (near-black) to
`oklch(0.985 0 0)` (near-white), matching the existing dark-theme foreground
convention. The contrast script will re-evaluate `primaryForeground/primary`
in both themes; both pass.

The dark theme uses the *same* `primary` value as light (it always has — see
`design.ts:49`). User confirmed dark theme tracks the same shift; we update
both themes' `primary` to the new value.

**Alternatives considered:**

- **Two-token split (Approach B)** — keep bright `primary` for accents, add
  new `primaryButton` for filled CTAs. Rejected per user: fragments the
  design language, adds API surface, isn't idiomatic shadcn, and Button
  components would need to switch token bindings everywhere.
- **Keep current dark-on-orange (Approach C)** — rejected per user: the
  whole point of the change is white text.
- **Minimal-shift to `oklch(0.62 0.19 39)`** — my first questionnaire
  presented this as "passes AA at ~4.5:1." Recomputed with proper sRGB
  gamma it's actually ~3.8:1 — fails the hook. Rejected because the
  check-contrast hook would block every commit. Real minimum that passes
  is around `oklch(0.58 0.20 35)` (~4.75:1); user picked the comfortable
  margin `oklch(0.55 0.20 32)` (~6.0:1) instead.
- **Bold rebrand to `oklch(0.50 0.18 30)`** (~8:1, distinctly rust) —
  rejected per user as too large a brand shift for a single token tweak.
- **Add `primary` vs `background` to PAIRS in check-contrast.ts** — done
  as part of this plan (see Open Questions for whether to gate it as
  body 4.5 or large 3.0). Catches the latent text-primary-on-white
  failure that's gone unenforced.

## Data model changes

None. Pure token + CSS change.

## Files to touch

**New:**

- None.

**Edit:**

- `packages/config/src/design.ts` — light `primary` (line 20), light
  `primaryForeground` (line 21), dark `primary` (line 49), dark
  `primaryForeground` (line 50). Update the comment block (lines 18-19)
  that explains the old contrast reasoning.
- `apps/web/src/app/globals.css` — `:root --primary` (line 24),
  `--primary-foreground` (line 25), `.dark --primary` (line 68),
  `--primary-foreground` (line 69). These CSS vars are the runtime
  source for Tailwind; without this mirror the change doesn't ship to
  the web app.
- `packages/config/src/brand.ts` — `emailColors.primary` (line 31) and
  `emailColors.primaryForeground` (line 32). Email clients can't parse
  oklch; this hex pair is the email-side mirror.
- `apps/mobile/tailwind.config.js` — regenerated by
  `pnpm tsx scripts/gen-mobile-tailwind.ts`. Don't hand-edit; the
  committed change is the regenerated file diff (mobile NativeWind reads
  the literal color values from here).
- `scripts/check-contrast.ts` — append a new pair to `PAIRS`
  (`scripts/check-contrast.ts:171`): `{ fg: "primary", bg: "background",
  severity: "body", note: "primary as inline accent text" }`. Catches
  future regressions where primary-on-white drifts below 4.5:1.

## Edge cases

- **`primary/10` opacity overlays.** Several marketing components use
  `bg-primary/10` for tinted backgrounds (`hero.tsx:20`,
  `feature-grid.tsx:128`, `why-mstack.tsx:85`). The 10% tint of the new
  darker orange is more saturated than the old; should read as a deeper
  tint but won't be muddy. No CSS change needed (`/10` is a Tailwind
  computed alpha), but visual sanity check during implementation.
- **`primary/25` ring overlays on hero pill** (`hero.tsx:20`). 25% of the
  darker orange = darker ring tint. Same outcome — read as deeper accent,
  no breakage.
- **`hover:border-primary/40`** (`feature-grid.tsx:127`). Card hover state
  goes darker; intentional emphasis works either way.
- **Focus ring (`ring` token).** Stays at `oklch(0.62 0.19 39)` per user
  choice — which is now *lighter* than the new `primary` (0.55). Two
  practical effects:
  1. The ring appears as a lighter / brighter accent than the primary
     surface it surrounds. This inverts the "ring more prominent" hint of
     the legacy shadcn pattern. May or may not feel right visually.
  2. The 3:1 ring-visibility-against-white check (`check-contrast.ts:192`)
     still passes for `oklch(0.62 0.19 39)` (currently ~3.0:1 ring-on-white,
     unchanged). Hook stays green.
  See Open Questions for whether to revisit during review.
- **Email rendering.** `brand.ts` comment (line 28) notes a deliberate
  divergence between `design.border` and `emailColors.border` (softer for
  email). For `primary` we keep them aligned — same hex mirror semantic
  as today.
- **`#FFFFFF` foreground on `#A8421A` in Outlook 2007-2016.** Old Outlook
  desktop strips alpha and renders solid blocks. Solid orange + solid white
  text is the most universally-rendered combination, so this case
  improves vs the current pseudo-black `#1F1F1F` which can look
  near-black on hostile clients.
- **`globals.css` lines 109-110** (`@theme inline --color-primary:
  var(--primary)`) are var indirections — they don't need editing.
- **Mobile dark mode reads `primaryDark` via the gen script** (see
  `gen-mobile-tailwind.ts:53`). Same darken applies; regenerate covers it.
- **The `sidebar-primary` and `chart-*` tokens in `globals.css`** are not
  in `design.ts` and are unrelated to brand orange (sidebar-primary is
  literally near-black `oklch(0.205 0 0)`). Don't touch them — out of scope.
- **`text-primary` on `bg-card`.** `card` is white in light theme
  (`oklch(1 0 0)`) so identical to text-on-background. In dark theme
  `card` is `oklch(0.22 0.03 260)` (navy-ish); primary-on-dark-card
  contrast for orange text on navy is comfortable. No new check needed.
- **Hook may newly flag the `primary` vs `background` pair** if I add
  it before the token change. Order matters: change tokens first, then
  add the new pair, so the hook never goes red mid-task.

## Acceptance criteria

- [ ] `packages/config/src/design.ts` light + dark `primary` =
      `oklch(0.55 0.20 32)`, `primaryForeground` = `oklch(0.985 0 0)`.
- [ ] `apps/web/src/app/globals.css` `:root` + `.dark` blocks mirror the
      new values for `--primary` and `--primary-foreground`.
- [ ] `packages/config/src/brand.ts` `emailColors.primary = "#A8421A"`,
      `emailColors.primaryForeground = "#FFFFFF"`. Comments updated.
- [ ] `apps/mobile/tailwind.config.js` regenerated; diff shows the new
      primary hex values in the emitted color map.
- [ ] `scripts/check-contrast.ts` `PAIRS` includes
      `{ fg: "primary", bg: "background", severity: "body" }`.
- [ ] `pnpm check-contrast` passes — every checked pair is green in both
      themes. White-on-primary ≥ 4.5:1 (target ~6.0:1).
      Primary-on-background ≥ 4.5:1 (target ~4.85:1).
- [ ] `pnpm typecheck` and `pnpm lint` pass across the workspace.
- [ ] Manual visual check (load web at localhost, screenshot or eyeball):
      - Hero CTA button: white text on terracotta-orange, readable.
      - Hero eyebrow pill: terracotta text on `primary/10` tint, readable.
      - Marketing nav: brand dot still reads as the brand accent.
      - Feature grid eyebrow + icon tiles: cohesive with the new shade.
      - Mobile welcome screen "Create account" button: white-on-terracotta.
- [ ] No regression in `apps/web/src/app/dev/emails` previews — all
      React Email templates render with the new orange + white CTA labels.
- [ ] No new lint failures from `no-brand-string-literal` (brand strings
      are still sourced from `@mlabs/config`).
- [ ] `lefthook` pre-commit passes on the commit(s).

## Open questions

For the reviewer (`/mlabs-review`) to resolve before implementation.

- **Ring token alignment.** User chose to keep ring at `oklch(0.62 0.19 39)`,
  but that's now *lighter* than the new primary (0.55). The legacy shadcn
  pattern is "ring slightly darker than primary for prominence on focus."
  Recommendation: revisit and darken ring to `oklch(0.48 0.20 30)` (≈
  `#8E3815`) so it stays more prominent than primary. Or accept the
  inversion as a deliberate "softer focus accent" choice. Reviewer to
  decide.
- **Should the new `primary vs background` pair be `body` (4.5) or `large`
  (3.0) severity?** Marketing usages are mostly large display text
  (eyebrows, hero highlights) where 3.0 would suffice. But the check icons
  in `hero.tsx:72-81` are small (text-base), so 4.5 is safer. Recommendation:
  body / 4.5 (matches what we're actually rendering at small sizes).
- **Update the documentation comment in `design.ts:18-19`** ("white-on-orange
  ≈3.4:1 fails; dark-on-orange ≈6:1 passes") to reflect the new contrast
  reasoning. Probably want a short comment explaining: terracotta deep
  orange chosen so white passes AA, primary-on-white also passes AA.
- **DESIGN.md.** If there's a `DESIGN.md` at repo root that documents the
  brand palette, it should be updated too. Reviewer should confirm whether
  it exists and is in scope.
- **Any logo SVGs that hardcode `#FF6B2C`?** `apps/web/public/` and
  `apps/mobile/assets/` may have brand-color SVGs that don't read from the
  token system. Reviewer to grep before implementation. If found, decide
  whether to update them in this plan or defer to a follow-up.
- **One commit or multiple?** The five edits are tightly coupled (design.ts,
  globals.css, brand.ts, tailwind.config.js, check-contrast.ts pair). A
  single commit is most reviewable. Reviewer to confirm.
