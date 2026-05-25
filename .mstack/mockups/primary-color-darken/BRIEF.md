# Mockup brief: Primary color darken — before/after comparison

**Date:** 2026-05-24
**Linked review:** [2026-05-24-primary-color-darken](../../reviews/2026-05-24-primary-color-darken.md)
**Linked plan:** [2026-05-24-primary-color-darken](../../plans/2026-05-24-primary-color-darken.md)

## Goal

Visualize the proposed `primary` color change side-by-side with the current
value, across all five surfaces where the change visibly lands, so the user
can confirm the new shade reads as on-brand before `/mlabs-code` implements
the token shift.

## Variants

- **v1 — Current** — `primary: oklch(0.69 0.18 39)` (~#FF6B2C, bright
  orange) + `primaryForeground: oklch(0.205 0 0)` (~#1F1F1F, dark text).
  This is what ships today. Dark text on bright orange.
- **v2 — Proposed** — `primary: oklch(0.55 0.20 32)` (~#A8421A, terracotta
  deep orange) + `primaryForeground: oklch(0.985 0 0)` (~#FAFAFA, near-
  white). What the review approved. White text on deeper orange. Both
  white-on-primary AND primary-on-background pass WCAG AA at ~6:1.

Variant axis: **visual style** (color shift only — same layout, same copy,
same components).

## Surfaces shown

Each variant page renders five surfaces in vertical sequence so the same
viewport shows the full range of where primary appears:

1. **Web hero** — eyebrow pill ("Internal · the MLabs way to build MVP
   features"), tagline `H1` with the highlighted "paper trail" substring
   in `text-primary`, primary CTA button ("Why mstack"), check icons in
   the value-prop row.
2. **Web feature grid (card)** — eyebrow ("What's in the box"), the
   `bg-primary/10 text-primary` icon tile, hover border accent.
3. **Marketing eyebrow + brand dot** — section-eyebrow uppercase tracked
   label + the small `bg-primary` dot used in the nav and footer.
4. **Mobile welcome screen** — recreated phone frame at 375px with the
   wordmark, brand tagline, "Create account" primary CTA, "Sign in"
   secondary outline (the screen added in the previous commit).
5. **Email CTA button** — React Email-style table-based button as it
   renders in clients, using `brand.emailColors.primary` /
   `primaryForeground`.

## Real copy sourced from

- `brand.name` = "MLabs Template"
- `brand.tagline` = "AI engineering with guardrails, conventions, and a
  paper trail"
- `brand.taglineHighlight` = "paper trail"
- Hero pill copy from `apps/web/src/components/marketing/hero.tsx:22`
- Feature grid eyebrow + body from
  `apps/web/src/components/marketing/feature-grid.tsx:54-65`
- Welcome screen copy matches `apps/mobile/app/(auth)/welcome.tsx`
- Email CTA copy: a generic "Verify your email" matching React Email
  template patterns

## How to use

1. Open `COMPARE.html` in a browser — both variants render side-by-side
   in iframes for direct visual comparison.
2. Scroll through both columns; the surfaces are vertically aligned.
3. Decision: v2 stays approved, OR back to plan to re-tune.
