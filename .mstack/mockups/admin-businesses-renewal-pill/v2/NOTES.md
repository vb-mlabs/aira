# v2 — Stacked caption + overdue left-border

**Pattern.** Existing payment badge stays on top. A small caption stacks
underneath in the same cell with the urgency text in matching color:

- `renews in 25 days` → muted
- `renews in 8 days` / `due in 5 days` → warning
- `renews in 2 days` → destructive
- `OVERDUE 3 DAYS` → destructive bold, uppercase, letter-spaced

**Row-level treatment.** Overdue rows get a **3px destructive left
border** (drawn via inset box-shadow so it doesn't shift cell padding) +
~4% destructive background tint. Visible from anywhere on the page.

**Why this might be right.** Best of both worlds: the Subscription
column stays compact (one stacked cell, no horizontal growth), and
overdue rows pop visually from across the screen — you don't have to be
hovering the Subscription column to spot them. Mimics the "indent stripe"
pattern used in Linear and Gmail for status escalation.

**Why it might not.** Row height grows by ~8px because of the stacked
caption. Tightly packed grids feel less compact. The row-level border
is a stronger visual commitment — if the team values calm uniform rows,
this will feel "shouty."
