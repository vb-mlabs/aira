---
UI-Significant: yes
---

# Review: Renewals queue "row disappeared" clarification pass

**Date:** 2026-07-27
**Slug:** 2026-07-27-renewals-visibility
**Plan reviewed:** [2026-07-27-renewals-visibility.md](../plans/2026-07-27-renewals-visibility.md)
**Status:** approved
**UI-Significant:** yes
**Reviewer:** vb-mlabs (with Claude)

---

## Summary

Approved with three small corrections locked during review:

1. Plan claimed `scheduled_next` was "in the payload but unrendered"
   in the queue table — verified: `last_outcome` + `last_followup_at`
   ARE rendered in the "Last attempt" column
   (`renewal-queue-table.tsx:75, 125-127`), `scheduled_next` is NOT.
   Plan's task is correct in shape, but the description of "what's
   there today" was slightly off. Locked wording in the task list
   below reflects the actual gap.

2. Plan proposed `z.coerce.boolean()` on the input schema, which
   parses non-empty strings (`"abc"`, `"0"`, `"false"`) as truthy —
   a URL like `?showAll=false` would surprise us. Locked as a
   `z.enum(["0", "1"]).optional().transform((v) => v === "1")` so
   only the exact chip-emitted `1` flips the toggle.

3. Plan's ordering CASE adds two correlated subqueries into the
   `ORDER BY`, growing the total from 3 to 5 per outer row. Same
   idiom the existing SELECT already uses, `sf_subscription_created_idx`
   covers both. User locked keeping it as-is; Atlanta MVP volume
   plans this fine (verified via the existing index shape). Noted
   as a future refactor candidate.

Everything else the plan claimed verified against the code:
`FollowupQueueInputSchema` at
`packages/validators/src/subscription-followups.ts:57-61` is `.strict()`
and `withinDays`-only today (fits the +1 field cleanly); the op
handler at `subscription-followups.ts:24-25` is a one-line pass-through
(fits `includeAll` in the same line); `OUTCOME_LABEL` map in the
table (`renewal-queue-table.tsx:36-43`) is already the display-side
enum-to-label surface (no change needed there per plan's own
correct read); `AdminBadge` primitive already accepts variant + label
props for the new resolved/scheduled chips. No new deps. Six files
edited, no schema change.

## Findings

### Concerns (raised, decided, recorded)

- **C1 — Plan's description of what's rendered today was slightly off.**
  Plan reads "already selected Last outcome + Next attempt columns
  so admins can see what happened to a row." Verified in
  `renewal-queue-table.tsx:75, 125-127`: `last_outcome` +
  `last_followup_at` render together as `"${OUTCOME_LABEL[…]} · ${relativeTime(…)}"` in the "Last attempt"
  column. `scheduled_next` (the "Next attempt" info) is NOT
  rendered. **Decision:** the plan's actual task (adding the Next
  attempt column) is correct; the task list below phrases it as
  "add a new column" rather than "surface an existing but
  unrendered field" so `/mstack-code` can't get confused.

- **C2 — `z.coerce.boolean()` accepts any non-empty string as
  truthy.** `?showAll=false`, `?showAll=0`, or any typo like
  `?showAll=abc` all coerce to `true`. **Decision:** switch to
  `z.enum(["0", "1"]).optional().transform((v) => v === "1")`.
  Locks the accept-set to exactly what the chip emits (`1`) and
  silently drops anything else to `false`. Same pattern the
  existing `?archived=1` flag uses on
  `apps/web/src/app/admin/businesses/page.tsx:26` — grep confirms
  the codebase precedent.

- **C3 — Ordering CASE adds two more correlated subqueries.**
  Existing SELECT list at `queries.ts:104-117` already runs 3
  correlated subqueries per row (`latestOutcome`,
  `latestFollowupAt`, `latestScheduledNext`). The new ORDER BY CASE
  wraps two more (one for the outcome membership check, one for
  the `scheduled_next > now()` check). Same idiom, same
  `sf_subscription_created_idx` index. **Decision:** user locked
  keeping the CASE in ORDER BY as-is 2026-07-27; captured in this
  review's Follow-ups so a future scale event can find the
  refactor candidate. No action for this pass.

- **C4 — URL param preservation across chip changes.** Plan flags
  it correctly but doesn't specify: the seven `<Link>` chips
  (five window chips + the new toggle) all need to preserve OR
  emit `?showAll=1` based on their intent. **Decision:** each
  window chip's `href` reads the current searchParam and
  preserves it. The toggle chip's `href` toggles it. Concrete
  guidance added to Task 4 below. Trivial in code (`useSearchParams`
  or accept `showAll` as a prop from the RSC parent).

