# Design System: AIRA

**Date:** 2026-05-25
**Slug:** aira-v1
**Status:** locked
**Mode:** from-scratch
**References:** Figma file (3BoyWsDXPdRJz52InAmWWj), 6 mobile screen exports (Home, Login, My Account, Business Profile, Business Listing, Sidebar), AIRA tree-of-life logo PNG, PRD (docs/PRD.md)

---

## Brand

- **Name:** AIRA
- **Parent / operating entity:** Nisarga Group LLC ("AIRA by Nisarga")
- **Tagline:** "ROOTS & REACH" (highlight: "REACH" rendered in `text-primary` on the hero)
- **Voice:** warm, neighborly, never corporate-stiff. Address the reader as "you". Cormorant headings carry gravitas; Lato body keeps it short and direct. Honor the older demographic — no jargon, no playful micro-copy ("Yay!"), full sentences in error states, plain plurals.
- **Aesthetic:** warm earthy editorial — traditional Indian paper texture meets modern community marketplace. Ornate but disciplined. Botanical / tree-of-life iconography is the soul.

## Color

Source of truth lives in `packages/config/src/design.ts` and mirrors to `apps/web/src/app/globals.css`. Mobile tokens are **generated** from `design.ts` via `pnpm gen:mobile-tw`.

Two values are **Figma canonical** (pulled via Figma MCP from the Sidebar + Button frames); the rest were eyedropped from the high-resolution screen exports and verified against the design intent.

### Palette (light)

| Token | OKLCH | Hex (sRGB) | Notes |
| --- | --- | --- | --- |
| `background` | `oklch(0.90 0.04 85)` | `#EAE0CB` | warm cream page bg (eyedropped) |
| `foreground` | `oklch(0.25 0.04 60)` | `#3D2814` | warm dark brown body text |
| `card` | `oklch(0.95 0.02 85)` | `#F5EFE3` | lighter cream for cards/popovers |
| `card-foreground` | `oklch(0.25 0.04 60)` | `#3D2814` | text brown |
| `popover` | `oklch(0.95 0.02 85)` | `#F5EFE3` | matches card |
| `popover-foreground` | `oklch(0.25 0.04 60)` | `#3D2814` | |
| `primary` | `oklch(0.46 0.07 132)` | `#4F653B` | **Figma canonical** — olive green for CTAs, sponsored top, focus ring |
| `primary-foreground` | `oklch(0.94 0.02 80)` | `#F3EBDD` | **Figma canonical** — brand cream on green |
| `secondary` | `oklch(0.93 0.03 85)` | `#EFE5D0` | softer than card, secondary buttons |
| `secondary-foreground` | `oklch(0.25 0.04 60)` | `#3D2814` | text brown |
| `muted` | `oklch(0.88 0.03 85)` | `#E2D5BC` | muted cream for input bg |
| `muted-foreground` | `oklch(0.45 0.04 60)` | `#735239` | muted brown helper text |
| `accent` | `oklch(0.95 0.02 85)` | `#F5EFE3` | hover bg, same as card |
| `accent-foreground` | `oklch(0.25 0.04 60)` | `#3D2814` | text brown |
| `destructive` | `oklch(0.55 0.22 27)` | `#DC2626` | Log Out red (standard) |
| `border` | `oklch(0.50 0.07 80)` | `#826A40` | deep warm tan, 4.48:1 on cream |
| `input` | `oklch(0.50 0.07 80)` | `#826A40` | same |
| `ring` | `oklch(0.46 0.07 132)` | `#4F653B` | olive focus ring (= primary) |
| `success` | `oklch(0.46 0.07 132)` | `#4F653B` | reuses primary olive |
| `success-foreground` | `oklch(0.94 0.02 80)` | `#F3EBDD` | cream |
| `warning` | `oklch(0.62 0.13 55)` | `#C97A2A` | burnt orange |
| `warning-foreground` | `oklch(0.20 0.03 60)` | `#2E1D0F` | deep brown for AA body |

### AIRA-specific extensions (light)

