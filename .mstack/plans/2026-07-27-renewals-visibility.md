# Plan: Renewals queue "row disappeared" clarification pass

**Date:** 2026-07-27
**Slug:** 2026-07-27-renewals-visibility
**Status:** reviewed
**Author:** vb-mlabs (with Claude)

---

## Problem

The `/admin/renewals` queue looks like it's dropping saves. Admins
work through a list under a window chip (7 / 14 / 30 days), open the
follow-up modal on a business, pick an outcome, save — and the row
vanishes from the view. Some outcomes preserve the row
(`voicemail`, `no_answer`); others hide it (`called`, `reschedule`,
`refused`, `paid`). The DB writes are all landing correctly (verified
against the mutation at
`packages/services/src/subscription-followups/mutations.ts`), but
the query at
`packages/services/src/subscription-followups/queries.ts:57-69`
deliberately filters out any row whose latest followup is terminal
(`paid` / `refused`) OR has `scheduled_next > now()`. The mutation
auto-sets `scheduled_next = now + 7 days` for `called` and
`now + scheduleDays` for `reschedule`, so those two outcomes vanish
immediately.

This behaviour is documented **in the code** (`queries.ts:46-53`
spells out the invariant) but **not in the UI**. An admin who
marks a business `Called` on the 7-day chip sees the row disappear
and reasonably concludes their save was lost. The row is fine —
it's queued to reappear on day 7 — but there is no way from the
current UI to verify that without opening the modal on a specific
subscription.

**Who benefits:** the AIRA renewals team, who lose trust in the tool
every time a row disappears; end users indirectly, because the
follow-up cadence stops slipping.

## Scope

**In (bundled fix — one PR):**

- **Functional:** a "Show all" toggle on the renewals page that
  extends `listQueue` with an `includeAll` flag. When on:
  - The `inActiveQueue` predicate is skipped — resolved and
    scheduled rows are returned.
  - Row ordering picks up a second sort key so overdue + due-soon
    rows stay at the top, then scheduled-future rows, then
    resolved terminal rows at the bottom.
  - The `RenewalQueueTable` gains a "Next attempt" column that
    surfaces `scheduled_next` (currently in the payload but
    unrendered). The existing "Last attempt" column already reads
    `last_outcome` + `last_followup_at`.
  - Resolved rows render dimmed with a small badge so the admin's
    eye stays on active work at the top; scheduled rows show the
    future date in the new "Next attempt" cell.
- **Copy:** outcome labels in `outcome-radio-group.tsx` get a
  consequence suffix in parens:
  - `Called (hides for 7 days)`
  - `Refused (removes from queue)`
  - `Marked paid (removes from queue)`
  - `Reschedule (hides for N days)`
  - `Voicemail` and `No answer` unchanged — they leave the row
    visible so nothing to warn about.
  Hint lines below each label keep their current explanatory copy.
