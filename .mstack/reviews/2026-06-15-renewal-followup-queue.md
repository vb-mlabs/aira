# Review: F23′ — Admin renewal follow-up queue

**Date:** 2026-06-15
**Slug:** renewal-followup-queue
**Plan reviewed:** [2026-06-15-renewal-followup-queue.md](../plans/2026-06-15-renewal-followup-queue.md)
**Status:** approved
**UI-Significant:** yes
**Reviewer:** vb-mlabs

---

## Summary

Plan is ready to implement. Architecture (derived view + `subscription_followup`
table) is sound and consistent with locked codebase patterns. Review surfaced
a handful of mechanical fixes (handler/service signatures, LATERAL → correlated
subquery, missing `whatsapp_number` join, audit-around-INSERT ordering) and
resolved all six of the plan's open questions in-line per the auto-mode bias
toward making sound calls. No blockers. Implementation plan is nine atomic
tasks ordered so each commit leaves the codebase building.

---

## Findings

### Blockers (must fix before /mlabs-code)

None.

### Concerns (raised, decided, recorded)

- **Concern:** Plan's pseudo-SQL uses `LEFT JOIN LATERAL` to fetch the latest
  followup per subscription. Decision log 2026-06-10 already locked that
  Drizzle's `.orderBy()` builder does not support LATERAL JOIN — the existing
  homepage sponsored-sort works around this with correlated subqueries
  (`homepageSponsoredFlag` in `packages/services/src/businesses/queries.ts:68`).
  **Decision:** Use the correlated-subquery pattern — one `sql` fragment per
  field we need from the latest followup (`last_outcome`, `last_followup_at`,
  `scheduled_next`), each wrapped in `(SELECT … FROM subscription_followup
  WHERE subscription_id = bs.id ORDER BY created_at DESC LIMIT 1)`. The
  filter ("exclude where latest outcome = 'paid' or scheduled_next > now()")
  also uses correlated subqueries inside the `WHERE`. Same idiom as the
  homepage sponsored sort.

- **Concern:** Plan's operation handler pseudo-code reads
  `handler: async (db) => ({...})` — but `defineOperation` handlers in this
  codebase take `(db, ctx, input)` (see
  `apps/web/src/server/operations/community.ts:107`). The `input` argument
  is required to read `withinDays` off the query.
  **Decision:** Use the canonical `(db, ctx, input)` signature throughout
  this feature.

- **Concern:** Plan's service pseudo-code reads
  `subscriptionFollowups.create(db, { actorId, subscriptionId, ... })`.
  Existing services take `(db, ctx: CallerContext, args)` and derive
  `actorId` from `ctx.userId` internally — see `community/service.ts:706`
  (`deletePost`).
  **Decision:** Match the existing convention. Service signature is
  `create(db, ctx, args)`; the service derives `actorId = ctx.userId`.

- **Concern:** Plan's audit-around-mutation reference is to the locked
  2026-06-14 pattern, which works for SELECT-then-DELETE (community
  `deletePost`) but is awkward for INSERTs because there's no id until
  after the insert. The plan didn't specify the ordering.
  **Decision:** Pre-generate the followup row's id with
  `crypto.randomUUID()` at the top of the service function. Open the
  transaction. Inside the transaction: write the audit row first
  (audit-before-mutation), then `INSERT` with the same pre-generated id.
  Either both write or neither writes; ordering matches the locked
  convention.

- **Concern:** Plan's UI section calls for a WhatsApp deep-link in the
  queue row but the planned query shape doesn't include
  `businesses.whatsapp_number`. The column exists
  (`packages/db/src/schema/businesses.ts:64`).
  **Decision:** Add `whatsapp_number` to the `listQueue` select shape,
  surface it on `QueueRow`, render it conditionally in the table action
  cluster (icon disabled when null, per the existing `/admin/businesses`
  pattern).

- **Concern:** Plan doesn't specify where "Renewals" lands in the
  admin sidebar `ADMIN_NAV` array. Current order:
  Dashboard · Businesses · Categories · Cities · Membership plans ·
  Sponsorship tiers · Community · Settings · Users · Audit log · Cron.
  Inserting at the end clusters it with internal-tooling rows
  (Users/Audit/Cron); inserting near Businesses signals "this is a
  business-flow tool".
  **Decision:** Insert as item 2 — directly after "Businesses", before
  "Categories". Reads as "Businesses → Renewals → Categories" — the
  natural admin workflow.

### Suggestions (taken or deferred)

- **Audit table cosmetic.** Until F22 polish lands, the new
  `business.subscription_followup` variant will render as raw JSON in the
  audit table. Acceptable — F22 will add a readable case when it lands.
