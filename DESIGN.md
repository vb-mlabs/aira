# DESIGN.md

The Mlabs template's visual identity, in one document. Pair this with
`packages/config/src/design.ts` (executable tokens) and `apps/web/src/app/
(app)/design/page.tsx` (live style guide).

> If you change a token, change it in **`packages/config/src/design.ts`**.
> Then mirror in `apps/web/src/app/globals.css`. Then run
> `pnpm gen:mobile-tw`. Until v1.1 ships codegen, those three steps stay
> manual.

---

## Brand identity

**Name.** "AIRA" by default. Editable in
`packages/config/src/brand.ts` — the ESLint rule
`no-brand-string-literal` enforces that the literal `brand.name` value
appears nowhere outside `config/`, `templates/`, `legal/`,
`translations/`, `docs/`, `tests/`, and `e2e/`.

**Mood.** Warm, grounded, premium. Cream paper surfaces, olive green
accent, humanist sans body type. Not tech-clinical; not playful.

---

## Tokens

### Light (default)

| Token | OKLCH | Approx hex | Purpose |
|---|---|---|---|
| `background` | `oklch(0.90 0.04 85)` | `#EAE0CB` | Page cream background |
| `foreground` | `oklch(0.25 0.04 60)` | `#3D2814` | Text brown |
| `card` | `oklch(0.94 0.02 80)` | `#F3EBDD` | Brand cream bright — card surface |
| `cardForeground` | `oklch(0.25 0.04 60)` | `#3D2814` | Text on card |
| `primary` | `oklch(0.46 0.07 132)` | `#4F653B` | AIRA olive green — CTAs, accent, focus |
| `primaryForeground` | `oklch(0.94 0.02 80)` | `#F3EBDD` | Cream on olive (AA body ~4.65:1) |
| `secondary` | `oklch(0.93 0.03 85)` | `#EDE3D0` | Soft warm surface, secondary buttons |
| `muted` | `oklch(0.88 0.03 85)` | `#E2D5BD` | Subtle background with warm tint |
| `mutedForeground` | `oklch(0.45 0.04 60)` | `#6B4A32` | Helper text |
| `accent` | `oklch(0.95 0.02 85)` | `#F5EDE0` | Hover surfaces |
| `destructive` | `oklch(0.55 0.22 27)` | `#C0391C` | Errors, danger |
| `border` | `oklch(0.50 0.07 80)` | `#8A6540` | Deep warm tan borders (3:1+ vs bg) |
| `input` | `oklch(0.50 0.07 80)` | `#8A6540` | Input outlines |
| `ring` | `oklch(0.46 0.07 132)` | `#4F653B` | Focus ring — same as primary |
| `success` | `oklch(0.46 0.07 132)` | `#4F653B` | Success states (reuses olive) |
| `warning` | `oklch(0.62 0.13 55)` | `#9A6628` | Warning states — burnt orange |

**AIRA tier extensions** (sponsorship tiers + category hierarchy):

| Token | OKLCH | Purpose |
|---|---|---|
| `tier1` / `tier1Foreground` | `oklch(0.46 0.07 132)` / cream | Olive — Sponsored Top / Category L0 |
| `tier2` / `tier2Foreground` | `oklch(0.62 0.13 55)` / cream | Burnt orange — Sponsored Mid / Category L1 (AA-Large exemption) |
| `tier3` / `tier3Foreground` | `oklch(0.43 0.09 55)` / cream | Chocolate brown — Regular / Category L2 |

### Dark (extrapolated — coffee/leather warm darks)

> Marked as design-system extrapolation; needs client review before shipping
> dark theme to production.

| Token | OKLCH | Approx hex | Purpose |
|---|---|---|---|
| `background` | `oklch(0.18 0.03 60)` | `#2A1A0E` | Dark coffee brown |
| `foreground` | `oklch(0.94 0.02 80)` | `#F3EBDD` | Brand cream — body text |
| `card` | `oklch(0.22 0.03 60)` | `#352214` | Slightly lighter card surface |
| `primary` | `oklch(0.46 0.07 132)` | `#4F653B` | Same olive as light (cream-on-olive still ~4.65:1) |
| `primaryForeground` | `oklch(0.94 0.02 80)` | `#F3EBDD` | Cream on olive |
| `secondary` / `muted` / `accent` | `oklch(0.28 0.03 60)` | `#3F2918` | Warm dark surfaces |
| `mutedForeground` | `oklch(0.70 0.04 80)` | `#B8936A` | Helper text on dark |
| `border` | `oklch(0.94 0.02 80 / 50%)` | cream/50% | Translucent cream hairlines |
| `ring` | `oklch(0.62 0.10 132)` | `#7A9A5C` | Brighter olive ring — visible on dark bg (light/dark diverge deliberately) |

