# v3 — Visual style: editorial magazine

## What makes v3 distinct
Same tri-column structure as v1, but styled like an editorial magazine
spread rather than a product marketing page. Cormorant Garamond does the
heavy lifting; brass-gold hairlines separate the columns; each column
opens with a small-caps eyebrow + italic Roman numeral; the user column's
lead paragraph gets a drop-cap; the phone sits inside a framed "plate"
with a hand-set caption underneath.

Feels like a page torn from an Indian community magazine — which lands
squarely on AIRA's aesthetic anchor ("warm earthy editorial — traditional
Indian paper texture meets modern community marketplace").

## Key moves
- **Masthead treatment** at the top: "Vol. I · Atlanta & growing ·
  Est. 2026" flanked by brass-gold hairlines, huge italic-swash
  headline underneath.
- **Vertical brass-gold hairlines** between the three columns (via
  `.spread::before/::after`).
- **Roman-numeral column tags** ("I. For the Community",
  "II. For the Merchants") — small typographic pretension that reads
  as intentional rather than corporate.
- **Framed phone plate** with a card border + top/bottom hairlines +
  italic "Plate I." caption below — treats the phone as an illustration
  in a periodical.
- **Dashed hairline separators** inside the bullet + benefit lists in
  place of card containers.
- **Coarser paper-grain texture** (baseFrequency 0.6 vs 0.85, higher
  alpha) — pushes the print-feel further.
- **Italic serif "signoff"** on the Owners column: "— curated with care,
  by Nisarga." — deliberate typographic pun on the brand line.

## Trade-offs
- Highest brand expression, highest risk of reading as ornament-forward
  on a business-owner acquisition page. The older-demographic PRD
  persona will love it; a small-business owner in a hurry might not.
- Drop-caps and italic swashes are lovely but reduce scan speed. Only
  works if the client's north star for the landing is *feel*, not
  conversion velocity.
- More Google Font weights (italic 500/600) — a small perf cost.

## Best for
Doubling down on AIRA's editorial anchor and using the landing to *set
tone*, on the theory that the actual conversion happens on downstream
CTAs, not the hero.
