# Plan: F23′ — Admin renewal follow-up queue

**Date:** 2026-06-15
**Slug:** renewal-followup-queue
**Status:** reviewed
**Author:** vb-mlabs

---

## Problem

PRD F16 expects the admin to chase expiring business subscriptions by hand
(no SMS reminders in MVP). The PRD's original answer was a CSV download —
admin opens `/admin/businesses?renewing=N`, downloads the CSV, opens it in
Excel, calls each business, scribbles the outcome somewhere.

That workflow has four real problems:

1. **Outcomes evaporate.** Call results live in the admin's head or scratch
   notes — never in `audit_log`. When something goes wrong ("why did this
   subscription lapse?") there's no record.
2. **Place-keeping is manual.** Interrupt the admin mid-list and they lose
   their spot.
3. **Phone numbers get mistyped** in copy/paste between systems.
4. **Stale state.** The CSV is a snapshot from minutes-or-hours ago; by the
   time the admin calls, some businesses may have already paid via another
   channel and the admin doesn't know.

**Who benefits:** the AIRA admin / operator running the directory. No
end-user behaviour changes.

**Success:** the admin opens `/admin/renewals`, sees a ranked queue of
subscriptions due-for-followup (overdue first, then by closest expiry),
clicks one, sees the business detail panel + phone numbers + one-tap call,
captures an outcome (`called` / `voicemail` / `no_answer` / `refused` /
`paid` / `reschedule`) plus an optional note, hits Save. The row drops from
the queue (or, for `reschedule`, drops until the `scheduled_next` date).
Every outcome is a permanent `audit_log` entry.

---

## Scope

**In:**
- New table `subscription_followup` — one row per attempt
  (`subscription_id`, `actor_id`, `outcome` enum, `note`, `scheduled_next`,
  `created_at`)
- New enum `followup_outcome` — `called | voicemail | no_answer | refused | paid | reschedule`
- Service: `subscriptionFollowups.listQueue(db, { withinDays })` — joins
  `findRenewingSoon`-shape rows with their latest followup row, filters out
  subscriptions whose latest outcome is `paid` or whose `scheduled_next > now()`
- Service: `subscriptionFollowups.create(db, { actorId, subscriptionId, outcome, note?, rescheduleDays? })` — transactional INSERT + audit row
- New `AuditMeta` variant: `kind: "business.subscription_followup"` with
  `outcome`, `note?`, `scheduled_next?`
- New ops file: `apps/web/src/server/operations/subscription-followups.ts`
  with `listFollowupQueueOp` (admin GET) + `createFollowupOp` (admin POST)
- New REST routes:
  - `GET /api/v1/admin/renewals/queue?withinDays=N` → list
  - `POST /api/v1/admin/renewals/[subscriptionId]/followups` → record outcome
- New admin route `/admin/renewals/page.tsx` (RSC + client list)
- New admin sidebar entry "Renewals" under the Businesses group
- "Paid" outcome deep-links to `/admin/businesses/[business_id]` so admin
  records payment through the existing recorded-payment form (no inline
  duplicate)
- Existing CSV download at `/api/v1/admin/businesses/renewals.csv` stays —
  no removal, no relocation

**Out (deferred):**
- Reschedule-reminder cron / digest email (only the `scheduled_next`
  timestamp + auto-reappearance for MVP)
- Bulk actions ("mark this entire batch as voicemail" / undo) — single-row
  flow only
- Multi-admin coordination beyond last-write-wins on the followup table
  (each followup is its own row; admins can't conflict)
- Mobile-friendly layout beyond "doesn't break at 375px" — admin console is
  desktop-first throughout
- The other four PRD F23 CSV surfaces (Listings, Categories, Memberships,
  Sponsorships, Posts) — deferred per the 2026-06-15 roadmap decision
- F22 audit log UI polish (filters / readable rendering) — separate plan
- Per-business-owner email — Phase 2 (owner-identity blocker)
- Pulling the renewing-N window from `app_setting` (the existing
  `RenewingFilter` is the source of truth; the queue defaults to
  `withinDays=30` matching the longest current filter chip)

---

## Approach

### Architecture: derived view + followup table

The queue is **not** a persisted batch. There's no "Start chase → snapshot
rows → work through them" mode. Instead, the queue is a SQL view computed
each time the page loads:

```
SELECT  bs.*, b.name, b.phone, b.whatsapp_number, mp.name AS plan_name,
        latest_followup.outcome  AS last_outcome,
        latest_followup.scheduled_next,
        latest_followup.created_at AS last_followup_at
FROM    business_subscription bs
JOIN    business b   ON b.id = bs.business_id
LEFT    JOIN membership_plan mp ON mp.id = bs.plan_id
LEFT    JOIN LATERAL (
  SELECT outcome, scheduled_next, created_at
  FROM   subscription_followup
  WHERE  subscription_id = bs.id
  ORDER  BY created_at DESC LIMIT 1
) latest_followup ON true
WHERE   bs.payment_status IN ('paid', 'overdue')
  AND   bs.end_date BETWEEN now() AND now() + INTERVAL '<withinDays> days'
  AND   (latest_followup.outcome IS NULL
         OR latest_followup.outcome <> 'paid')
  AND   (latest_followup.scheduled_next IS NULL
         OR latest_followup.scheduled_next <= now())
ORDER   BY
  CASE WHEN bs.end_date < now() THEN 0 ELSE 1 END,   -- overdue first
  bs.end_date ASC                                     -- then closest expiry
```

In Drizzle this becomes the same correlated-subquery shape S5's homepage
sponsored sort uses (decision log 2026-06-10 — Drizzle's `.orderBy()`
doesn't speak LATERAL JOIN). The query is rebuildable from existing
fragments: the `findRenewingSoon` query in
`packages/services/src/business-subscriptions/queries.ts` already has the
businesses + plans join shape.

**Why this won over the persisted-batch alternative:**
- New entries (subscriptions about to renew) auto-flow into the queue
  between sessions — no reconciliation logic.
- Multi-admin concurrency is implicit — each followup is a new row, no
  shared mutable "batch" to fight over.
- "Place-keeping" is recorded as data, not state: each followup is a
  permanent record, sortable, queryable, and dropping into `audit_log` for
  free.
- No batch-lifecycle state machine to maintain.

### The followup table

```sql
CREATE TYPE followup_outcome AS ENUM (
  'called', 'voicemail', 'no_answer', 'refused', 'paid', 'reschedule'
);

CREATE TABLE subscription_followup (
  id              text PRIMARY KEY,
  subscription_id text NOT NULL REFERENCES business_subscription(id) ON DELETE CASCADE,
  actor_id        text NOT NULL REFERENCES "user"(id) ON DELETE SET NULL,
  outcome         followup_outcome NOT NULL,
  note            text,
  scheduled_next  timestamp,                -- only set when outcome = 'reschedule'
  created_at      timestamp NOT NULL DEFAULT now()
);

CREATE INDEX sf_subscription_created_idx
  ON subscription_followup (subscription_id, created_at DESC);
CREATE INDEX sf_scheduled_next_idx
  ON subscription_followup (scheduled_next)
  WHERE scheduled_next IS NOT NULL;
```

Notes:
- `subscription_id`-cascade-delete because if a subscription row is voided,
  the followup history goes with it (consistent with how we treat
  `business_subscription` → `business` cascade).
- `actor_id` is `SET NULL` on user delete (matches `audit_log` pattern —
  history outlives users).
- The partial index on `scheduled_next` keeps the queue query fast even as
  the followup row count grows; most rows have `scheduled_next IS NULL`.

### Outcome semantics

| outcome | drops from queue | note required | other effects |
|---|---|---|---|
| `called` | yes | yes (free text) | none |
| `voicemail` | yes | optional | none |
| `no_answer` | yes | optional | none |
| `refused` | yes | recommended | none (the subscription will still
  expire — admin may later void it via existing flow) |
| `paid` | **permanently** (re-queues only if a fresher unpaid sub appears) | optional | UI deep-links to `/admin/businesses/[business_id]#record-payment` so admin can confirm payment through the existing form |
| `reschedule` | until `scheduled_next` passes | optional | requires `scheduled_next` (input: "call back in N days" — 1–60) |

"Drops from queue" is computed from the latest followup row — re-clicking
"called" tomorrow because the admin called again creates a *new* followup
row; the previous one stays as history.

### Service layer

New domain `packages/services/src/subscription-followups/`:

- `index.ts` re-exports
- `queries.ts`:
  - `listQueue(db, { withinDays }): Promise<QueueRow[]>` — the LATERAL
    join above, returns the queue with `last_outcome`, `last_followup_at`,
    `scheduled_next`, plus the same business + plan fields the existing
    `findRenewingSoon` returns.
  - `listForSubscription(db, { subscriptionId }): Promise<FollowupRow[]>` —
    history for a single subscription (used in the row-detail panel).
- `mutations.ts`:
  - `create(db, { actorId, subscriptionId, outcome, note, scheduleDays })` —
    transactional `db.transaction` that INSERTs the followup row, then
    writes the matching `audit_log` row via the widened `Pick<Database, "insert">`
    audit helper. Same audit-around-mutation pattern locked in the
    2026-06-14 decision log.

### Operations + REST routes

`apps/web/src/server/operations/subscription-followups.ts`:

```ts
export const listFollowupQueueOp = defineOperation({
  name: "admin.followups.listQueue",
  input: z.object({ withinDays: z.coerce.number().int().min(1).max(365).optional() }).strict(),
  output: FollowupQueueOutputSchema,
  permission: "admin",
  handler: async (db) => ({ items: await subscriptionFollowups.listQueue(db, { withinDays: input.withinDays ?? 30 }) })
})

export const createFollowupOp = defineOperation({
  name: "admin.followups.create",
  input: CreateFollowupInputSchema,             // includes subscriptionId, outcome, note?, scheduleDays?
  output: z.object({ id: z.string() }),
  permission: "admin",
  handler: async (db, ctx, input) => {
    const row = await subscriptionFollowups.create(db, { actorId: ctx.userId, ...input })
    return { id: row.id }
  },
})
```

The validators (`FollowupQueueOutputSchema`, `CreateFollowupInputSchema`,
`FollowupOutcomeSchema`) go in
`packages/validators/src/subscription-followups.ts`. The
`CreateFollowupInputSchema` enforces the conditional that `outcome ===
"reschedule"` requires `scheduleDays` (1–60) and forbids it for other
outcomes — Zod `superRefine`.

### Admin UI

New route `apps/web/src/app/admin/renewals/page.tsx` (RSC):

- Fetches via `apiServerFetch(listFollowupQueueOp, { input: { withinDays }})`
- Renders an `AdminPageHeader` with subtitle showing counts ("3 overdue ·
  12 due in 30 days · 2 scheduled-for-followup")
- `RenewingFilter`-style chip strip ("Due in 7 / 14 / 30 days") — same
  visual pattern as `/admin/businesses`
- A `<RenewalQueueTable>` (client) that renders the queue with row-click →
  detail modal

`apps/web/src/features/admin/renewals/`:

- `renewal-queue-table.tsx` — table (one row per subscription) with:
  business name + tier · plan · `payment_status` chip · end_date relative
  ("in 5 days" / "OVERDUE 2d" — uses the stable-UTC `relativeTime` helper
  the community card already uses to avoid the 2026-06-14 hydration trap) ·
  last attempt label + `relativeTime` · phone-shortcut icons (tap-to-call
  + WhatsApp deep-link, stop-propagation on click). Row click opens the
  detail modal.
- `followup-modal.tsx` — modal with two panes: left = subscription detail
  (business contact card, recent followup history); right = outcome form
  (radio group for the six outcomes, optional note textarea,
  conditional `scheduleDays` input for `reschedule`, Save button). On
  Save, calls `apiClient.post("/api/v1/admin/renewals/[subscriptionId]/followups")`,
  closes modal on success, refreshes the queue via `router.refresh()`.
  Follows the `community/post-detail-modal.tsx` pattern (locked
  2026-06-14).
- `outcome-radio-group.tsx` — extracted radio group because it'll have
  per-option helper text ("Call back in N days" reveals the
  `scheduleDays` input under the `reschedule` row).

For the "paid" outcome specifically:
- Submitting "paid" still creates a followup row (the chase ended).
- On success, the modal also offers a "Go to record payment →" link that
  navigates to `/admin/businesses/[business_id]` with an anchor or query
  param to focus the existing recorded-payment form. The admin can choose
  to navigate immediately or stay in the queue and follow up later from
  the business detail page directly.

### Audit + AuditMeta

Extend the union in `packages/db/src/audit.ts`:

```ts
| {
    kind: "business.subscription_followup"
    outcome: "called" | "voicemail" | "no_answer" | "refused" | "paid" | "reschedule"
    note: string | null
    scheduled_next: string | null   // ISO, only for 'reschedule'
  }
```

The action string in `audit_log.action` is `"business.subscription_followup"`.
`target_type` is `"business_subscription"`, `target_id` is the subscription
id. The discriminated-union 2026-06-14 lesson (`switch (body.kind)`
exhaustive cases) doesn't bite here because we're not adding a
`NotificationBody` variant — `audit_log` consumers (the audit table)
already render via `JSON.stringify(metadata)` today, and F22 polish will
add a readable case for this kind when it lands.

### Existing CSV: keep, don't relocate

The "Download CSV" button at `/admin/businesses?renewing=N` (page.tsx:35,
route at `apps/web/src/app/api/v1/admin/businesses/renewals.csv`) stays
exactly as-is. The F23′ queue is the primary in-UI workflow; the CSV
remains for archive/share use cases (e.g. emailing a snapshot to the
client). Adding a second download button on the new page is out of scope —
keep the surfaces orthogonal.

**Alternatives considered:**

- **Persisted batch ("Start chase" → snapshot)** — rejected. Adds a
  batch-state lifecycle (open/in-progress/closed), needs reconciliation
  logic when new subscriptions appear between sessions, no win over the
  derived view for a single-admin workflow.
- **Free-text-only reschedule (no `scheduled_next` timestamp)** —
  rejected. Loses the "queue auto-reappears on the due date" behaviour
  that motivated the workflow in the first place.
- **Inline record-payment widget for the `paid` outcome** — rejected.
  Duplicates the existing form, introduces two write paths to the same
  data, no win over a deep-link.
- **Replacing the existing CSV** — rejected. Some external use cases
  (sending a summary to the client) genuinely want a file; keeping both
  surfaces orthogonal is zero engineering cost.

---

## Data model changes

- **New enum:** `followup_outcome` (`called | voicemail | no_answer |
  refused | paid | reschedule`).
- **New table:** `subscription_followup` (columns: `id`, `subscription_id`
  FK + cascade, `actor_id` FK + set-null, `outcome` enum, `note` text,
  `scheduled_next` timestamp, `created_at` timestamp default now).
- **New indexes:** `(subscription_id, created_at DESC)` for the
  "latest-per-subscription" LATERAL join; partial index on
  `scheduled_next WHERE scheduled_next IS NOT NULL` for the
  "due-for-followup" filter.
- **No backfill.** The table starts empty; existing subscriptions show up
  in the queue with `last_outcome = null`, as expected.
- **No `app_setting` keys.** The queue uses a query-string `withinDays`
  default of 30; promoting that to a tunable knob is deferred (same
  reasoning as the AppSetting hub deferral 2026-06-15).
- **One migration file** generated via `pnpm db:generate` after
  appending the schema file.

---

## Files to touch

**New:**
- `packages/db/src/schema/subscription-followups.ts` — Drizzle schema
- `packages/db/drizzle/migrations/<timestamp>_subscription_followup.sql` —
  generated migration
- `packages/services/src/subscription-followups/index.ts`
- `packages/services/src/subscription-followups/queries.ts` — `listQueue`,
  `listForSubscription`
- `packages/services/src/subscription-followups/mutations.ts` — `create`
  (transactional INSERT + audit)
- `packages/validators/src/subscription-followups.ts` —
  `FollowupOutcomeSchema`, `CreateFollowupInputSchema`,
  `FollowupQueueOutputSchema`, `FollowupRowSchema`
- `apps/web/src/server/operations/subscription-followups.ts` —
  `listFollowupQueueOp`, `createFollowupOp`
- `apps/web/src/app/api/v1/admin/renewals/queue/route.ts` — GET handler
- `apps/web/src/app/api/v1/admin/renewals/[subscriptionId]/followups/route.ts` — POST handler
- `apps/web/src/app/admin/renewals/page.tsx` — RSC entry
- `apps/web/src/features/admin/renewals/renewal-queue-table.tsx`
- `apps/web/src/features/admin/renewals/followup-modal.tsx`
- `apps/web/src/features/admin/renewals/outcome-radio-group.tsx`
- `apps/web/src/features/admin/renewals/window-chips.tsx` (the in-page
  equivalent of `RenewingFilter`, reading/writing the page's own URL
  param)

**Edit:**
- `packages/db/src/schema/index.ts` — re-export the new schema
- `packages/services/src/index.ts` — re-export the new domain (matching
  `appSettings` pattern: `export * as subscriptionFollowups from "./subscription-followups"`)
- `packages/validators/src/index.ts` — re-export the new schemas
- `packages/validators/package.json` — `./subscription-followups` subpath
  export
- `packages/db/src/audit.ts` — extend `AuditMeta` with the
  `business.subscription_followup` variant
- `apps/web/src/app/admin/_components/admin-sidebar.tsx` — add "Renewals"
  link
- `apps/web/src/features/admin/index.ts` — re-export the new feature
  components if any consumer outside `/admin/renewals/*` needs them
  (probably not — keep them internal)

**Untouched (despite seeming relevant):**
- `apps/web/src/app/admin/businesses/page.tsx` — the existing CSV button
  + renewing filter both stay.
- `apps/web/src/app/api/v1/admin/businesses/renewals.csv/route.ts` —
  exactly as-is.
- `packages/services/src/business-subscriptions/queries.ts` — neither
  `findRenewingSoon` nor `findRenewingExactlyInDays` is modified; the
  new `listQueue` query shares the same join shape but lives in the new
  domain.

---

## Edge cases

- **A subscription with `payment_status = 'paid'` and a future `end_date`
  inside the window.** PRD F16's "renewing-soon" includes these (a
  business who paid this term will be renewing for the next term).
  Already inside `findRenewingSoon`'s scope — handled identically. The
  admin can record a "paid" followup to indicate they confirmed
  next-term-intent; or simply leave it alone and chase it via the
  renewal-reminder digest.
- **Admin records `paid` but the business hasn't actually paid the next
  term.** The followup row records the admin's claim; if the
  subscription doesn't actually get a recorded payment via
  `/admin/businesses/[id]`, the subscription will lapse normally. The
  followup is informational, not a payment record.
- **Admin records `reschedule` with `scheduleDays = 60` but the
  subscription expires in 10 days.** Allowed by validation; the
  subscription will already be lapsed by the followup date. UI shows a
  warning at form-fill time ("Scheduled past end_date — subscription
  will expire first"), but doesn't block. The audit row records what
  the admin asked for.
- **Two admins both work the same row at the same time.** Each Save
  creates a separate followup row; the queue's "latest per subscription"
  join shows whichever was inserted last. Audit log has both. No
  conflict, no locking needed.
- **A subscription with three back-to-back `voicemail` followups in one
  day.** Allowed; this is exactly the chase pattern we're trying to
  capture. Each is its own audit row.
- **Subscription row is voided** (existing
  `business.subscription_voided` audit) **after followup rows exist.**
  `ON DELETE CASCADE` removes the followup history with the
  subscription. Audit rows survive (they're a separate table). If we
  want followup history to survive subscription deletion, switch to
  `ON DELETE SET NULL` — flagged as an open question.
- **`scheduled_next` lands on a daylight-saving transition.** All
  comparisons are server-time UTC. JS `Date` is never used for the
  decision; only the `now()` SQL function. No drift.
- **`withinDays = 365` (the validator cap).** Queue could span ~all
  active subscriptions. Performance: the existing indexes
  (`bs_business_end_idx`, `bs_paid_end_idx`) cover the filter; pagination
  isn't strictly required for MVP volume (Atlanta-only directory) but
  we'll cap the queue page at 100 rows with a "showing 100 of N" hint
  if N > 100.
- **Mobile screen.** The modal collapses to a single column at < 768px;
  the table becomes a card list. Not heroic mobile UX, but functional.

---

## Acceptance criteria

- [ ] `subscription_followup` table + `followup_outcome` enum exist in the
  schema; one generated migration applies cleanly via `pnpm db:migrate`
- [ ] `GET /api/v1/admin/renewals/queue?withinDays=14` returns the
  expected derived view: only `paid|overdue` subscriptions whose
  `end_date` is in the window, excluding any whose latest followup has
  `outcome = 'paid'` or `scheduled_next > now()`, sorted overdue-first
  then end_date asc
- [ ] `POST /api/v1/admin/renewals/[subscriptionId]/followups` with body
  `{ outcome: "called", note: "Spoke to Asha, renewing next week" }`
  creates a row and a matching `audit_log` row with
  `kind: "business.subscription_followup"`; both writes happen in the
  same transaction
- [ ] `POST ...` with `{ outcome: "reschedule", scheduleDays: 7 }`
  creates a row with `scheduled_next = now() + 7 days`; the
  subscription disappears from the queue and reappears at/after that
  timestamp
- [ ] `POST ...` with `{ outcome: "reschedule" }` (no `scheduleDays`)
  rejects with 400 + the Zod path pointing at `scheduleDays`
- [ ] `POST ...` with `{ outcome: "called" }` (missing `note`) rejects
  with 400 + a friendly error pointing at `note` (called requires a
  note — captured in `CreateFollowupInputSchema`'s `superRefine`)
- [ ] Admin opens `/admin/renewals`, sees the queue, clicks a row → modal
  opens with the subscription detail + outcome form; selects
  `voicemail`, hits Save → toast appears, modal closes, row drops from
  the table within the next refresh tick
- [ ] Admin selects `paid` in the modal → on Save, the modal closes and
  surfaces a "Record payment →" deep link to
  `/admin/businesses/[business_id]#record-payment`
- [ ] Admin sidebar's "Renewals" link works; the page's active
  highlighting matches the existing sidebar pattern
- [ ] Existing CSV button on `/admin/businesses?renewing=N` still works
  and produces the same CSV shape
- [ ] `pnpm typecheck` passes; `pnpm lint` passes; `pnpm test` passes;
  the existing renewal-reminder cron continues to function (regression
  on F17)
- [ ] Hydration: row-detail relative timestamps use the stable UTC
  `relativeTime` helper or `suppressHydrationWarning` — no console
  hydration warnings (regression check from 2026-06-14)

---

## Open questions

For `/mlabs-review` to resolve before implementation:

1. **Followup table cascade vs set-null on subscription delete.** Plan
   leans cascade (followup history dies with the subscription, matching
   the rest of the cascade pattern). Set-null preserves history but
   leaves orphan rows. Lock in review.
2. **"Note required" enforcement.** Plan enforces note for `called` only
   (the only outcome where the note IS the value of the call). Some
   teams enforce it for `refused` too. Acceptable to leave optional
   for `refused` since the outcome itself is meaningful; verify
   intent.
3. **Reschedule upper bound.** Plan caps `scheduleDays` at 60. PRD doesn't
   speak to it; reasonable since beyond 60 days the subscription has
   likely already expired in normal cases. Bump to 90 if reviewer
   pushes.
4. **Queue default `withinDays`.** Plan defaults to 30 (matches the
   longest chip in the existing `RenewingFilter`). Alternative: read
   from `app_setting.reminder_schedule` and use its max value. The
   latter is more "tied-to-config" but couples two features; review
   call.
5. **Sidebar placement.** Should "Renewals" be a top-level admin nav
   entry, or nested under a "Businesses" group with "Listings" and
   "Renewals" as siblings? Current sidebar pattern uses top-level
   links; nesting would require a sub-nav.
6. **AuditMeta `outcome` field redundancy.** The action string is
   `"business.subscription_followup"` for every variant; the
   `outcome` lives in the metadata. Should each outcome get its own
   action kind (`business.subscription_followup_called`, etc.) for
   easier filtering in F22 audit log UI later? Plan leans single
   action + outcome-in-metadata (consistent with how
   `session.revoked.reason` is structured); confirm.