- **Mobile API headers.** The new POST route should call
  `clientFromHeaders(req.headers)` and pass `client` through to the
  followup service so the audit row's `client` field is populated. Same
  pattern as community admin moderation. Folded into Task 7.
- **Existing CSV button text.** Plan keeps the CSV button as-is. No
  copy change needed — the button label "Download CSV" already
  describes the action correctly.

---

## Decisions locked

Net new decisions made during review (resolving the plan's six open questions):

1. **Cascade on subscription delete.** `subscription_followup` rows
   cascade-delete with their parent `business_subscription` (matches the
   cascade pattern elsewhere; audit rows preserve outcome history
   independently and are unaffected).
2. **Note required only for `called`.** Other outcomes leave the note
   optional. `called` is the only outcome whose note IS the value of
   the call.
3. **`scheduleDays` upper bound = 60.** Beyond 60 days the subscription
   has almost certainly already expired; the cap prevents typos like
   "600". 60 days is two billing cycles for the longest current plan
   terms.
4. **Queue default `withinDays = 30`.** Matches the longest existing
   `RenewingFilter` chip. Decoupling from `app_setting.reminder_schedule`
   keeps the queue feature self-contained — reading from F17's setting
   would couple two features for marginal benefit.
5. **Sidebar placement = item 2** (between Businesses and Categories).
   See concern above.
6. **Single action string + outcome-in-metadata.** The `audit_log.action`
   for every variant is `business.subscription_followup`; the outcome
   lives in `metadata.outcome`. Matches the
   `session.revoked.reason` precedent (one action kind, reason inside
   metadata).

---

## Implementation plan

Ordered tasks for `/mlabs-code` to execute top-to-bottom. Each task is atomic
(reviewable as a single commit). The ordering keeps the codebase building
after every step.

### Task 1: Schema — add `subscription_followup` table + `followup_outcome` enum

- **Files:** `packages/db/src/schema/subscription-followups.ts` (new) ·
  `packages/db/src/schema/index.ts` (edit — re-export) ·
  `packages/db/drizzle/migrations/<timestamp>_subscription_followup.sql` (new — generated)
- **What:** Add the Drizzle schema for the followup table per the plan's
  shape (id PK, subscription_id FK + CASCADE, actor_id FK + SET NULL,
  outcome enum, note text, scheduled_next timestamp, created_at timestamp
  default now). Add the two indexes: `(subscription_id, created_at DESC)`
  and the partial `WHERE scheduled_next IS NOT NULL` index. Run
  `pnpm db:generate` to materialize the migration.
- **Acceptance:** `pnpm db:migrate` applies the generated migration cleanly
  against a fresh branch; `\d subscription_followup` shows the columns,
  enum, FKs, and indexes; `pnpm typecheck` passes.
- **Pause if:** the migration generator would touch any existing table or
  drop any column — the migration must be strictly additive.

### Task 2: AuditMeta — add `business.subscription_followup` variant

- **Files:** `packages/db/src/audit.ts` (edit)
- **What:** Extend the `AuditMeta` discriminated union with
  `{ kind: "business.subscription_followup"; outcome: "called" | "voicemail"
  | "no_answer" | "refused" | "paid" | "reschedule"; note: string | null;
  scheduled_next: string | null }`. Add the explanatory comment block above
  the variant (matching the existing comment style for
  `community.post_deleted`).
- **Acceptance:** `pnpm typecheck` passes; the union member appears in
  every exhaustive `switch (kind)` consumer (today: none — `audit-table.tsx`
  renders raw JSON).

### Task 3: Validators — followup schemas + subpath export

- **Files:** `packages/validators/src/subscription-followups.ts` (new) ·
  `packages/validators/src/index.ts` (edit — re-export) ·
  `packages/validators/package.json` (edit — `./subscription-followups`
  subpath export)
- **What:** Define `FollowupOutcomeSchema` (z.enum of the six values),
  `FollowupRowSchema`, `CreateFollowupInputSchema` (subscriptionId,
  outcome, optional note, optional scheduleDays). Use `.superRefine` to
  enforce: `outcome === "reschedule"` requires `scheduleDays`
  (1–60); `outcome !== "reschedule"` rejects `scheduleDays`;
  `outcome === "called"` requires a non-empty `note`. Add
  `FollowupQueueOutputSchema` for the GET response and the QueueRow shape.
- **Acceptance:** `pnpm --filter @aira/validators typecheck` passes;
  `FollowupOutcomeSchema.parse("called")` succeeds and `parse("called",
  { note: "" })` fails with the friendly message; a sample
  `CreateFollowupInputSchema.safeParse({ outcome: "reschedule" })` returns
  the expected error.

### Task 4: Service — `listQueue` + `listForSubscription` queries

- **Files:** `packages/services/src/subscription-followups/index.ts` (new) ·
  `packages/services/src/subscription-followups/queries.ts` (new) ·
  `packages/services/src/index.ts` (edit — `export * as
  subscriptionFollowups from "./subscription-followups"`)
- **What:** Implement `listQueue(db, { withinDays })` using **correlated
  subqueries** (per Concern decision) for `last_outcome`,
  `last_followup_at`, `scheduled_next`. The `WHERE` excludes subscriptions
  whose latest followup has `outcome = 'paid'` or `scheduled_next > now()`.
  Join `businesses` for `name`, `phone`, `whatsapp_number`, and
  `membership_plans` for `plan_name`. Sort overdue-first then end_date asc.
  Implement `listForSubscription(db, { subscriptionId })` returning the
  followup history (newest first) for the modal's recent-history panel.
  Cap the queue result at 100 rows with a `total_count` correlated
  subquery for the "showing 100 of N" hint.
- **Acceptance:** Calling `listQueue(db, { withinDays: 30 })` against a
  seeded fixture with three subscriptions (overdue, due-in-5-days,
  due-in-25-days) returns all three in `overdue → 5d → 25d` order; a
  followup with `outcome: 'paid'` excludes that subscription; a followup
  with `scheduled_next = now() + 3 days` excludes it for now and
  re-includes it after we manually advance the timestamp. `pnpm
  typecheck` passes.
- **Pause if:** Drizzle's query builder rejects the correlated-subquery
  expression in `.where()` — escalate so we can decide between a raw
  `sql` fragment and a different shape rather than guessing.

### Task 5: Service — `create` mutation (transactional INSERT + audit)

- **Files:** `packages/services/src/subscription-followups/mutations.ts` (new) ·
  `packages/services/src/subscription-followups/index.ts` (edit — re-export)
- **What:** Implement `create(db, ctx: CallerContext, args:
  CreateFollowupInput)`. Generate the row id with `crypto.randomUUID()`
  up front. Open `db.transaction(async (tx) => { … })`. Inside the
  transaction, write the audit row first via
  `createAudit(tx)({ actorId: ctx.userId, action:
  "business.subscription_followup", target: { type: "business_subscription",
  id: args.subscriptionId }, meta: { kind:
  "business.subscription_followup", outcome: args.outcome, note:
  args.note ?? null, scheduled_next: scheduledNext?.toISOString() ?? null
  }, client: ctx.source === "mobile" ? "mobile" : "web" })`. Then
  `INSERT` the followup row with the pre-generated id. Return the new id.
  Compute `scheduledNext = args.scheduleDays ? new Date(Date.now() +
  args.scheduleDays * 86400_000) : null` outside the tx for clarity.
- **Acceptance:** Calling `create(db, ctx, { subscriptionId, outcome:
  "called", note: "Spoke to Asha" })` returns a row id; querying the
  new row + `audit_log` shows both wrote inside the same transaction
  (matching `created_at` timestamps to the second); a fixture where the
  audit insert is forced to throw (mock or fault-injection) leaves
  zero rows in both tables.
- **Pause if:** the locked audit pattern (audit-before-mutation) conflicts
  with FK constraints somehow — confirm before flipping the order.

### Task 6: Operations — `listFollowupQueueOp` + `createFollowupOp`

- **Files:** `apps/web/src/server/operations/subscription-followups.ts` (new)
- **What:** Define both operations with `permission: "admin"`. The list op
  takes `withinDays?: number` (default 30 in the handler, not in the
  validator). The create op takes the `CreateFollowupInputSchema`. Both
  delegate to the new service functions.
- **Acceptance:** `pnpm typecheck` passes; `apiServerFetch(listFollowupQueueOp,
  { input: {} })` compiles end-to-end in a stub RSC.

### Task 7: REST routes — GET queue + POST followup

- **Files:** `apps/web/src/app/api/v1/admin/renewals/queue/route.ts` (new) ·
  `apps/web/src/app/api/v1/admin/renewals/[subscriptionId]/followups/route.ts` (new)
- **What:** Thin handlers that call the ops via the standard
  defineOperation HTTP plumbing. Read query string `withinDays` and pass
  it through. POST reads `clientFromHeaders` and surfaces it via the
  operation's ctx (matches existing community admin pattern). Path param
  `subscriptionId` flows through to the input.
- **Acceptance:** `curl` against the GET with an admin session cookie
  returns `{ items: [...] }`; POST with `{ outcome: "voicemail" }`
  returns `{ id: <uuid> }` and `audit_log` shows the row; POST with
  `{ outcome: "reschedule" }` (missing scheduleDays) returns 400 with
  the Zod error pointing at `scheduleDays`.
- **Pause if:** the dynamic `[subscriptionId]` segment doesn't merge into
  the operation's input correctly — defineOperation's auto-merge has
  worked everywhere else, but flag any surprise.

### Task 8: Admin page — `/admin/renewals` + queue table + window chips (read-only)

- **Files:** `apps/web/src/app/admin/renewals/page.tsx` (new) ·
  `apps/web/src/features/admin/renewals/renewal-queue-table.tsx` (new) ·
  `apps/web/src/features/admin/renewals/window-chips.tsx` (new) ·
  `apps/web/src/features/admin/index.ts` (edit — re-export the components if
  any sit outside the page)
- **What:** RSC page that reads `?withinDays=` from `searchParams`, fetches
  via `apiServerFetch(listFollowupQueueOp, { input: { withinDays } })`,
  renders the header with summary counts (overdue / due / scheduled),
  the `WindowChips` (7 / 14 / 30 / 60 / 90), and the
  `RenewalQueueTable`. Table columns: business name + tier · plan ·
  payment status chip · end_date relative ("in 5 days" / "OVERDUE 2d" via
  stable-UTC `relativeTime`) · last attempt label (or "—") · phone +
  WhatsApp icon-buttons (with `stopPropagation`, disabled when null) ·
  arrow indicating row is clickable. Row click handler is a no-op in this
  task — placeholder for T9. Empty state when zero rows ("No renewals
  due in the next N days · check back tomorrow"). Include the
  "showing 100 of N" hint when truncated.
- **Acceptance:** Browsing to `/admin/renewals` shows the queue from seeded
  fixtures, sortable as described, chips switch the window without a full
  reload (URL-driven state, `router.push` pattern from `RenewingFilter`);
  `pnpm typecheck` + `pnpm lint` pass; no hydration warnings in console
  (regression check from 2026-06-14).

### Task 9: Followup modal + outcome radio group + sidebar entry

- **Files:** `apps/web/src/features/admin/renewals/followup-modal.tsx` (new) ·
  `apps/web/src/features/admin/renewals/outcome-radio-group.tsx` (new) ·
  `apps/web/src/features/admin/renewals/renewal-queue-table.tsx` (edit —
  wire row click to open the modal) ·
  `apps/web/src/app/admin/_components/admin-sidebar.tsx` (edit — insert
  "Renewals" as item 2)
- **What:** Modal based on the `community/post-detail-modal.tsx`
  pattern (`base-ui/react/dialog`, **no** `Dialog.Trigger render={<Button>}`
  wrapper — that pattern is rejected per the 2026-06-09 decision). Left
  pane: subscription detail (business contact card + recent followup
  history fetched lazily via `listForSubscription` when the modal opens).
  Right pane: `OutcomeRadioGroup` (six radios), optional/required note
  textarea (label switches based on outcome), conditional
  `scheduleDays` number input revealed when outcome is `reschedule`,
  Save button. On Save, calls `apiClient.post('/api/v1/admin/renewals/<id>/followups', body)`,
  closes on success, calls `router.refresh()`. For "paid" outcome: on
  success, the modal surfaces a "Record payment →" link to
  `/admin/businesses/<business_id>` before auto-closing (admin clicks
  through, or dismisses and stays in the queue). Insert sidebar entry at
  index 1 (between Businesses and Categories), label "Renewals", icon
  `Mail` or `PhoneCall` from lucide (settle in code — both fit; the
  pattern is one icon per item).
- **Acceptance:** Click a row → modal opens with detail + form; submit
  `{ outcome: "called", note: "Spoke to Asha" }` → toast, modal closes,
  row drops from the table; submit `{ outcome: "reschedule",
  scheduleDays: 7 }` → row disappears, reappears tomorrow after manual
  timestamp advance (or now+8 days); submit `{ outcome: "paid" }` → modal
  shows the deep-link before closing; the sidebar entry appears in
  position 2 and the `aria-current="page"` highlight works.
- **Pause if:** the `base-ui` modal exhibits the click-race flake we
  hit on 2026-06-09 — don't try to wrap a Trigger; control `open` state
  directly (the pattern from `community/post-detail-modal.tsx` already
  avoids this trap).

---

## Open questions

Anything still unresolved that `/mlabs-code` should escalate, not guess.

None — all six of the plan's open questions are resolved in **Decisions
locked** above. If `/mlabs-code` discovers a new question during
implementation (e.g. the correlated subquery doesn't compose with the
Drizzle `.orderBy()` shape exactly), the per-task **Pause if** triggers
will catch it.