### Typography, radius, motion

- **Fonts:** Lato (humanist sans, 400/600/700) for body + all UI;
  Cormorant Garamond (transitional serif, 600/700) for headings +
  wordmark; JetBrains Mono for code. Loaded via `next/font/google`
  in `apps/web/src/app/layout.tsx`.
- **Type scale:** 8 sizes from `xs` (0.75rem) to `4xl` (2.25rem).
  See `packages/config/src/design.ts` `type`.
- **Radius:** base `0.875rem` (14px). Sm/md/lg/xl derive via calc().
- **Motion:** four durations (instant, fast, normal, slow) and three
  easings (out, in, inOut).

---

## How to rebrand for a fork

The 10-minute rebrand:

1. **Brand strings** — edit `packages/config/src/brand.ts`.
   Five fields: `name`, `tagline`, `taglineHighlight`, `supportEmail`,
   `legalEntity`, `url`.
2. **Tokens** — edit `packages/config/src/design.ts`. The two `colors`
   sets (`light`, `dark`) are the only thing most rebrands touch.
3. **Mirror to CSS** — copy the same OKLCH values into the matching
   variables in `apps/web/src/app/globals.css`.
4. **Mobile sync** — `pnpm gen:mobile-tw`.
5. **Assets** — swap `apps/web/public/favicon.ico` and `apps/web/public/
   og-default.png` (or rely on the `@vercel/og` route).

Then `pnpm dev` — every screen re-themes. The brand-string ESLint rule
will flag any place the old name was hardcoded.

---

## How to flip default to dark mode (Phase 2 recipe)

The dark tokens are wired and validated — only the toggle isn't shipped
yet. To flip the default:

1. **Default the html class** — in `apps/web/src/app/layout.tsx`, add
   `className="dark"` to the root `<html>` element. Or, better, expose a
   user toggle via `next-themes` (already installed) by wrapping the
   tree in `<ThemeProvider defaultTheme="dark" enableSystem>`.
2. **Mobile** — `apps/mobile` already follows `userInterfaceStyle:
   "automatic"` in `app.config.ts`. Tokens come from
   `packages/config/src/design.ts`, so dark surfaces apply via
   NativeWind's dark-mode variant. Verify on simulator.
3. **Auth screens** — light-only assumptions live in
   `apps/web/src/app/(auth)/layout.tsx`. The wordmark contrast already
   inverts cleanly because everything reads from tokens.
4. **Marketing landing CTA band** — the dark CTA block uses
   `bg-foreground text-background`, so it auto-inverts when surface
   flips. Verify visually after the toggle ships.

---

## Do / don't

**Do:**

- Read tokens from `@aira/config` (TS) or CSS variables (`bg-primary`,
  `text-foreground`, etc.) — never hardcode hex.
- Reference brand strings via `brand.name`, `brand.tagline`, etc. —
  never hardcode `"AIRA"`.
- Re-run `pnpm gen:mobile-tw` after touching `packages/config/src/
  design.ts`. The pre-commit hook `check-mobile-tailwind` catches you
  if you forget.
- Re-run `pnpm check-contrast` if you change any color token. Pre-commit
  enforces WCAG AA.

**Don't:**

- Hand-edit `apps/mobile/tailwind.config.js`. It's regenerated from
  `packages/config`.
- Add hardcoded hex anywhere in `apps/web/src/components/` or
  `apps/web/src/app/`. Use the semantic Tailwind classes that read
  from the token layer.
- Add new colors as one-offs. If a feature needs a new color, propose a
  new semantic token in `design.ts` first (e.g. `info`, `pending`).
- Flip primary contrast pairs without re-running `check-contrast`.
  The AIRA olive green is calibrated so cream-on-primary passes AA
  body (~4.65:1). Lightening primary risks losing that margin. Always
  re-run `pnpm check-contrast` after any token edit.
- Use `text-primary` on a dark background without checking contrast —
  the olive green at L=0.46 is too close in luminance to the dark
  coffee background; use `text-primaryForeground` or a lighter
  variant on dark surfaces instead.

---

## Visual reference

- **Live style guide:** `/design` route (auth-gated). The page reads
  exclusively from `@aira/config` so it visually drifts the moment a
  token changes.
- **WCAG AA verification:** `pnpm check-contrast` runs in pre-commit.