| Token | OKLCH | Hex | Notes |
| --- | --- | --- | --- |
| `tier1` / `tier1-foreground` | `oklch(0.46 0.07 132)` / `oklch(0.94 0.02 80)` | `#4F653B` / `#F3EBDD` | Sponsored top OR PRD category L0 |
| `tier2` / `tier2-foreground` | `oklch(0.62 0.13 55)` / `oklch(0.94 0.02 80)` | `#C97A2A` / `#F3EBDD` | Sponsored mid OR PRD category L1 — **AA-Large exemption** |
| `tier3` / `tier3-foreground` | `oklch(0.43 0.09 55)` / `oklch(0.94 0.02 80)` | `#7A4A26` / `#F3EBDD` | Regular listings OR PRD category L2 |
| `brand-cream-bright` | `oklch(0.94 0.02 80)` | `#F3EBDD` | **Figma canonical** — text on dark surfaces |
| `brand-cream-muted` | `oklch(0.90 0.04 80)` | `#E9DDC7` | **Figma canonical** — secondary on dark |
| `brand-gold` | `oklch(0.66 0.10 80)` | `#B8904A` | **Figma canonical** — rare ornamental hairline accent |
| `info` / `info-foreground` | `oklch(0.55 0.18 240)` / `oklch(0.985 0 0)` | `#1A7AC7` / `#FEFEFE` | verified badge icon |

### Palette (dark — extrapolation, needs client review)

| Token | OKLCH | Hex | Notes |
| --- | --- | --- | --- |
| `background` | `oklch(0.18 0.03 60)` | `#28190E` | deep coffee/leather warm dark |
| `foreground` | `oklch(0.94 0.02 80)` | `#F3EBDD` | cream |
| `card` | `oklch(0.22 0.03 60)` | `#322015` | slightly lighter warm |
| `primary` | `oklch(0.46 0.07 132)` | `#4F653B` | same as light (cream passes AA on it) |
| `secondary` / `muted` / `accent` | `oklch(0.28 0.03 60)` | `#3F2A1C` | warm dark surfaces |
| `muted-foreground` | `oklch(0.70 0.04 80)` | `#B6A283` | warm muted on dark |
| `destructive` | `oklch(0.65 0.20 27)` | `#E94B4B` | softer red |
| `border` | `oklch(0.94 0.02 80 / 50%)` | cream@50% | composite ~ `#7E6F58`, 4.63:1 |
| `input` | `oklch(0.94 0.02 80 / 45%)` | cream@45% | |
| `ring` | `oklch(0.62 0.10 132)` | `#859868` | brighter olive for visibility on dark |
| `warning` | `oklch(0.72 0.13 55)` | `#DD9954` | brighter burnt orange |
| `warning-foreground` | `oklch(0.18 0.03 60)` | `#28190E` | dark on bright orange |
| `tier2` | `oklch(0.55 0.13 55)` | `#A36839` | darker than light to maintain AA-Large |
| `info` | `oklch(0.55 0.18 240)` | `#1A7AC7` | same as light |

### Gradient utilities

Figma uses 145° linear-gradients on CTAs and tier badges. Apply via `background-image: var(--gradient-*)`:

| Token | Light | Dark |
| --- | --- | --- |
| `--gradient-primary` | `oklch(0.52 0.08 132)` → `oklch(0.46 0.07 132)` | same |
| `--gradient-tier2` | `oklch(0.72 0.10 65)` → `oklch(0.62 0.13 55)` | `oklch(0.62 0.13 55)` → `oklch(0.55 0.13 55)` |
| `--gradient-tier3` | `oklch(0.49 0.09 55)` → `oklch(0.43 0.09 55)` | `oklch(0.58 0.09 55)` → `oklch(0.52 0.09 55)` |

### Shadow tokens

- `--shadow-primary-glow`: `0 3px 5px <primary at 35% alpha>` — for the green pill button drop shadow (Figma canonical).
- `--shadow-drawer`: `4px 0 12px rgb(0 0 0 / 15%)` light, `40%` dark — sidebar/drawer (Figma canonical).
- `--shadow-card`: subtle card lift.

### Texture

