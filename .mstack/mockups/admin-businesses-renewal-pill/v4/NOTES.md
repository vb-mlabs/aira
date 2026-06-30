# v4 — Pill + jump-to-call action

**Pattern.** Same inline urgency pill as v1, plus a small circular phone
icon that appears only on **critical (≤3d) and overdue rows**. The icon
links to `/admin/renewals?withinDays=7` — i.e., it acknowledges the
renewals queue is the right place for the actual phone-banking, and
provides a one-click jump there.

**Row-level treatment.** Overdue rows get a faint ~5% destructive
background tint across the entire row. Lighter than v2's left border —
more of a "this row is hot" vibe than a hard escalation rule.

**Why this might be right.** Cleanest action affordance. Surfaces both
the urgency *and* the suggested next step without forcing the admin to
context-switch to the renewals queue. Respects the boundary between the
two pages: the directory shows you what's urgent + lets you jump; the
queue lets you actually log the call outcome.

**Why it might not.** The phone icon is operationally a lie — it doesn't
*call* anyone, it navigates. An admin who reads it as "click to dial"
will be surprised the first time. We'd need to make the deep-link
land on the specific row, not just the queue page (extra plumbing).
Tinting the whole row is also a stronger visual claim than v2's left
border — it competes with the alternating-row-stripe pattern many tables
have for legibility.
