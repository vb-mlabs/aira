# Plan: Admin edit sponsorship + payment evidence upload

**Date:** 2026-07-20
**Slug:** 2026-07-20-admin-edit-sponsorship
**Status:** reviewed
**Author:** framer@millionlabs.co.uk

---

## Problem

QA feedback on the admin listing detail page: once a sponsorship is
attached to a business, admins have no way to correct it. If a date is
mistyped, the wrong tier was picked, or a note needs adding, the only
recourse today is to Cancel and re-Add — which pollutes the sponsorship
history and breaks the audit trail. Separately, sponsorships have no
place to store payment evidence, even though the sibling
`business_subscription` table has had that field since migration 0018.

Who benefits: admin operators doing day-to-day account maintenance.
Success: an Edit control on each editable sponsorship row that opens the
same dialog admins already know from Add, plus an Evidence column with
upload/replace parity with the Subscriptions section.

## Scope

**In:**
- Add a per-row Edit (✎) button on `sponsorships-section.tsx` for
  sponsorships whose `status` is `scheduled` or `active` (cancelled +
  expired rows keep their read-only display).
- Refactor `AddSponsorshipDialog` into an Add/Edit dialog: accepts an
  optional `sponsorship` prop; when present, pre-fills tier, dates, and
  notes; renders as PATCH instead of POST; title flips to "Edit
  sponsorship".
- Editable fields: `tier_id`, `start_date`, `end_date`, `notes`. Amount is
  shown read-only inside the Edit dialog so admins know which row they're
  on but cannot mutate it.
- Add `payment_evidence_url` column to the `sponsorship` table
  (nullable, `TEXT`), matching `business_subscription`.
- New POST route `/api/v1/admin/businesses/[id]/sponsorships/[spId]/evidence`
  that mirrors the subscription evidence pipeline (5 MB max, JPEG/PNG/WebP/PDF
  only, image re-encoded to JPEG@1200px via sharp, stored via the
  existing `storage.upload` driver, URL saved back to the row).
- New Evidence column in the sponsorships table: renders a "View" link
  when populated, an inline dropzone upload otherwise (parity with
  Subscriptions).
- Emit `business.sponsorship_updated` audit rows on successful PATCH and
  `business.sponsorship_evidence_uploaded` on successful upload. Both
  target `{ type: "business", id: businessId }` to match the existing
  create + cancel audit lineage.

**Out (deferred):**
- Editing `amount_cents` (explicit user call — after payment received,
  amount is a financial record, not a typo).
- Editing `status` — cron already manages `scheduled → active → expired`;
  Cancel is the only manual lever and remains as-is.
- Editing `business_id` (moving a sponsorship between businesses is a
  re-create flow).
- Multi-file evidence, evidence versioning, or evidence delete UI (upload
  replaces the URL; the previous storage object stays behind, same as
  subscriptions).
- Bulk edit across sponsorships.
- Renewal / extension shortcut buttons.
- Edit UI on `expired` / `cancelled` rows.

## Approach

Reuse the existing `AddSponsorshipDialog` component as an
Add/Edit modal — add an optional `sponsorship?: SponsorshipListItem` prop.
When present, the dialog seeds state from the row, changes its submit
handler to a `PATCH` against
`/api/v1/admin/businesses/[id]/sponsorships/[spId]`, and switches its
title, submit-button label, and success/error copy accordingly. This is a
diff-minimizing shape — everything from field validation to the "will
feature on: X, Y, Z" helper text carries over — and matches the
Add/Edit-in-one-modal pattern the Subscriptions section already uses.

Nearly all of the server side already exists:
`SponsorshipUpdateInputSchema`, `updateSponsorshipOp`, the `updateSponsorship`
service function, and the `PATCH` handler at
`apps/web/src/app/api/v1/admin/businesses/[id]/sponsorships/[spId]/route.ts`
are live but currently have no UI caller. This plan lights that up. The
one op-level gap is that `updateSponsorshipOp` doesn't emit an audit row
today (unlike `createSponsorshipOp` and `cancelSponsorshipOp`) — closed
here.

