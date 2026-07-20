# Review: Admin edit sponsorship + payment evidence upload

**Date:** 2026-07-20
**Slug:** 2026-07-20-admin-edit-sponsorship
**Plan reviewed:** [2026-07-20-admin-edit-sponsorship.md](../plans/2026-07-20-admin-edit-sponsorship.md)
**Status:** approved
**UI-Significant:** no
**Reviewer:** framer@millionlabs.co.uk

---

## Summary

Approved. The plan lands cleanly on top of infrastructure that already
exists (`updateSponsorshipOp`, PATCH route, `updateSponsorship` service),
and the schema change is a single nullable column add. Four open
questions from the plan were resolved during review; one plan claim
("parity with Subscriptions" for inline evidence upload) was corrected —
subscriptions today only support upload *inside* the Add dialog, so this
work is an evolution of that pattern rather than a mirror of it. The
divergence is deliberate: inline dropzone in the Evidence column
matches the QA feedback verbatim ("add an option to upload payment
evidence") and doesn't force admins into a full Edit flow just to
attach a file.

## Findings

### Blockers

- None.

### Concerns (raised, decided, recorded)

- **Concern:** The plan claims the inline dropzone-in-table gives
  "parity with Subscriptions", but `subscriptions-section.tsx` line
  172–186 shows the Evidence column is display-only — the dropzone
  lives inside `AddSubscriptionDialog` (line 274–284) and only fires
  during Create. There is no post-hoc evidence upload for subscriptions
  today.
  **Decision:** Diverge deliberately. Sponsorship evidence uploads via
  an **inline dropzone in the Evidence column** (drag/drop + click),
  because the QA request is specifically to enable post-hoc uploads.
  A "View" link replaces the dropzone once evidence is present. This
  diverges from the subscription UX; the divergence is called out here
  so it isn't misread as inconsistency during code review. If we later
  want the same post-hoc capability on subscriptions, follow this
  pattern; a follow-up TODO is filed.

- **Concern:** `updateSponsorshipOp` doesn't emit an audit row today,
  unlike `createSponsorshipOp` and `cancelSponsorshipOp`. Any edit
  performed via the new UI would silently miss the audit trail.
  **Decision:** Add `business.sponsorship_updated` audit emission
  inside `updateSponsorshipOp`. Because the op's input doesn't include
  `business_id`, the op must first `getSponsorshipById(spId)` to
  resolve the target, then `audit()` before the mutation (matches the
  audit-before-mutate pattern used elsewhere).

- **Concern:** Which fields on the sponsorship the audit meta should
  capture (tier change? dates? notes? a diff?). Recording a diff adds
  complexity; not recording it loses signal.
  **Decision:** MVP records **only the fact of the update** — no diff
  payload. Rationale: the closest existing precedent
  (`business.sponsorship_assigned`) records the initial tier/end_date/
  amount but no history. Recording a full diff is a follow-up if
  auditors ask.

- **Concern:** Editing dates on an `expired` row won't re-activate it
  until the daily cron runs — an admin fixing a typo might not
  understand why status stays "Expired" for up to 24h.
  **Decision:** Hide the Edit button on `expired` and `cancelled` rows
  entirely (matches plan). The correction flow for a wrongly-expired
  row becomes: Cancel + Add. The alternative — a manual "recompute
  status now" button — is a follow-up if this becomes a real pain
  point.

- **Concern:** `end_date >= start_date` is enforced by the DB CHECK
  but not by the Zod input schema (no `.refine()` cross-check). An
  inverted-date PATCH will 400 from the DB with a raw constraint
  error rather than a friendly Zod message.
  **Decision:** Accept for MVP. The Add dialog has the same shape
  today and it hasn't been reported as a pain point. A `.refine()`
  cross-check is a follow-up TODO.

### Suggestions (taken or deferred)

- **Taken:** Two audit actions (`business.sponsorship_updated` +
  `business.sponsorship_evidence_uploaded`) rather than one combined,
  matching the existing `assigned` / `cancelled` split.
- **Taken:** Generalize `processAndStoreEvidence` with a `domain`
  parameter (`'subscription' | 'sponsorship'`) rather than duplicating
  the sharp/validation pipeline. Storage key becomes
  `${domain}s/${id}/${uuid}.${ext}`. Subscription call site updates in
  the same task.
- **Taken (plan default):** Amount rendered read-only inside the Edit
  dialog so admins can confirm the row they're editing — reduces
  wrong-row risk. Not editable per prior decision.
- **Deferred:** Cross-field `end_date >= start_date` Zod refinement on
  input schemas — filed to backlog.
- **Deferred:** Post-hoc evidence upload on subscriptions (mirror the
  sponsorship pattern) — filed to backlog.
- **Deferred:** Manual "recompute status now" button — filed to
  backlog; add if the wrongly-expired case becomes real.
- **Deferred:** Diff-capturing audit payload for
  `business.sponsorship_updated` — filed to backlog.

## Decisions locked

- Inline dropzone in the Evidence column; "View" link replaces it when
  populated.
- Two audit actions (updated + evidence_uploaded).
- `processAndStoreEvidence` generalized with `domain` param; subscription
  call site migrated in the same commit.
- Locked-amount displayed in the Edit dialog for row confirmation.
- Edit button hidden on `expired` and `cancelled` rows.
- Update op resolves `business_id` via `getSponsorshipById` before
  emitting audit.

## Implementation plan

Ordered tasks for `/mstack-code` to execute top-to-bottom. Each task is
atomic (reviewable as a single commit).

### Task 1: Schema + migration for `sponsorship.payment_evidence_url`

- **Files:** `packages/db/src/schema/sponsorships.ts` (edit) ·
  `packages/db/drizzle/migrations/00XX_*.sql` (new — generated)
- **What:** Add a nullable `payment_evidence_url text` column to the
  `sponsorship` table. Run `pnpm db:generate` to produce a single
  ADD-COLUMN migration, then `pnpm --filter @aira/db migrate` locally
  so the dev DB is caught up before commit (per
  `.claude/memory/replit-db-migration-trap.md` — otherwise Publish will
  diff dev-behind-prod and propose a DROP COLUMN).
- **Acceptance:** Generated migration touches only `sponsorship` and
  only adds `payment_evidence_url`; `pnpm --filter @aira/db migrate`
  exits 0; `psql "$DATABASE_URL" -c "SELECT payment_evidence_url FROM
  sponsorship LIMIT 1"` returns a NULL column (not an error).
- **Pause if:** The generated migration includes any operation other
  than a pure ADD COLUMN on `sponsorship` (e.g., a rename, drop, or
  type change on any table). That means schema drift somewhere else
  and needs a human.

### Task 2: Extend sponsorship Zod schemas

- **Files:** `packages/validators/src/sponsorships.ts` (edit)
- **What:** Add `payment_evidence_url: z.string().nullable()` to
  `SponsorshipSchema` so read paths surface it. Add
  `payment_evidence_url: z.string().min(1).nullable().optional()` to
  `SponsorshipUpdateInputSchema` so PATCH callers can set or clear it.
  Use `.min(1)`, not `.url()` — the storage driver returns relative
  `/api/storage/...` paths and `.url()` would reject them (see
  `.claude/memory/storage-driver-relative-urls.md`, commit 3aa520f).
  `SponsorshipListItemSchema` extends `SponsorshipSchema.extend(...)`
  so it inherits the field automatically.
- **Acceptance:** `pnpm typecheck` passes; a quick Zod parse of a
  fixture object with `payment_evidence_url: "/api/storage/foo/bar.jpg"`
  passes and one with `""` fails.

### Task 3: Add sponsorship audit variants + render cases

- **Files:** `packages/validators/src/audit-meta.ts` (edit) ·
  `apps/web/src/features/admin/audit/render-detail.tsx` (edit)
- **What:** Append two variants to the `AuditMeta` union:
  `{ kind: "business.sponsorship_updated" }` and
  `{ kind: "business.sponsorship_evidence_uploaded" }`. Append matching
  string literals to `KNOWN_AUDIT_ACTIONS` and to the display-label map
  (labels: "Sponsorship updated", "Sponsorship evidence uploaded").
  Add two switch cases in `render-detail.tsx` returning fragments like
  `<>Updated sponsorship</>` and `<>Uploaded sponsorship evidence</>`.
- **Acceptance:** `pnpm typecheck` passes (the `_ActionsCoverage` and
  render-detail exhaustiveness gates would fail otherwise).

### Task 4: Project `payment_evidence_url` in the read mapper

- **Files:** `packages/services/src/sponsorships/queries.ts` (edit)
- **What:** Extend `toSponsorship` to include `payment_evidence_url:
  row.payment_evidence_url ?? null`. `updateSponsorship`'s existing
  `...rest` spread already carries the field through on write, so
  `service.ts` needs no change.
- **Acceptance:** `pnpm typecheck` passes; the field is present on
  `Sponsorship` at both read and update boundaries.

### Task 5: Emit `business.sponsorship_updated` audit in the op

- **Files:** `apps/web/src/server/operations/sponsorships.ts` (edit)
- **What:** In `updateSponsorshipOp`, resolve the sponsorship via
  `spService.getSponsorshipById(db, input.id)` first. If null, throw
  `ApiError.notFound("sponsorship.not_found", ...)`. Otherwise, emit
  `createAudit(db)({ actorId: ctx.userId, action:
  "business.sponsorship_updated", target: { type: "business", id:
  sp.business_id }, meta: { kind: "business.sponsorship_updated" } })`
  **before** the mutation (matches the audit-before-mutate pattern
  used by `createSponsorshipOp`). Then call
  `spService.updateSponsorship(db, input)` as today.
- **Acceptance:** Manually PATCH a sponsorship's notes via
  `curl` (or via the UI in the next task) and confirm a new
  `audit_log` row appears with `action = 'business.sponsorship_updated'`
  and the correct `target_id`.

### Task 6: Generalize `processAndStoreEvidence` with a `domain` param

- **Files:** `apps/web/src/features/admin/server/evidence-pipeline.ts`
  (edit) · `apps/web/src/app/api/v1/admin/businesses/[id]/subscriptions/[subId]/evidence/route.ts`
  (edit)
- **What:** Change the pipeline signature from
  `{ subscriptionId, bytes, contentType }` to
  `{ domain: "subscription" | "sponsorship", id, bytes, contentType }`.
  Storage key becomes
  `` `${domain}s/${id}/${crypto.randomUUID()}.${ext}` `` (e.g.
  `subscriptions/…`, `sponsorships/…`). Note the pluralization — the
  previous prefix was `business-subscriptions/`; the new plural is
  simpler and future-proof but changes where new subscription uploads
  land. Existing subscription evidence files remain reachable via their
  stored URL (they're just in the old prefix). Update the subscription
  route to pass `domain: "subscription"` and rename `subscriptionId` →
  `id` at the call site. Update the log's `subscriptionId` field to
  `{ domain, id }` for parity.
- **Acceptance:** `pnpm typecheck` passes; uploading a fresh evidence
  file on a subscription via the existing Add dialog still succeeds
  and the returned URL points under `/api/storage/subscriptions/`.
- **Pause if:** Any downstream consumer indexes storage keys by the
  literal `business-subscriptions/` prefix (search
  `evidence-pipeline.ts` callers + storage-related utilities before
  changing the prefix). If so, keep the prefix as
  `business-subscriptions/` and only add `sponsorships/` for the new
  domain — a small conditional inside the pipeline.

### Task 7: New evidence upload route for sponsorships

- **Files:** `apps/web/src/app/api/v1/admin/businesses/[id]/sponsorships/[spId]/evidence/route.ts`
  (new)
- **What:** Add a POST handler mirroring the subscription evidence
  route almost 1:1: `requireAdminJSON` → parse multipart → validate
  file present + size ≤ 5 MB → `processAndStoreEvidence({ domain:
  "sponsorship", id: spId, bytes, contentType })` → call
  `spService.updateSponsorship(db, { id: spId, payment_evidence_url:
  url })` → emit `createAudit({ action:
  "business.sponsorship_evidence_uploaded", target: { type:
  "business", id: sponsorship.business_id }, meta: { kind:
  "business.sponsorship_evidence_uploaded" } })` → return
  `{ sponsorship }`. `EvidencePipelineError` → 400 with the pipeline
  code; unhandled → 500 via `ApiError.internal`.
- **Acceptance:** `curl -F file=@sample.jpg -H "cookie: <admin>" -X
  POST http://localhost:3000/api/v1/admin/businesses/<bizId>/sponsorships/<spId>/evidence`
  returns 200 JSON with `{ sponsorship: { payment_evidence_url:
  "/api/storage/sponsorships/<spId>/…" } }`; a new `audit_log` row
  exists with action `business.sponsorship_evidence_uploaded`.
- **Pause if:** The chosen storage prefix (`sponsorships/` vs
  `business-sponsorships/`) hasn't been aligned with Task 6's outcome.

### Task 8: Add/Edit dialog + Edit button + inline Evidence dropzone

- **Files:** `apps/web/src/features/admin/components/sponsorships-section.tsx`
  (edit)
- **What:**
  1. Refactor `AddSponsorshipDialog` → `SponsorshipDialog`: accept an
     optional `sponsorship?: SponsorshipListItem` prop. When present,
     seed state from the row, swap the API call to `apiClient.patch(...)`
     against `/api/v1/admin/businesses/${businessId}/sponsorships/${sp.id}`,
     change the title to "Edit sponsorship" and the submit label to
     "Save changes". Render the Amount as read-only text
     (`${(sp.amount_cents / 100).toFixed(2)}`) inside the dialog so
     admins confirm which row they're editing.
  2. Add an Edit (✎ `Pencil` from `lucide-react`) button to each row
     whose status is `scheduled` or `active`. Opens the dialog with
     the row's sponsorship pre-loaded. `expired` and `cancelled` rows
     get no Edit button (Cancel button too — matches today's behavior).
  3. Add an "Evidence" column between "Period" and the actions column.
     If `sp.payment_evidence_url` is set: render `<a href={url}
     target="_blank" rel="noopener noreferrer" class="text-xs
     text-primary hover:underline">View</a>`. Otherwise render an
     inline `useDropzone` cell (drag/drop + click) that accepts
     JPEG/PNG/WebP/PDF, max 5 MB, uploads to the new route via
     `FormData` + `fetch`, and on success calls the existing
     `fetchSponsorships()` to refresh + `router.refresh()`. Show
     per-row inline error text on failure (`evidence.too_large`,
     `evidence.invalid_mime`, generic).
- **Acceptance:**
  - Non-editable rows (expired/cancelled) show only the status/tier/
    amount/period/evidence cells, no action buttons.
  - Editable rows show ✎ and ⨯; ✎ opens the dialog pre-filled.
  - PATCH from Save updates only the changed fields (client sends the
    full editable set; op handles partials).
  - Empty Evidence cell renders a dropzone; drag or click uploads to
    the new endpoint; row re-fetches on success; oversized/invalid
    files surface inline errors.
  - `pnpm typecheck` + `pnpm lint` pass.
- **Pause if:** Any planned edit implies changes outside this file
  (e.g., a new shared dropzone component would live under
  `apps/web/src/features/admin/components/`).

## Open questions

None left blocking — all four plan-level questions were resolved during
review. Follow-ups (deferred audit-diff, cross-field date refinement,
subscription post-hoc upload parity, manual-recompute button) are
captured in the backlog, not left as open questions on this plan.
