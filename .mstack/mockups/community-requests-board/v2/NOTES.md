# v2 — Editorial cards (magazine spread)

**Pattern:** Large airy cards stacked vertically — one request per row, full
2-line excerpt, prominent display heading, gradient "I can help" button + "X
neighbours have offered to help" status text. Editorial centered hero up top
with gold-hairline ornament and Cormorant headline.

**When this wins:**
- Aligns most directly with the existing AIRA aesthetic (warm editorial, paper
  texture, Cormorant display, gold hairlines, brand-cream surfaces)
- Each request reads as something a neighbour cared enough to write — emotional
  pull is preserved
- Strong CTA per card; "I can help" is a satisfying gradient pill, not an
  afterthought

**Tradeoffs:**
- Lower density (~3 cards per screen on desktop, 2 on mobile)
- Heavier scroll cost at 50+ posts — pagination matters more
- Risks feeling slow at very low post volumes (3-4 posts) — the empty space
  reads like underuse

**Detail page:** the post becomes a single editorial article. Respondents sit
in their own card below, each in a soft inner-cream tile — feels like a
private conversation page, distinct visually from the public board.

**Note:** This is the closest match to the existing AIRA listings detail
pattern (business-detail.tsx uses the same card stack convention).