- **C5 — Subtitle math with zero-count sections.** Plan says
  `"${x > 0 ? … : ""}"` pattern. `apps/web/src/app/admin/renewals/page.tsx:44-49`
  today uses a template with `${overdue} overdue · ${dueSoon} due`
  — the "hidden" count already lives at line 48 as a conditional
  append. **Decision:** extend that same conditional pattern with
  `${resolved > 0 ? \` · \${resolved} resolved\` : ""}` and
  `${scheduled > 0 ? \` · \${scheduled} scheduled\` : ""}`. Only
  render when showAll is on AND count > 0. Compound conditions
  are fine on a single string; ~4 more lines of subtitle logic.

- **C6 — File-rename call in the plan
  (`window-chips.tsx` → `renewals-filters.tsx`).** Plan defers to
  the reviewer. **Decision:** keep `window-chips.tsx` for this
  pass. The toggle chip lands in the same file (~30 more lines,
  well under 80 total). A rename now would add commit noise
  without changing the code shape — save for a follow-up if the
  file grows past ~100 lines.

- **C7 — `scheduled_next` display format.** Plan says "absolute
  date". `relativeTime` at `renewal-queue-table.tsx:226-240`
  already renders absolute dates as `mm/dd/yyyy` for anything
  older than 7 days. **Decision:** reuse the same helper for
  `scheduled_next` display so both attempt columns render the
  same shape. Cleaner than introducing a new date formatter.
  Task 5 below spells this out.

### Suggestions (taken)

- **S1 — Add one guard test in `packages/services/src/subscription-followups/__tests__/list-queue.test.ts`** that asserts
  `listQueue({ withinDays, includeAll: false })` returns the exact
  same rows as `listQueue({ withinDays })` for a fixture with
  both resolved and active subscriptions. No existing test file
  covers `listQueue`; the acceptance criterion's "no behavioural
  drift on the default path" needs proof, and this is the smallest
  proof shape. Uses the chainable-mock db pattern the sibling
  `packages/services/src/notifications/__tests__/service.test.ts`
  uses.

- **S2 — Confirm the `aria-pressed` semantic on the toggle chip.**
  The existing `<Link>` chips use `aria-current="page"`; a toggle
  is not a "current page" but a state, so `aria-pressed` is the
  right primitive. Small a11y detail; already in the plan, just
  worth restating.

### Deferred (out of this pass; captured in follow-ups)

- Persistent user preference for `showAll`. Cheap follow-up if
  admins reset the URL param constantly.
- `renewal_status` column + Kanban pipeline. Real architectural
  improvement, deserves its own plan.
- File rename `window-chips.tsx` → `renewals-filters.tsx` if the
  file grows.
- LATERAL JOIN refactor of `listQueue` if the correlated-subquery
  count becomes measurable.

## Decisions locked

Net-new during review (beyond planning-time decisions):