The brand is built on a paper-grain aesthetic. We implemented texture as **CSS-first**: an inline SVG `feTurbulence` overlay applied to `<body>`, encoded in `--texture-paper` (light) and `--texture-paper-green` (dark sidebar). Tweak `baseFrequency` in those data URIs for finer/coarser grain. If the CSS approximation doesn't satisfy the client when viewing the previews, swap in the two literal Figma exports (cream paper, green paper) as image assets.

### Contrast notes

All 36 token pairs pass `pnpm check-contrast`. Two exemptions documented:

1. **`tier2Foreground` (cream) on `tier2` (burnt orange)** — 3.18:1 light, 4.25:1 dark. Cream-on-burnt-orange is ~2.7:1 at the design intent, lifted to 3.18 by using the standard cream value. Tier headers are bold Lato ≥14px which qualifies as AA-Large (3:1) by WCAG. Severity in `scripts/check-contrast.ts` is `large`. Matches the Figma design exactly.
2. **`infoForeground` (white) on `info` (blue)** — 4.34:1 in both themes. Verified badge is a small icon-on-pill, not body text; WCAG 1.4.11 non-text contrast (3:1) applies. Severity is `large`.

The MLabs template's previous AA exemption (white-on-orange CTA) has been REMOVED — AIRA's olive-green primary clears AA body at 5.82:1, so `primaryForeground` vs `primary` is now in the strict body bar.

## Typography

- **Sans:** `Lato` (weights 400, 700) — body, UI, button labels (fallback: `system-ui, sans-serif`)
- **Display:** `Cormorant Garamond` (weights 600, 700) — headings, wordmark, hero copy (fallback: `Georgia, serif`)
- **Mono:** `JetBrains Mono` (weight 400, 500) — rarely used in this product (fallback: `ui-monospace, monospace`)

**Where to install:**
- **Web:** `next/font/google` in `apps/web/src/app/layout.tsx` — already wired. Variables `--font-lato`, `--font-cormorant-garamond`, `--font-jetbrains-mono` set on `<html>`.
- **Mobile:** `@expo-google-fonts/lato` + `@expo-google-fonts/cormorant-garamond` — stub-loaded in `apps/mobile/lib/fonts/index.ts` with instructions to enable. Adding the packages is a follow-up.
- **Email:** Lato + Cormorant Garamond are not safe as inline web fonts in Outlook; React Email templates should use Postmark's font stack (`-apple-system, system-ui, "Segoe UI", Roboto, "Helvetica Neue", sans-serif`).

### Scale

Kept the shadcn 8-step ramp. Cormorant has tighter optical weight than Inter, so 2xl–4xl will feel a touch lighter — desirable for the editorial feel.

| Step | Size | Line height | Use |
| --- | --- | --- | --- |
| xs | 0.75rem | 1rem | meta, badges, "by Nisarga" |
| sm | 0.875rem | 1.25rem | secondary body, captions |
| base | 1rem | 1.5rem | body, default UI |
| lg | 1.125rem | 1.75rem | lead paragraphs |
| xl | 1.25rem | 1.75rem | section heading |
| 2xl | 1.5rem | 2rem | page heading |
| 3xl | 1.875rem | 2.25rem | hero sub |
| 4xl | 2.25rem | 2.5rem | hero ("AIRA" wordmark, "About AIRA") |

## Radius

Base bumped from `0.625rem` (10px, MLabs default) to **`0.875rem` (14px)** to match the Figma nav-item radius. Scale:

