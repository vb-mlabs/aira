# v2 — Compact table

## What makes this variant distinct

Each row is a **single table line** with columns: Plan / Period / Status / Evidence / Recorded / Amount / Actions. Notes show inline on the sponsorship table (where they're short) and live in the edit form for subscriptions (where they're prose). The "Add" form pulls down below the table — same shape as v1 but tightened to a 4-column grid and dropzone collapsed to a single-line dropzone.

## Pros

- **Fastest scan.** Status column lines up vertically so the eye finds "Overdue" or "No evidence" instantly.
- **Sortable** by any column (not implemented here, but the table shape implies it).
- The "+ Add subscription" button moves to the section header — same place admins look for "New" on every other admin list page.
- Total height for the same data is ~40% shorter than v1; a busy business with 6 historical rows stays scannable.

## Cons

- **Notes get truncated** on the subscriptions table. Sponsorships are OK (short copy); subscriptions sometimes need 1-2 sentences which won't fit a row.
- Payment evidence filename truncates at ~110px — admins can't see the full filename at a glance.
- "Recorded by" column eats horizontal space and gets hidden on mobile; on a phone the view drops some context.

## Best for

The common case: a business with **3-10 historical subs** and admins scanning for the one that's overdue or about to renew. Sponsorships fit this shape perfectly (3 columns of metadata is plenty).
