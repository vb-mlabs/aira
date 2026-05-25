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

**Name.** "MLabs Template" by default. Editable in
`packages/config/src/brand.ts` — the ESLint rule
`no-brand-string-literal` enforces that the literal `brand.name` value
appears nowhere outside `config/`, `templates/`, `legal/`,
`translations/`, `docs/`, `tests/`, and `e2e/`.

**Mood.** Modern, confident, AI-product. Light surface, bold display
type, single accent in MLabs orange. Not playful; not editorial.

---

## Tokens

### Light (default)

| Token | OKLCH | Approx hex | Purpose |
|---|---|---|---|
| `background` | `oklch(1 0 0)` | `#FFFFFF` | Page background |
| `foreground` | `oklch(0.145 0 0)` | `#252525` | Body text |
| `card` | `oklch(1 0 0)` | `#FFFFFF` | Card surface |
| `cardForeground` | `oklch(0.145 0 0)` | `#252525` | Text on card |
| `primary` | `oklch(0.69 0.18 39)` | `#FF6B2C` (MLabs orange) | Brand accent, CTAs, links |
| `primaryForeground` | `oklch(0.205 0 0)` | `#1A1A1A` | Text on orange (dark for WCAG AA) |
| `secondary` | `oklch(0.97 0 0)` | `#F7F7F7` | Soft surface, secondary buttons |
| `muted` | `oklch(0.97 0.003 80)` | `#F7F7F5` | Subtle backgrounds with warm tint |
| `mutedForeground` | `oklch(0.48 0 0)` | `#737373` | Helper text |
| `accent` | `oklch(0.97 0 0)` | `#F7F7F7` | Hover surfaces |
| `destructive` | `oklch(0.577 0.245 27.325)` | `#DC2626` | Errors, danger |
| `border` | `oklch(0.62 0.005 80)` | `#9D9C97` | Form/card borders (3.6:1 vs bg) |
| `input` | `oklch(0.62 0.005 80)` | `#9D9C97` | Input outlines |
| `ring` | `oklch(0.62 0.19 39)` | `#D55A23` (deep coral) | Focus indicator |
| `success` | `oklch(0.48 0.16 145)` | `#1F7A3D` | Success states |
| `warning` | `oklch(0.78 0.16 80)` | `#D9A23F` | Warning states |

### Dark (Phase 2 — preserved but not exposed yet)

| Token | OKLCH | Approx hex | Purpose |
|---|---|---|---|
| `background` | `oklch(0.18 0.02 260)` | `#0A0F1C` (MLabs navy) | Page background |
| `foreground` | `oklch(0.985 0 0)` | `#FAFAFA` | Body text |
| `card` | `oklch(0.22 0.03 260)` | `#131A2E` | Card surface |
| `primary` | `oklch(0.69 0.18 39)` | `#FF6B2C` | Same brand orange |
| `primaryForeground` | `oklch(0.205 0 0)` | `#1A1A1A` | Dark ink on orange |
| `secondary` / `muted` / `accent` | `oklch(0.27 0.02 260)` | `#1E2538` | Navy-tinted surfaces |
| `mutedForeground` | `oklch(0.708 0 0)` | `#B0B0B0` | Helper text |
| `border` | `oklch(1 0 0 / 35%)` | translucent white | Form/card borders |
| `ring` | `oklch(0.69 0.18 39)` | `#FF6B2C` | Focus indicator |

### Typography, radius, motion

- **Fonts:** Inter Variable (sans, display), JetBrains Mono (mono).
  Loaded via `next/font/google` in `apps/web/src/app/layout.tsx`.
- **Type scale:** 8 sizes from `xs` (0.75rem) to `4xl` (2.25rem).
  See `packages/config/src/design.ts` `type`.
- **Radius:** base `0.625rem`. Sm/md/lg/xl derive via calc().
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

- Read tokens from `@mlabs/config` (TS) or CSS variables (`bg-primary`,
  `text-foreground`, etc.) — never hardcode hex.
- Reference brand strings via `brand.name`, `brand.tagline`, etc. —
  never hardcode `"MLabs Template"`.
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
  White-on-orange fails AA (≈3.4:1); dark-on-orange passes (~6:1).

---

## Visual reference

- **Live style guide:** `/design` route (auth-gated). The page reads
  exclusively from `@mlabs/config` so it visually drifts the moment a
  token changes.
- **WCAG AA verification:** `pnpm check-contrast` runs in pre-commit.
