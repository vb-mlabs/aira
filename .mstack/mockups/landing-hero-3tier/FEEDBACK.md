# Feedback — landing 3-tier hero

**Date:** 2026-09-22
**Winner:** **v1 · Hierarchy — balanced tri-column**
**Iterate further as a mockup?** No — moving to `/mlabs-plan`.

## What worked
- v1 is closest to the client reference image
  (`attached_assets/image_1790075464581.png`). The balanced tri-column
  structure (For Users | Phone | For Business Owners) with the centered
  "Discover. Support. Grow." headline over the phone is the shape we're
  building.
- Header stays as-is (`MarketingNav` verbatim above the hero).

## Refine at code phase (not blocking on more mockups)
- **Colors** — user flagged the palette reads "a bit off" against the
  brief. Not a redesign — a token pass during implementation. Likely
  culprits to check when the plan lands:
  - `--brand-gold` eyebrow ("ROOTS & REACH") sits at ~2.5:1 on cream —
    known AA-Large exemption from `.mstack/design-system/DESIGN.md`, may
    need a darker gold specifically in the hero eyebrow, or drop the
    ornament in favor of `--muted-foreground`.
  - Ornamental leaves flanking the phone (olive + burnt-orange) may read
    louder than the reference — consider single-tone or removing.
  - Green vs cream weighting on the two CTA buttons (Owner column) —
    reference uses solid green primary + white outline; v1 uses
    green-gradient + brown-outline. Reconcile against the reference at
    code time.
- **Icons** — currently generic Feather-style SVGs picked in-file. Swap
  for the icon set the rest of `apps/web` uses (check `components/marketing/*`
  for the established set — likely lucide-react at code time). Applies to
  the two column-head circles (users / store) and the three benefit rows
  (shield, star, trending-up).

## Explicitly rejected / deferred
- **v2 · airy hero-stacked** — reads too "SaaS product page" for AIRA's
  editorial brand voice; also fragments the two audiences by scroll.
- **v3 · editorial magazine** — the strongest brand expression, but
  drop-caps + Roman numerals reduce scan speed for a landing where a
  business owner may bounce fast. Worth revisiting for a future
  About/Story page, not this hero.

## Next
Run **`/mlabs-plan`** to convert v1 into an implementation plan for
`apps/web/src/components/marketing/hero.tsx`. Reference this file and
`v1/index.html` in the plan brief so the plan can:
1. Replace the current `Hero` component with the v1 3-tier structure.
2. Do the color/icon reconciliation pass described above.
3. Preserve `MarketingNav` untouched.
4. Leave `AboutEditorial`, `PhoneShowcase`, `BusinessPanel` unchanged for
   now (out of scope for this iteration — a future run can revisit
   whether they're still needed once the new hero absorbs some of their
   content).