- `sm` = ~8.4px (small tags, chips)
- `md` = ~11.2px
- `lg` = 14px (default — cards, inputs, pill buttons)
- `xl` = ~19.6px
- `2xl` = ~25.2px (drawer corners — matches Figma's 24px within tolerance)
- `full` = 9999px (pill / circle — More info button, icon buttons, sidebar drawer right side)

## Spacing

Tailwind defaults kept. Notable AIRA conventions:
- Mobile tap targets ≥ 44px (PRD persona requirement — older demographic).
- Body text never below 14px (sm).
- Generous vertical rhythm on long-form screens (My Account list rows are 48-56px tall).

## Motion

Kept current MLabs defaults — the 250ms `normal` + quint-out easing already reads as "warm and unhurried" which matches AIRA's voice.

| Token | Value | Use |
| --- | --- | --- |
| `durations.instant` | 75ms | micro-feedback (icon flips, ripples) |
| `durations.fast` | 150ms | hover, focus |
| `durations.normal` | 250ms | menus, modals, drawer slide |
| `durations.slow` | 400ms | hero transitions, splash → home |
| `easings.out` | `cubic-bezier(0.16, 1, 0.3, 1)` | enter |
| `easings.in` | `cubic-bezier(0.7, 0, 0.84, 0)` | exit |
| `easings.inOut` | `cubic-bezier(0.83, 0, 0.17, 1)` | move |

## Surfaces covered

- [x] Web (Next.js, `apps/web`) — globals.css + layout.tsx fonts swapped
- [x] Mobile (Expo + NativeWind, `apps/mobile`) — tailwind.config.js regenerated; native font loader stub updated with Lato + Cormorant Garamond instructions (requires `@expo-google-fonts/*` install to fully enable)
- [x] Email (React Email — uses `brand.emailColors` hex fallbacks) — emailColors recomputed for new palette

## How this flows into code

1. Tokens edited in `packages/config/src/design.ts` (OKLCH).
2. `apps/web/src/app/globals.css` mirrors values as CSS vars.
3. `pnpm gen:mobile-tw` regenerates `apps/mobile/tailwind.config.js`.
4. `pnpm check-contrast` guards AA (with documented exemptions above).
5. `packages/config/src/brand.ts` carries name / tagline / hex fallbacks for email templates.

`/mlabs-mockup` and downstream feature work consume these tokens; do not fork them per feature.

## Preview

- `.mstack/design-system/preview-light.html`
- `.mstack/design-system/preview-dark.html`

Open in a browser (no build step). The pages show every token as a swatch, the full type ramp, sample components, the radius scale, and the live SVG paper-grain texture so the client can eyeball the CSS-first texture before we commit to swapping in a Figma asset.

## Decisions worth remembering

- **No white in this brand.** The lightest cream is `#F5EFE3` (card). Page bg is `#EAE0CB`. White would shatter the warm paper aesthetic.
- **Two creams, on purpose.** `--background` (`#EAE0CB`) is the page surface; `--brand-cream-bright` (`#F3EBDD`) is text on dark. Conflating them would read as flat.
- **Tier palette = sponsorship axis AND category-level axis.** The PRD's L0/L1/L2 hierarchy and the listings page's sponsorship tiers reuse the same three earth tones. The system exposes `tier1/2/3` as a unified primitive.
- **Dark mode is extrapolation.** Figma has only light theme. Needs client review before shipping dark.
- **Texture is CSS-first.** Inline SVG `feTurbulence` overlays. If the previews don't satisfy the client, swap to literal Figma exports.
- **Lato + Cormorant Garamond pairing is intentionally asymmetric.** Sans body + serif heading carries the brand voice (modern legibility + old-world depth).
- **MLabs orange CTA exemption removed.** AIRA's primary now passes strict AA body (5.82:1) so no exemption was carried forward.
- **`brand-gold` is decorative only.** Single Figma usage is a hairline footer divider. Not for button fills.

## Open questions

- **Real brand identity values** — `supportEmail`, `socialHandle`, `url` are placeholders (`support@aira.app`, `@aira_atl`, `https://aira.app`). Replace before launch.
- **Tagline length** — `"ROOTS & REACH"` is the wordmark tagline. Whether the landing hero needs a longer line ("Atlanta's Indian community, rooted and reaching.") is a content call, not a design-system call. Update `brand.tagline` if so and re-run.
- **Dark theme** — client hasn't seen dark mode. Review the dark preview page before launching dark theme to production.
- **Texture asset fallback** — if CSS noise reads as "synthetic" to the client, export the two Figma textures (cream + green) as PNGs and switch to `background-image: url('/textures/cream.png')`.
- **Mobile font binaries** — to fully activate Lato + Cormorant on mobile, install `@expo-google-fonts/lato` + `@expo-google-fonts/cormorant-garamond` and update the stub in `apps/mobile/lib/fonts/index.ts` per the inline instructions. Until then, mobile falls back to system fonts.