1. `includeAll` input schema: `z.enum(["0", "1"]).optional().transform((v) => v === "1")` — NOT `z.coerce.boolean()`.
2. `scheduled_next` display reuses the existing `relativeTime`
   helper (renders as `mm/dd/yyyy` when > 7 days out; otherwise
   the relative `Xd from now` inversion — see Task 5's What).
3. `window-chips.tsx` stays. No rename this pass.
4. One new guard test file at `packages/services/src/subscription-followups/__tests__/list-queue.test.ts`.
5. Ordering CASE stays as planned (5 total correlated subqueries).
6. All existing planning-time decisions from the plan stand
   (three-tier ordering: active → scheduled → resolved; consequence
   in parens on labels; no DB enum rename; no mutation change).

## Implementation plan

Ordered tasks for `/mstack-code`. Six code tasks + one gate.
Every task leaves the codebase in a working state; the app
compiles and the queue works even mid-run (the `includeAll` flag
defaults to false through Task 3, and the UI only starts using it
at Task 4).

### Task 1: Extend `listQueue` service with `includeAll` + ordering CASE

- **Files:** `packages/services/src/subscription-followups/queries.ts` (edit)
- **What:** Add `includeAll?: boolean` to `ListQueueOpts` (line 71).
  In `listQueue` at line 87, replace the `where` block so
  `inActiveQueue` is only included when `!opts.includeAll`
  (`and()` accepts undefined branches, drop the predicate cleanly
  via `activeOnly ? inActiveQueue : undefined`). Prepend a new
  three-tier CASE to `.orderBy(…)` that groups by resolution
  state: 0 = active-visible, 1 = scheduled-future, 2 = resolved
  terminal. The CASE embeds two correlated subqueries against
  `subscription_followup` (latest outcome + latest scheduled_next),
  same idiom as the SELECT list. Keeps the existing overdue-first
  + end_date secondary sorts.
- **Acceptance:** `pnpm --filter @aira/services typecheck` clean.
  The default path (no `includeAll`) still filters via `inActiveQueue`;
  the includeAll path drops that predicate. Ordering CASE evaluates
  correctly regardless of mode (verified by Task 2's test).
- **Pause if:** `pnpm db:generate` proposes any migration — this
  task must NOT trigger a schema change.

### Task 2: Guard test for `listQueue` default parity

- **Files:** `packages/services/src/subscription-followups/__tests__/list-queue.test.ts` (new)
- **What:** Vitest unit test using the chainable-mock db pattern
  from `packages/services/src/notifications/__tests__/service.test.ts`.
  Two tests:
  1. `listQueue({ withinDays: 7 })` and
     `listQueue({ withinDays: 7, includeAll: false })` produce
     identical Drizzle query fragments (or, since the mock does
     not run SQL: identical `.where` and `.orderBy` argument
     shapes). Confirms the acceptance criterion "no behavioural
     drift on the default path."
  2. `listQueue({ withinDays: 7, includeAll: true })` omits the
     `inActiveQueue` predicate from the `and(…)` args (the mock
     captures the array; length or a deep-equal check works).
- **Acceptance:** `pnpm --filter @aira/services test` green;
  both new tests pass; existing 68 tests unaffected.

### Task 3: Extend validator + op with `includeAll`

- **Files:** `packages/validators/src/subscription-followups.ts` (edit) · `apps/web/src/server/operations/subscription-followups.ts` (edit)
- **What:** In the validator at line 57, extend
  `FollowupQueueInputSchema` (`.strict()`) with
  `includeAll: z.enum(["0", "1"]).optional().transform((v) => v === "1")`.
  The strict object schema accepts `.strict()` extension via the
  fluent `.extend()` API — but this is `.object({ withinDays }).strict()`
  so replace with `.object({ withinDays, includeAll }).strict()`.
  Op handler at
  `apps/web/src/server/operations/subscription-followups.ts:23-27`
  reads `input.includeAll ?? false` and passes to
  `service.listQueue(db, { withinDays, includeAll })`. Op output
  shape unchanged — total field already reports the (post-cap)
  count for the current mode.
- **Acceptance:** `pnpm typecheck` clean at the workspace root.
  A `curl 'http://localhost:3000/api/v1/admin/renewals/queue?withinDays=7'`
  produces the same result as
  `curl '…?withinDays=7&includeAll=0'`. A
  `curl '…?withinDays=7&includeAll=1'` (with admin cookie)
  returns rows the default view hides.

### Task 4: Toggle chip in `window-chips.tsx`

- **Files:** `apps/web/src/features/admin/renewals/window-chips.tsx` (edit)
- **What:** Extend the component to accept a `showAll: boolean` prop
  alongside the existing `current: number`. Each existing window
  chip's `href` preserves `showAll` when true
  (`?withinDays=X&showAll=1`) and drops it when false. New
  toggle chip appended to the same `<nav>` (separated by a
  vertical divider like `admin/businesses/page.tsx:92` uses:
  `<div className="h-4 w-px bg-border" />`). Label
  `"Include resolved & scheduled"`, `aria-pressed={showAll}`,
  same styling primitives as the window chips. Active state:
  `?showAll=1&withinDays=<current>`; inactive drops
  `showAll`.
- **Acceptance:** Chip renders. Clicking it while a window chip
  is active preserves `withinDays`. Clicking a different window
  chip while `showAll` is active preserves `showAll`.
  `aria-pressed` reflects the state (verified via DOM inspection
  or by writing a Playwright smoke — deferred to /mstack-qa).

### Task 5: New "Next attempt" column + resolved/scheduled row treatment

- **Files:** `apps/web/src/features/admin/renewals/renewal-queue-table.tsx` (edit)
- **What:** Two changes:
  1. Add a new `<th>` "Next attempt" between "Last attempt" (line 75)
     and "Contact" (line 76). Corresponding `<td>` shows
     `row.scheduled_next` formatted through the existing
     `relativeTime` helper (line 226) — falls into the
     `mm/dd/yyyy` branch for dates > 7 days out, "just now" / "Xd"
     for closer dates. Em-dash when `scheduled_next` is null. Uses
     `suppressHydrationWarning` for parity with the existing "Last
     attempt" cell (line 123).
  2. Row-level dim + badge for resolved / scheduled rows. Compute
     inside the `.map` at line 80:
     ```
     const resolved = row.last_outcome === "paid" || row.last_outcome === "refused"
     const scheduled = !resolved && row.scheduled_next !== null && new Date(row.scheduled_next) > new Date()
     ```
     Row `<tr>` picks up `opacity-60` when `resolved || scheduled`.
     Inside the "Last attempt" cell append a small
     `<AdminBadge variant={resolved ? "archived" : "unverified"} label={resolved ? "Resolved" : "Scheduled"} />`
     (variants picked from the existing `admin-badge.tsx` STYLES
     map — `archived` = muted gray for terminal, `unverified` =
     the muted variant used elsewhere for pending states; if a
     more semantic variant is preferred, add one to
     `admin-badge.tsx` in the same task and expand the STYLES map).
- **Acceptance:** Manual smoke — mark a business `Reschedule`
  for 5 days, toggle Include-all on, verify:
  - Row reappears at the bottom of the table (bucket 1: scheduled)
  - Row is dimmed
  - "Last attempt" cell shows `Rescheduled · <n>d ago` + a
    `Scheduled` badge
  - "Next attempt" cell shows the ~5-day-out date
  - Same shape for a `Refused` row (bucket 2, `Resolved` badge)

### Task 6: Subtitle counts + page `showAll` searchParam wiring

- **Files:** `apps/web/src/app/admin/renewals/page.tsx` (edit)
- **What:** Extend the `PageProps.searchParams` type at line 20 to
  add `showAll?: string`. Parse via the same enum transform (or
  a local `showAll === "1"` check for terseness). Pass to
  `apiServerFetch(listFollowupQueueOp, { input: { withinDays,
  includeAll: showAll } })`. Extend subtitle at line 44-49:
  ```
  const scheduled = items.filter((r) => r.scheduled_next && new Date(r.scheduled_next) > new Date()).length
  const resolved = items.filter((r) => r.last_outcome === "paid" || r.last_outcome === "refused").length
  // Append to subtitle:
  //   `${showAll && scheduled > 0 ? \` · \${scheduled} scheduled\` : ""}`
  //   `${showAll && resolved > 0 ? \` · \${resolved} resolved\` : ""}`
  ```
  Passes `showAll` to `<WindowChips current={withinDays} showAll={showAll} />`
  and to `<RenewalQueueTable … />` if the table needs it for the
  empty-state copy (it doesn't for this pass — the current empty
  state is fine).
- **Acceptance:** Page renders in both modes. Subtitle math is
  correct on default view (unchanged from today). Subtitle math
  adds resolved + scheduled counts on `?showAll=1`. `pnpm typecheck`
  clean.

### Task 7: Copy pass in `outcome-radio-group.tsx`

- **Files:** `apps/web/src/features/admin/renewals/outcome-radio-group.tsx` (edit)
- **What:** In the `OPTIONS` array at line 24, swap four `label`
  values. Hints unchanged.
  - `Called` → `Called (hides for 7 days)`
  - `Refused` → `Refused (removes from queue)`
  - `Marked paid` → `Marked paid (removes from queue)`
  - `Reschedule` → `Reschedule (hides for N days)`
- **Acceptance:** The follow-up modal renders the new labels.
  Enum values (`called`, `voicemail`, `no_answer`, `refused`,
  `paid`, `reschedule`) unchanged so no server-side ripple.
  `pnpm typecheck` clean.

### Task 8: Final gate

- **Files:** none
- **What:** `pnpm typecheck && pnpm lint && pnpm --filter
  @aira/services test`. Manual smoke: run through the plan's
  acceptance-criterion smoke: mark a business `Reschedule` for
  5 days, verify disappears under default 7-day chip, toggle
  Include-all, verify row appears with `Scheduled` badge + the
  next-attempt date. Repeat for a `Refused` outcome (should show
  `Resolved` badge).
- **Acceptance:** All three commands pass. Smoke verified on the
  local dev server.

## Open questions

None. All plan open questions were resolved during review with
recommendations locked in the tasks above:

- `showAll` as URL param only (persistent preference is a
  follow-up TODO; not this plan).
- `renewal_status` column / Kanban — future plan, not this pass.
- File rename `window-chips.tsx` → `renewals-filters.tsx` —
  deferred (C6).
- Keep `Called`'s +7-day auto-shift behaviour — deferred (the
  paren suffix surfaces it now, no behaviour change here).

Anything `/mstack-code` should escalate:

- If Task 3's validator schema change breaks a downstream consumer
  the plan didn't anticipate (grep during that task to confirm
  the only `FollowupQueueInputSchema` consumer is the op — should
  be true).
- If `admin-badge.tsx`'s STYLES map doesn't include a variant
  that reads correctly for `Scheduled`, pause and either propose
  the addition inline in Task 5 or ask for a semantic name.
