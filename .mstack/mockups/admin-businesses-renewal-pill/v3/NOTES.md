# v3 — Single combined badge

**Pattern.** Replaces the existing `paid` / `pending` / `overdue` badge
with **one** combined pill that fuses both status and urgency:

- `● Paid · in 25d` — muted olive (no urgency)
- `● Paid · in 8d` — warning (burnt orange)
- `● Paid · in 2d` — destructive (red, semibold)
- `● OVERDUE 3d` — destructive bold (drops "Paid", overdue *is* the status)
- `● Pending · due 5d` — warning
- `—` — no subscription

The leading dot + color carries the urgency signal; the text carries
the raw status.

**Row-level treatment.** None.

**Why this might be right.** Cleanest visual outcome: every row has
exactly one chip in the Subscription column, regardless of urgency.
Encodes the most information per pixel. Reads like a Linear / GitHub
issue status line.

**Why it might not.** Throws away the standalone `paid|pending|overdue`
badge that other surfaces use (CSV export, the renewals queue, audit
log, possibly future filters). If any downstream consumer reads the
badge by color alone — or if you want to ever filter by raw payment
status from this table — you've lost that affordance. Highest
implementation risk: changes the visual contract of `AdminBadge` for
this one table.
