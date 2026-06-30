# v1 — Inline soft-escalation pill

**Pattern.** Existing `paid` / `pending` / `overdue` badge stays untouched.
A second pill is appended to its right inside the same Subscription cell.
The pill's color escalates by bucket:

- `in 25d` → **muted** (no urgency)
- `in 8d` / `in 5d` → **warning** (burnt orange tint)
- `in 2d` → **destructive** (red tint, semibold)
- `OVERDUE 3d` / `OVERDUE 12d` → **destructive bold** (heavy weight, red tint)

**Row-level treatment.** None — every row keeps the default cream surface.

**Why this might be right.** Calmest, most conservative. The existing
status badge keeps its semantic meaning (paid/pending/overdue) intact,
and the urgency pill adds context without rewriting anything. Cell width
grows modestly (one extra pill, ~80px max). Best if you care about
preserving the current visual language and don't want overdue rows to
"shout" at you while scrolling.

**Why it might not.** Two pills per row in the busiest column means
you're scanning four chips per row total (Tier, paid, urgency, Active).
Density jumps. And overdue rows don't pop visually unless you're already
looking at the Subscription column.
