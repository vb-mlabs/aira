# v1 — Stacked cards

## What makes this variant distinct

Each row is a full-width card with **every field visible at once**. No clicking to expand, no scanning across narrow columns. The plan name + amount sit at the top-left of each card; the status pill sits top-right; a 2-column grid below shows period / evidence / notes / recorded-by; a divider-and-footer line at the bottom shows time-remaining + Edit / Void actions.

## Pros

- Best at answering "what's the full story on this subscription?" without any interaction.
- Notes and evidence are immediately visible — no risk of missing the "No evidence on file" warning while scrolling.
- The card border + footer divider makes each row feel like a self-contained unit, which matches the rest of the flat-layout admin pattern (each section is already a card; rows are sub-cards within).

## Cons

- **Vertical sprawl.** With ~3 subscriptions plus an add-form, the section runs ~1100px tall. Sponsorships section duplicates the height. A business with 6 historical subs would push the page near 3000px.
- Scanning **which row is paid right now** requires reading each card top-right — not as fast as a status column.

## Best for

Businesses with **few historical rows** (1-3 each section). If renewals push backs up history fast, v2's table is faster to scan.