- **Op + validator schema** gains `includeAll?: boolean` (defaults
  false at the op layer) so the /api/v1/* boundary stays typed
  end-to-end.
- **URL param** `?showAll=1` on `/admin/renewals` — plain RSC
  round-trip like `withinDays`, driven by a new toggle chip that
  sits next to the window chips.

**Out (deferred):**

- **DB enum renames.** The six outcome values (`called`,
  `voicemail`, `no_answer`, `refused`, `paid`, `reschedule`) stay
  untouched. Rename would ripple through audit-log meta,
  historical rows, and a Zod discriminated union — not this
  plan's shape.
- **Any change to `scheduled_next` computation.** `called`
  continues to auto-shift 7 days, `reschedule` continues to take
  operator input. The queue's *visibility* of those rows changes;
  the underlying business rule doesn't.
- **`renewal_status` column on `business_subscription`** (option 3
  from the earlier analysis) — persistent status enum + full
  Kanban pipeline. Bigger surface, deserves its own plan if the
  admin team wants it. Captured as an open question.
- **"Un-refuse" workflow.** Once refused, the only path back into
  the queue today is to add a new subscription from the business
  admin surface — same as `paid`. Not addressing here.
- **Bulk mark / bulk re-open.** No batch controls in this pass.

## Approach

**Two-file query change + three UI touchpoints. Bundled because
the fix is cheap and the two halves reinforce each other.**

### Query layer

`packages/services/src/subscription-followups/queries.ts:87` —
`listQueue`'s options gain `includeAll?: boolean`. Inside:

```
const activeOnly = !opts.includeAll
const where = and(
  inArray(businessSubscriptions.payment_status, ["paid", "overdue"]),
  sql`${businessSubscriptions.end_date} <= ${windowUpper}`,
  activeOnly ? inActiveQueue : undefined,
)
```

`and()` accepts undefined branches, so dropping the filter is a
clean toggle. The `SELECT` list already surfaces `last_outcome`,
`last_followup_at`, and `scheduled_next`, so no new column
selection.

Ordering picks up a new outer sort so `includeAll` mode
groups by resolution state before falling into the current
`overdue → end_date` sort:

```
.orderBy(
  // 0 = active-visible, 1 = scheduled-future, 2 = resolved terminal
  sql`CASE
    WHEN (SELECT outcome FROM subscription_followup ...
         ORDER BY created_at DESC LIMIT 1) IN ('paid','refused') THEN 2
    WHEN (SELECT scheduled_next FROM ... LIMIT 1) > now() THEN 1
    ELSE 0
  END`,
  sql`CASE WHEN ${businessSubscriptions.end_date} < now() THEN 0 ELSE 1 END`,
  businessSubscriptions.end_date,
)
```

In the default (`!includeAll`) path the two extra CASE
expressions still evaluate but only order 0 rows survive — the
result is identical to today. Cheap to keep the ordering unified
between the two modes.

The `QUEUE_PAGE_CAP = 100` is unchanged. `includeAll` mode
inherits the same cap + the existing "showing 100 of N" hint via
the op's total field — a big directory could push resolved
history over 100 fast, and the truncation warning stays honest.

### Op layer

`packages/validators/src/subscription-followups.ts:57` —
`FollowupQueueInputSchema` gains `includeAll: z.coerce.boolean().optional()`.

`apps/web/src/server/operations/subscription-followups.ts:18-27` —
`listFollowupQueueOp`'s handler pipes `includeAll` through to
`service.listQueue`, defaulting false.

Output shape unchanged — the queue rows are the same. The op's
returned `total` reflects the current mode's total so the
"showing 100 of N" hint stays accurate on either view.

### Page

`apps/web/src/app/admin/renewals/page.tsx` — read a second
searchParam, `showAll`, coerced identically to `withinDays`.
Pass it through to `apiServerFetch(listFollowupQueueOp, { input:
{ withinDays, showAll } })`. Subtitle math updates: when
`showAll` is on, add `${resolved} resolved · ${scheduled} scheduled`
counts alongside overdue + due-soon so the header still tells
the admin what they're looking at.

### Toggle chip

`apps/web/src/features/admin/renewals/window-chips.tsx` — extend
this file (or split into `renewals-filters.tsx` sibling; pick
during review). One new `<Link>` toggle chip:

- Active state carries `?withinDays=X&showAll=1`; inactive
  drops `showAll`.
- Label: "Include resolved & scheduled". `aria-pressed` for the
  toggle semantic.

### Queue table

`apps/web/src/features/admin/renewals/renewal-queue-table.tsx` —
three changes:

1. New "Next attempt" `<th>` between "Last attempt" and
   "Contact". Cell renders `scheduled_next` as an absolute date
   (matches the existing UTC-stable relativeTime pattern for
   hydration safety) when set, em-dash otherwise.
2. Row dim treatment: when `last_outcome` is `paid` or `refused`,
   or `scheduled_next > now()`, add `opacity-60` on the row +
   a small `<AdminBadge>` next to the outcome pill: `resolved`
   for paid/refused, `scheduled` for the future case. Uses the
   existing `AdminBadge` primitive.
3. `OUTCOME_LABEL` map already existed at line 36 — no changes
   there. The table displays the enum name; the "removes from
   queue" wording lives in the modal only (correct — the
   consequence hint belongs where the operator chooses the
   outcome, not where they read past outcomes).

### Outcome radio group copy

`apps/web/src/features/admin/renewals/outcome-radio-group.tsx` —
`OPTIONS` array label field changes only, following the pattern
locked with the user 2026-07-27:

- `Called` → `Called (hides for 7 days)`
- `Voicemail` → `Voicemail` (unchanged)
- `No answer` → `No answer` (unchanged)
- `Refused` → `Refused (removes from queue)`
- `Marked paid` → `Marked paid (removes from queue)`
- `Reschedule` → `Reschedule (hides for N days)`

Hints below each label kept as-is — they explain the choice; the
paren suffix explains the queue consequence. Two-layer read.

**Alternatives considered:**

- **Mixed in-line ordering** for `includeAll`. Simpler code —
  drop the where-clause and let `end_date` sort do the work.
  Rejected because a resolved row from three weeks ago sitting
  next to an active row from tomorrow reads as "why is this
  here" — the whole point of the toggle is diagnostic
  visibility, and diagnostics require the resolved-tail to be
  visually distinct.
- **Two separate tables (Active + Resolved)** on the page.
  Cleanest mental model but doubles the render surface,
  doubles the empty-state logic, and the 100-row cap becomes
  100-per-table. Save for a future "renewal pipeline" plan if
  it's needed.
- **Rewriting the hint line entirely (consequence-first).**
  Longer copy in the 6-option grid; the paren suffix on the
  label is a cheaper carrier for the same information. Locked
  with the user 2026-07-27.
- **Adding a `renewal_status` enum column** on
  `business_subscription`. Real architectural improvement —
  authoritative status the queue can filter on, no derived-view
  gymnastics — but a schema migration, an audit-meta rewrite,
  and a decision on how to backfill historical rows. Out of
  scope for this pass; captured as an open question for a
  potential future plan.

## Data model changes

**None.**

- No new column on `subscription_followup`.
- No new column on `business_subscription`.
- No new table.
- No enum change.
- The `sf_subscription_created_idx` index on
  `subscription-followups.ts:51-54` already covers the
  correlated subqueries in the ordering CASE expression.

## Files to touch

**New:** none. Every change lands in an existing file.

**Edit:**

- `packages/services/src/subscription-followups/queries.ts` —
  add `includeAll?: boolean` to `ListQueueOpts`, gate the
  `inActiveQueue` predicate, extend the `.orderBy(…)` with the
  three-tier CASE.
- `packages/validators/src/subscription-followups.ts` — add
  `includeAll: z.coerce.boolean().optional()` to
  `FollowupQueueInputSchema` (line 57).
- `apps/web/src/server/operations/subscription-followups.ts` —
  extract `includeAll` from input, pass to `service.listQueue`.
- `apps/web/src/app/admin/renewals/page.tsx` — read `showAll`
  searchParam, pipe through, extend subtitle math for the
  showAll mode's counts.
- `apps/web/src/features/admin/renewals/window-chips.tsx` —
  add a "Include resolved & scheduled" toggle chip; consider a
  file rename to `renewals-filters.tsx` during review if the
  file grows past ~80 lines.
- `apps/web/src/features/admin/renewals/renewal-queue-table.tsx`
  — new "Next attempt" column between "Last attempt" and
  "Contact", row dim + badge for resolved / scheduled rows.
- `apps/web/src/features/admin/renewals/outcome-radio-group.tsx`
  — swap four label strings in the `OPTIONS` array.

## Edge cases

- **`includeAll` is on and a subscription has no followups yet.**
  Same as today's active path — falls into the ordering bucket
  0 (active-visible). Renders with em-dashes in Last attempt +
  Next attempt cells. No dim, no badge.
- **`includeAll` off, admin marks a business `Called` on the
  7-day chip.** Row disappears as it does today. The new copy
  in the modal warned them (`Called (hides for 7 days)`) so the
  disappearance is expected, not confusing.
- **`includeAll` on, more than 100 resolved rows in the
  window.** `QUEUE_PAGE_CAP` truncates as it does today; the
  page's existing "showing 100 of N" hint updates. Trade-off
  accepted: a big backlog may need the window chip to narrow
  the range.
- **`scheduled_next` in the past** (row was resolved past then a
  new followup was recorded). The mutation always writes
  `scheduled_next` derived from `now()`, so this can only happen
  if the clock or the followup was manually edited. The ordering
  CASE lands it in bucket 2 (resolved terminal via the outcome
  check taking precedence) or bucket 0 (active-visible via the
  `> now()` false branch). Either is fine — the badge just shows
  based on the row's actual state.
- **Multiple followups on the same subscription within
  milliseconds** (rare, but the mutation isn't idempotent). The
  correlated subquery `ORDER BY created_at DESC LIMIT 1` picks a
  deterministic winner; whichever wins by created_at drives the
  UI. Same as today.
- **A user visits the URL with `?showAll=abc`** — `z.coerce.boolean()`
  parses non-empty strings as truthy, so `abc` → true. Acceptable
  for a searchParam; the page will render `showAll` mode. The
  toggle chip only ever emits `1`.
- **URL keeps `?showAll=1` when the user changes the window chip.**
  Desired behaviour — a diagnostic mode persists across the
  window filter. Each chip's href needs to preserve `showAll`
  when it's set. Small implementation detail; call it out in
  the task's What.
- **Concurrent op writes a new followup while the queue is being
  fetched.** The correlated subquery reads the latest committed
  followup at each row's SELECT time. Read-your-writes is
  guaranteed within the same request; cross-request behaviour is
  the standard PostgreSQL MVCC read snapshot. No new invariant
  broken.
- **The subtitle math** currently reports overdue + due-soon
  counts. In `showAll` mode we add `resolved` and `scheduled`
  counts. Zero-count sections drop cleanly (`${x > 0 ? … : ""}`
  pattern).

## Acceptance criteria

- [ ] `listQueue({ withinDays, includeAll: false })` returns the
      exact same rows as `listQueue({ withinDays })` — no
      behavioural drift on the default path.
- [ ] `listQueue({ withinDays, includeAll: true })` returns rows
      with `last_outcome` in `paid` / `refused` AND rows with
      `scheduled_next > now()`, plus everything the default view
      already returns. Ordering: active-visible first, then
      scheduled-future, then resolved terminal; secondary sort
      overdue-first + end_date within each bucket.
- [ ] `FollowupQueueInputSchema` accepts an optional
      `includeAll: boolean`; op defaults it to false when absent.
- [ ] `/admin/renewals` reads `?showAll=1` and passes through to
      the op; without the param it's identical to today.
- [ ] Toggle chip at the top of the page flips `?showAll=1` in the
      URL while preserving the current `?withinDays=`. Chip is
      `aria-pressed="true"` when active.
- [ ] Renewal queue table has a "Next attempt" column between
      "Last attempt" and "Contact". Cell shows the absolute date
      when `scheduled_next` is set, em-dash otherwise.
- [ ] Resolved rows (`paid` / `refused`) render with `opacity-60`
      + a small `<AdminBadge label="Resolved" />` next to the
      outcome. Scheduled-future rows render with the same dim + a
      `<AdminBadge label="Scheduled" />`.
- [ ] Outcome radio labels in the follow-up modal match the
      locked copy: `Called (hides for 7 days)`,
      `Refused (removes from queue)`,
      `Marked paid (removes from queue)`,
      `Reschedule (hides for N days)`; `Voicemail` and
      `No answer` unchanged.
- [ ] Subtitle math shows `resolved` and `scheduled` counts when
      `showAll` is on.
- [ ] `pnpm typecheck` / `pnpm lint` / `pnpm --filter @aira/services test`
      all clean.
- [ ] Manual smoke (per acceptance test in the review): mark a
      business `Reschedule` for 5 days, verify it disappears from
      the default view under the 7-day chip, toggle "Include
      resolved & scheduled", verify the row reappears with a
      `Scheduled` badge and its next-attempt date.

## Open questions

For the reviewer (`/mstack-review`) to resolve before
implementation.

- **Should `showAll` also be enforceable via a persisted user
  preference?** The URL-param-only approach means an admin's
  preferred view resets every fresh page load. Follow-up if
  admins complain — cheap to add later via `user.preferences` JSON.
  Recommendation: URL only for MVP.
- **Should the queue also show sponsorship state on each row?**
  Sponsorships share the "customer engagement" surface with
  renewals; a business's active sponsorship changes the
  operator's talk track. Out of scope but worth flagging.
- **Renaming the file `window-chips.tsx` to `renewals-filters.tsx`
  now that a non-window chip lives in it.** Cosmetic; reviewer
  picks.
- **The `renewal_status` column / Kanban pipeline** (option 3
  from the earlier analysis). Persistent status enum on
  `business_subscription`, backfilled from the followup history,
  with a full Kanban view. Real architectural improvement — but
  a schema migration + audit rewrite, and a decision on how to
  handle "no followup ever" vs "resolved 3 months ago" states.
  Not this plan. If the admin team wants a full pipeline view,
  it's the next plan to write.
- **Should `Called` also stop auto-shifting `scheduled_next` +7
  days?** The paren suffix now tells the operator what's about
  to happen, but the behaviour itself might be surprising —
  some teams want "Called" to keep the row visible so the next
  operator can chase again the same day. Reviewer picks; my
  recommendation is leave the behaviour alone this pass and
  observe (the toggle now surfaces the outcome so nothing is
  lost).
