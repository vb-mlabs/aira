# v3 — Hybrid summary + expand

## What makes this variant distinct

Each row is a **collapsible `<details>`** — a one-line summary by default (5 columns: status pill / plan + meta / period / amount / caret), expand-on-click to reveal full details (evidence, notes, recorded-by, actions). The current/active row defaults to **open** on page load; everything else is collapsed. A filter bar above the rows lets the admin scope to "Active / Expired / Scheduled" without re-querying.

## Pros

- **Best at progressive disclosure.** The scan view is even tighter than v2 (no Evidence/Recorded columns competing for width); when you need detail, you get the v1 layout in-place.
- **Filter bar** answers "what's currently active?" in one click — no scrolling through history.
- Critical row stays open by default, so admins land on the most relevant subscription's full detail without interaction.
- Native `<details>` — no JavaScript, no controlled-state component to maintain. Keyboard-accessible (Enter toggles) by default.
- "No evidence" warning still surfaces inline in the **summary** row (red strong text) so it never hides behind a collapsed row.

## Cons

- **One extra click** to see notes/evidence on a non-default row. Power users editing 4-5 subscriptions in a row will click 4-5 times to expand.
- Summary row width budgets (110/1fr/170/110/28px) make the period column fairly narrow on mobile — period meta has to truncate.
- Filter bar is a small extra surface to design and test. Not free.
- Two visual systems competing in one section (summary row + expand area). v1's stacked-card or v2's pure table is more consistent.

## Best for

A business with **a lot of historical rows** but only 1-2 currently relevant. Long-running customers where 80% of the data is "old, leave it alone" and the admin needs to quickly find the 20% that matters today.
