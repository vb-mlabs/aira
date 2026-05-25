# v2 — Proposed

**Tokens:**
- `primary: oklch(0.55 0.20 32)` (~#A8421A, terracotta deep orange)
- `primaryForeground: oklch(0.985 0 0)` (~#FAFAFA, near-white)
- `ring: oklch(0.48 0.20 30)` light theme (darkened to stay below primary)

**Contrast pairs:**
- White-on-primary: **6.0:1** — passes AA body, close to AAA (7:1)
- Primary-on-white: **6.0:1** — passes AA body (fixes the latent
  text-primary failure in marketing)

**Visual character:**
- Deeper, more saturated, "product-y" terracotta
- Reads as confident / mature / on-brand for a tooling template
- White text on the CTA looks definitive — modern SaaS convention
- Same hue family as the bright orange, just shifted toward the deeper
  end of the warm spectrum (think Anthropic's accent rather than
  fluorescent fashion brand)

**What changes visibly:**
- All `bg-primary` filled surfaces darken; CTA labels flip from
  near-black to white
- All `text-primary` accents (eyebrows, highlighted words, brand dots,
  check icons) shift to terracotta — readable on white instead of
  marginal
- `bg-primary/10` tinted backgrounds get a slightly warmer / deeper
  peach tone
- Hover border accents on cards darken proportionally