For payment evidence, add a nullable `payment_evidence_url` column to
`sponsorship`, extend the display + update Zod schemas (with
`z.string().min(1)`, **not** `z.string().url()` — the Replit storage
driver returns relative `/api/storage/...` paths; commit 3aa520f is the
prior incident on `business_subscription`), and add a POST route that
mirrors the subscription evidence route almost line-for-line. The
existing `processAndStoreEvidence` in
`apps/web/src/features/admin/server/evidence-pipeline.ts` currently
hardcodes the storage key prefix (`business-subscriptions/`); it needs
to be generalized (see Open Questions).

**Alternatives considered:**

- Row-inline expandable form — rejected. Diverges from
  `subscriptions-section.tsx`'s Add-dialog pattern and forces the
  sponsorship table to accommodate a wide form region.
- Dedicated sub-page `/admin/businesses/[id]/sponsorships/[spId]` —
  rejected. Adds a navigation hop, requires new metadata + routing, and
  removes the row-context admins already have from the parent listing
  detail page.
- Making `amount_cents` editable in the same form — rejected per
  scope-owner call. Amount changes post-payment are a financial event,
  not a UI typo fix.

## Data model changes

- `sponsorship` — new nullable `payment_evidence_url TEXT` column.
- Migration: generate via `pnpm db:generate`; expected to produce a
  single `ALTER TABLE sponsorship ADD COLUMN payment_evidence_url text`.
  Apply locally with `pnpm --filter @aira/db migrate` before commit (see
  the `replit-db-migration-trap.md` memory — otherwise Replit's Publish
  will diff dev-behind-prod and propose a `DROP COLUMN`).

## Files to touch

**New:**
- `apps/web/src/app/api/v1/admin/businesses/[id]/sponsorships/[spId]/evidence/route.ts`
  — POST handler; mirrors the subscription evidence route almost 1:1.
- `packages/db/drizzle/migrations/00XX_add_sponsorship_evidence.sql`
  (generated).

**Edit:**
- `packages/db/src/schema/sponsorships.ts` — add `payment_evidence_url` column.
- `packages/validators/src/sponsorships.ts`:
  - Extend `SponsorshipSchema` with `payment_evidence_url: z.string().nullable()`.
  - Extend `SponsorshipUpdateInputSchema` with
    `payment_evidence_url: z.string().min(1).nullable().optional()`.
  - Extend `SponsorshipListItemSchema` accordingly (it re-uses
    `SponsorshipSchema.extend(...)`).
- `packages/validators/src/audit-meta.ts` — add
  `business.sponsorship_updated` and `business.sponsorship_evidence_uploaded`
  variants to the `AuditMeta` union and the `KNOWN_AUDIT_ACTIONS`
  array. The `_ActionsCoverage` compile-time assertion will surface any
  missing spot, including the `render-detail.tsx` switch.
- `packages/services/src/sponsorships/queries.ts` — extend
  `toSponsorship` to project `payment_evidence_url`.
- `packages/services/src/sponsorships/service.ts` —
  `updateSponsorship` already handles arbitrary fields via `...rest`,
  so the new column flows through with no signature change.
- `apps/web/src/server/operations/sponsorships.ts` — add audit emission
  in `updateSponsorshipOp` (currently missing). Route id/spId path params
  cleanly through `runFromRequest`, so no route wiring change needed.
- `apps/web/src/features/admin/server/evidence-pipeline.ts` —
  generalize `processAndStoreEvidence` to accept a `domain` param
  (`"subscription" | "sponsorship"`) so the storage key becomes
  `sponsorships/${id}/…` for sponsorship uploads; keep the existing
  subscription call site working.
- `apps/web/src/features/admin/audit/render-detail.tsx` — add the two
  new switch cases so the `never` default doesn't fail typecheck.
- `apps/web/src/features/admin/components/sponsorships-section.tsx`:
  - Refactor `AddSponsorshipDialog` → `SponsorshipDialog` (Add/Edit).
  - Add Edit (✎) button to each `scheduled` / `active` row.
  - Add Evidence table column with `View` link OR dropzone (mirror
    `subscriptions-section.tsx`'s dropzone wiring, `useDropzone` +
    `apiClient.post` to the new evidence route).

## Edge cases

- **Edit on cancelled/expired** — hide the ✎ button; the row is
  read-only.
- **Date change that would re-activate an expired sponsorship** — trust
  the cron. Extending an `expired` row past today doesn't auto-flip its
  status; the daily `transitionSponsorshipsToActive` will pick it up on
  next run. Document in dialog helper text: "Status is set by the daily
  rollover — moving the dates here won't re-activate the row until then."
- **CHECK constraint `end_date >= start_date`** — UI already validates,
  but the DB constraint will reject inverted dates on the server; the
  Zod input schema doesn't cross-check, so we rely on the DB error
  bubbling as a 400. Acceptable for MVP; a dedicated `.refine()` cross-
  check on the input schema is a follow-up.
- **Concurrent edit by two admins** — last-write-wins via
  `updated_at`'s `$onUpdate`; no advisory lock. Acceptable at this
  volume.
- **Evidence too large / wrong MIME** — reuse `EvidencePipelineError`;
  responses map to `evidence.too_large` / `evidence.invalid_mime`, same
  as subscription — the shared inline error surface handles both.
- **Replacing evidence** — upload overwrites the URL. The prior storage
  object stays behind (same as subscription — no orphan cleanup UI in
  MVP).
- **`payment_evidence_url` on an existing row is a relative
  `/api/storage/...` path** — the validator uses `z.string().min(1)`;
  `<a href>` accepts relative URLs. Do NOT switch to `z.string().url()`
  or the schema will reject valid stored values on read (see the
  `storage-driver-relative-urls.md` memory).

## Acceptance criteria

- [ ] On `/admin/businesses/[id]`, each `scheduled` / `active`
      sponsorship row shows a pencil (✎) Edit action alongside the
      existing Cancel action; `expired` / `cancelled` rows show neither.
- [ ] Clicking Edit opens the sponsorship dialog with the title
      "Edit sponsorship", pre-filled with the row's tier, start date,
      end date, and notes. Amount renders read-only.
- [ ] Saving PATCHes
      `/api/v1/admin/businesses/[id]/sponsorships/[spId]` with only the
      changed fields; the table re-fetches and reflects the updated
      values without a full page reload.
- [ ] Every sponsorship row has an Evidence column that renders either
      a "View" link (opens the stored file in a new tab) or an inline
      dropzone (drag-and-drop or click to upload).
- [ ] Uploading via the dropzone: files > 5 MB are rejected with
      `evidence.too_large`; non-JPEG/PNG/WebP/PDF files are rejected with
      `evidence.invalid_mime`; both surface inline under the row.
- [ ] `pnpm db:generate` produces exactly one migration adding
      `payment_evidence_url` to `sponsorship`; `pnpm --filter @aira/db
      migrate` applies it locally without error.
- [ ] Each successful edit emits a `business.sponsorship_updated` audit
      row (actor = admin, target = business).
- [ ] Each successful evidence upload emits a
      `business.sponsorship_evidence_uploaded` audit row.
- [ ] `pnpm typecheck` and `pnpm lint` pass across the monorepo.

## Open questions

For the reviewer (`/mstack-review`) to resolve before implementation.

- **Audit granularity.** Emit two distinct audit actions
  (`business.sponsorship_updated` + `business.sponsorship_evidence_uploaded`)
  or one combined `business.sponsorship_updated` with a payload
  discriminator? Two actions is easier to grep and matches the
  create/cancel split; one action is fewer entries in the enum.
- **Evidence pipeline generalization.** Prefer (a) add a `domain`
  parameter to `processAndStoreEvidence` and rename its
  `subscriptionId` field to `id`, or (b) leave it and add a sibling
  `processAndStoreSponsorshipEvidence`? (a) is DRY; (b) keeps callers
  self-documenting. Both are ~10 lines apart.
- **Amount read-only display in Edit.** Show it inside the dialog
  as `$500.00 (locked)` so admins recognize the row, or omit it entirely
  and rely on the dialog opening from a specific row's ✎? Recommend
  showing it locked — reduces "wrong-row" risk.
- **Date-change → status refresh.** Any need for a manual "recompute
  status now" button, or do we leave that to the daily cron? Recommend
  leaving to cron for MVP.
