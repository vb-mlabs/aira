# Review: Admin waitlist page

**Date:** 2026-06-27
**Slug:** 2026-06-27-admin-waitlist-page
**Plan reviewed:** [2026-06-27-admin-waitlist-page.md](../plans/2026-06-27-admin-waitlist-page.md)
**Status:** approved
**UI-Significant:** yes
**Reviewer:** vb-mlabs

---

## Summary

The plan is sound — it follows the established RSC-page + op + service +
`/api/v1/admin/*` pattern (mirror of `/admin/renewals`) with no new
abstractions or deps. Three corrections were locked during review: (1) extend
the audit registry to include both `waitlist.delete` (action) AND `waitlist`
(target_type) so the audit-log filter chip works; (2) reshape the delete path
to match `community.deletePost` — snapshot-first, then audit + delete in a
single transaction, so a failed audit rolls back the delete (the documented
convention in `packages/db/src/audit.ts`); (3) correct the DELETE response
contract from 204 to `200 { ok: true }`, since `runFromRequest` always
serialises the op's output via `Response.json`. Open questions resolved with
the "sensible defaults" bundle: `MailPlus` icon, two-tile counts header,
human-mapped source labels, `@base-ui/react/alert-dialog` for confirm.

## Findings

### Concerns (raised, decided, recorded)

- **Concern: Missing `waitlist` in `KNOWN_AUDIT_TARGET_TYPES`.** Plan only
  adds `waitlist.delete` to `KNOWN_AUDIT_ACTIONS`. Without the matching
  target_type, the `/admin/audit` filter dropdown can't filter waitlist
  deletions. `apps/web/src/features/admin/audit/render-target.tsx` has a
  safe default branch so adding nothing wouldn't crash — but the filter
  affordance would be missing.
  **Decision:** Also add `"waitlist"` to `KNOWN_AUDIT_TARGET_TYPES` in
  `packages/validators/src/audit-meta.ts` and add a matching `case
  "waitlist":` in `render-target.tsx` that renders a short hex id (no
  detail page; consistent with `community_post`).

- **Concern: Delete + audit pattern diverges from `community.deletePost`.**
  Plan splits the work — op writes audit, then service.deleteOne removes the
  row. If the delete fails after the audit insert succeeds, we leak a phantom
  audit row claiming a row was removed when it wasn't. The
  `packages/db/src/audit.ts` doc explicitly says "audit-first-then-mutate"
  is the contract AND the established pattern (`community.deletePost`) wraps
  both in a `db.transaction()` so a delete failure rolls back the audit.
  **Decision:** Mirror `community.deletePost`. The service exposes a single
  `deleteWaitlistEntry(db, ctx, { id })` that (a) `SELECT` the row to get
  `email` + `type` for the audit meta, (b) throws
  `ApiError.notFound("waitlist.not_found", "Entry not found.")` if absent,
  (c) wraps `audit + delete` in `db.transaction(async (tx) => …)` using the
  `tx`-scoped `createAudit(tx)`. Op becomes a one-liner that returns
  `{ ok: true as const }`.

- **Concern: Acceptance criterion "DELETE returns 204".** `runFromRequest`
  (packages/api/src/operation.ts:293) always returns `Response.json(result,
  { status: 200 })` — there's no path to 204 without a custom route file
  that skips the op adapter, which would diverge from every other admin
  delete in the repo.
  **Decision:** Correct the criterion. DELETE returns `200 { ok: true }` on
  success, 404 with the locked ApiErrorResponse envelope when the id
  doesn't exist, 401 when unauthenticated.

- **Concern: Open questions left unresolved would force `/mlabs-code` to
  guess (icon, totals header, source label, confirm UX, empty state).**
  **Decision (sensible defaults bundle):**
    - **Sidebar icon:** `MailPlus` (signup-capture feel; already in Lucide).
    - **Totals header:** include — two tiles "Consumer signups" and
      "Business signups" rendered above the tab strip. Backed by a second op
      `getWaitlistCountsOp` (`permission: "admin"`, no input, returns
      `{ consumer: number, business: number }`) so the page makes two
      `apiServerFetch` calls. (Worth it for triage at a glance; mirrors the
      stat-tile pattern on `/admin`.)
    - **Source label:** human map declared inline in the table file —
      `marketing-hero` → "Hero form", `marketing-footer` → "Footer form",
      `business-mailto` → "Mailto link", `business-listing-cta` →
      "Listing CTA".
    - **Delete confirm:** `@base-ui/react/alert-dialog` (matches
      `apps/web/src/features/admin/components/user-detail.tsx`). One
      `<DeleteWaitlistDialog>` component shared by both tables.
    - **Empty state:** "Nothing here yet." (one line, no CTA).

### Suggestions (taken or deferred)

- **Taken — totals query lives in the service, not the op.** Add
  `getCounts(db)` to the new service module so the op handler is a thin
  pass-through. Keeps business logic out of the op layer per
  ADR 0007.
- **Taken — RSC page uses `Promise.all` for the two `apiServerFetch` calls.**
  `[counts, list] = await Promise.all([…])` so the totals header and the
  table data fetch in parallel.
- **Deferred — `mailto:` link on copy email.** Could pre-fill a Subject with
  brand.name. Out of scope; the copy button covers the use case.
- **Deferred — Toast component.** Plan mentions "toast" for delete errors;
  there's no project-wide toast primitive yet. Use a plain `<p
  role="alert">` inline above the table (same as `business-cta-pair.tsx`)
  until a toast pattern lands.

## Decisions locked

- Audit registry gets `waitlist.delete` (action) AND `waitlist`
  (target_type) on the same commit. Compile-time `_ActionsCoverage` parity
  check stays green.
- Service module owns the full delete-with-audit transaction; op is a
  thin adapter.
- DELETE response is `200 { ok: true }`, not 204.
- Page renders a two-tile counts header above the tab strip via a second
  op `getWaitlistCountsOp`.
- Source enum is rendered through a human-label map declared in the table
  file.
- Delete confirm uses `@base-ui/react/alert-dialog`, mirroring
  `user-detail.tsx`.
- No new top-level deps. No DB migration. No env var.

## Implementation plan

Each task is one commit. Tasks 1–4 are pure additions (no UI yet); task 5
adds the page + sidebar entry. Tasks 6–7 wire the row actions; task 8 wires
the audit-log integration. Tasks must run in order — later tasks import
symbols from earlier ones.

### Task 1: Add `waitlist.delete` action + `waitlist` target type to audit registry

- **Files:** `packages/validators/src/audit-meta.ts` (edit)
- **What:** Append `| { kind: "waitlist.delete"; email: string;
  waitlist_type: "consumer" | "business" }` to the `AuditMeta` union, append
  `"waitlist.delete"` to `KNOWN_AUDIT_ACTIONS`, append `"waitlist"` to
  `KNOWN_AUDIT_TARGET_TYPES`. The existing `_ActionsCoverage` assertion
  enforces parity at compile time.
- **Acceptance:** `pnpm typecheck` passes from
  `packages/validators/`. `KNOWN_AUDIT_ACTIONS` includes `"waitlist.delete"`;
  `KNOWN_AUDIT_TARGET_TYPES` includes `"waitlist"`. The `AuditMeta` union
  gains the new variant.

### Task 2: Add admin list/count schemas to validators

- **Files:** `packages/validators/src/waitlist.ts` (edit)
- **What:** Add three exports:
    - `WaitlistAdminListInputSchema` — `z.object({ type:
      WaitlistTypeSchema }).strict()`.
    - `WaitlistAdminListItemSchema` — `z.object({ id, type, email,
      created_at: z.string() /* ISO */, source, full_name: z.string().nullable(),
      business_name: z.string().nullable(), phone: z.string().nullable(),
      preferred_contact: PreferredContactSchema.nullable(),
      preferred_time: PreferredTimeSchema.nullable() })`.
    - `WaitlistAdminListOutputSchema` — `z.object({ items:
      z.array(WaitlistAdminListItemSchema), total: z.number().int().min(0) })`.
    - `WaitlistAdminCountsOutputSchema` — `z.object({ consumer:
      z.number().int().min(0), business: z.number().int().min(0) })`.
- **Acceptance:** `pnpm typecheck` passes from `packages/validators/`. New
  schemas exported from `@aira/validators/waitlist`.

### Task 3: Add waitlist admin service

- **Files:** `packages/services/src/waitlist/service.ts` (new),
  `packages/services/src/waitlist/index.ts` (new),
  `packages/services/src/index.ts` (edit — add re-export)
- **What:** Pure functions on the `waitlist` table.
    - `listAdmin(db, { type }): Promise<{ items, total }>` — selects all
      columns where `type = $type`, orders `created_at DESC`, caps at 100;
      computes `total` with a separate `select({ total: sql<number>\`count(*)::int\` })`
      filtered by the same `type`. Maps `created_at` to ISO string before
      returning.
    - `getCounts(db): Promise<{ consumer, business }>` — single grouped
      query `SELECT type, count(*)::int FROM waitlist GROUP BY type`;
      defaults missing types to 0.
    - `deleteWaitlistEntry(db, ctx: { userId: string; client: AuditClient },
      { id }): Promise<{ ok: true }>` — selects `email`, `type` from row
      first; throws `ApiError.notFound("waitlist.not_found", "Entry not
      found.")` if absent. Wraps `createAudit(tx) + tx.delete(…)` in a
      single `db.transaction(async (tx) => …)`. Audit `action:
      "waitlist.delete"`, `target: { type: "waitlist", id }`, `meta: {
      kind: "waitlist.delete", email, waitlist_type: type }`, `client`
      from ctx. Mirrors `packages/services/src/community/service.ts`
      `deletePost`.
- **Acceptance:** `pnpm typecheck` and `pnpm test --filter @aira/services`
  pass. New service re-exported from `@aira/services` index.
- **Pause if:** the row's `type` value is anything other than `"consumer"`
  or `"business"` at runtime (would mean the DB CHECK is out of sync with
  Zod). Throw a typed error rather than papering over.

### Task 4: Add waitlist admin operations + API routes

- **Files:**
    - `apps/web/src/server/operations/waitlist-admin.ts` (new)
    - `apps/web/src/app/api/v1/admin/waitlist/route.ts` (new)
    - `apps/web/src/app/api/v1/admin/waitlist/[id]/route.ts` (new)
    - `apps/web/src/app/api/v1/admin/waitlist/counts/route.ts` (new)
- **What:** Three ops, all `permission: "admin"`:
    - `listWaitlistOp` — input `WaitlistAdminListInputSchema`, output
      `WaitlistAdminListOutputSchema`, handler delegates to
      `waitlistAdmin.listAdmin(db, { type })`.
    - `getWaitlistCountsOp` — input `z.object({}).strict()`, output
      `WaitlistAdminCountsOutputSchema`, handler delegates to
      `waitlistAdmin.getCounts(db)`.
    - `deleteWaitlistEntryOp` — input `z.object({ id: z.string().min(1)
      }).strict()`, output `z.object({ ok: z.literal(true) })`, handler
      reads `ctx.userId` + client and calls
      `waitlistAdmin.deleteWaitlistEntry(db, { userId, client }, { id })`.
    - Routes wire:
        - `route.ts` → `export const GET = listWaitlistOp.runFromRequest`
        - `[id]/route.ts` → `export const DELETE =
          deleteWaitlistEntryOp.runFromRequest`
        - `counts/route.ts` → `export const GET =
          getWaitlistCountsOp.runFromRequest`
- **Acceptance:**
    - `pnpm typecheck && pnpm lint` pass.
    - `curl -s -i -X GET http://localhost:5000/api/v1/admin/waitlist?type=consumer`
      with an admin cookie returns 200 + `{ items: […], total: N }`.
    - The same without a session returns 401.
    - `DELETE /api/v1/admin/waitlist/<known-id>` returns
      `200 { ok: true }`; `DELETE …/<missing-id>` returns 404 with the
      locked `ApiErrorResponse` envelope.
    - `audit_log` row appears with `action = "waitlist.delete"`,
      `target_type = "waitlist"`, `target_id = <deleted id>`, and the
      `email` + `waitlist_type` populated in `metadata`.
- **Pause if:** the existing `defineOperation` factory in
  `apps/web/src/server/operations/index.ts` does not export the helper
  used by other ops — sometimes the factory diverges from the doc.

### Task 5: Add `/admin/waitlist` page + sidebar entry

- **Files:**
    - `apps/web/src/app/admin/waitlist/page.tsx` (new)
    - `apps/web/src/features/admin/waitlist/waitlist-tabs.tsx` (new — RSC,
      plain `Link`s; mirror `apps/web/src/features/admin/renewals/window-chips.tsx`)
    - `apps/web/src/features/admin/waitlist/waitlist-counts-header.tsx`
      (new — RSC, two `StatTile`-style cards)
    - `apps/web/src/app/admin/_components/admin-sidebar.tsx` (edit — add
      `{ href: "/admin/waitlist", label: "Waitlist", icon: MailPlus,
      requires: "admin" }` between Renewals and Community)
- **What:** RSC page, `dynamic = "force-dynamic"`, metadata title `"Admin ·
  Waitlist"`, calls `requireAdmin()`, parses `searchParams.tab` (whitelist
  `"consumer" | "business"`, default `"consumer"`). Fetches in parallel:
  `apiServerFetch(getWaitlistCountsOp, { input: {} })` and
  `apiServerFetch(listWaitlistOp, { input: { type } })`. Renders:
  `<AdminPageHeader title="Waitlist" subtitle={…} />`,
  `<WaitlistCountsHeader counts={…} />`, `<WaitlistTabs current={type} />`,
  then either `<ConsumerTable …>` or `<BusinessTable …>` (added in Task
  6). Subtitle: `"${items.length} shown · ${total} total"` when items >
  0, `"Nothing here yet."` when 0.
- **Acceptance:**
    - Visiting `/admin/waitlist` as an admin renders the page with the
      counts tiles and the Consumer tab active by default. As a non-admin
      it 404s (`requireAdmin()` calls `notFound()`).
    - Clicking the Business tab changes the URL to `?tab=business` and
      the table rerenders.
    - The new "Waitlist" entry appears in the sidebar between Renewals and
      Community for plain admins (verified with the seeded QA admin
      account).
    - `pnpm typecheck && pnpm lint` pass.

### Task 6: Add consumer + business client tables (no row actions yet)

- **Files:**
    - `apps/web/src/features/admin/waitlist/consumer-table.tsx` (new —
      `"use client"`)
    - `apps/web/src/features/admin/waitlist/business-table.tsx` (new —
      `"use client"`)
    - `apps/web/src/features/admin/waitlist/source-label.ts` (new — exports
      `SOURCE_LABEL: Record<WaitlistSource, string>` map)
- **What:** Pure-presentation tables consuming
  `WaitlistAdminListItemSchema` rows. Same Tailwind table styling as
  `apps/web/src/features/admin/renewals/renewal-queue-table.tsx` (rounded
  `bg-card` panel, `divide-y divide-border`). Consumer columns: Email,
  Source, Signed up. Business columns: Name, Business, Email, Phone,
  Contact pref, Time pref, Source, Signed up. Source rendered via
  `SOURCE_LABEL[row.source] ?? row.source`. `created_at` formatted with
  `Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short"
  })`. No row actions in this task — placeholder `<td>` for the actions
  column. Empty state when `items.length === 0`: one centered "Nothing
  here yet." row.
- **Acceptance:** Both tabs render the data with the correct columns + the
  human source labels + locale-formatted timestamps. Console + page errors
  empty on render.

### Task 7: Add row actions (copy email/phone + delete with confirm)

- **Files:**
    - `apps/web/src/features/admin/waitlist/row-actions.tsx` (new — `"use
      client"`)
    - `apps/web/src/features/admin/waitlist/delete-waitlist-dialog.tsx`
      (new — `"use client"`, `@base-ui/react/alert-dialog`)
    - `apps/web/src/features/admin/waitlist/consumer-table.tsx` (edit —
      wire actions)
    - `apps/web/src/features/admin/waitlist/business-table.tsx` (edit —
      wire actions)
- **What:**
    - `<RowActions row={…}>` exposes a Copy Email button (always) and a
      Copy Phone button (when `row.phone` present), plus a trash-icon
      button that opens the AlertDialog. Copy uses
      `navigator.clipboard.writeText` with a 1.2s "Copied" state on the
      button; fall back to a hidden `<input>` + `document.execCommand`
      branch for the rare insecure-context case (note in code why).
    - `<DeleteWaitlistDialog id email onConfirm>` mirrors the
      AlertDialog structure in `user-detail.tsx`. On confirm calls
      `apiClient.delete("/api/v1/admin/waitlist/" + id)`, then
      `router.refresh()` from `next/navigation` so the RSC re-fetches.
      Errors render inline as `<p role="alert">` above the table; the
      dialog closes either way.
    - Successful delete shows nothing — the table just shortens. Failed
      delete keeps the row and shows the error.
- **Acceptance:**
    - Copy buttons write to clipboard (verified manually; covered by a
      small Playwright spec that monkeypatches `navigator.clipboard`).
    - Clicking trash opens AlertDialog showing the email being removed.
    - Confirming deletes the row and the table refreshes; an `audit_log`
      entry is recorded.
    - Cancelling closes the dialog with no side effects.
    - 404 path: deleting an id that no longer exists shows "Row was
      already removed" inline and refreshes.
- **Pause if:** the project gains a global toast primitive between Task
  5 and Task 7 — prefer the toast over the inline `<p role="alert">`.

### Task 8: Wire `waitlist.delete` into the audit-log renderer

- **Files:**
    - `apps/web/src/features/admin/audit/render-detail.tsx` (edit — add
      `case "waitlist.delete"`)
    - `apps/web/src/features/admin/audit/render-target.tsx` (edit — add
      `case "waitlist"`)
- **What:** `render-detail.tsx` renders the new variant as
  `<>Deleted {m.waitlist_type} waitlist entry (<code>{m.email}</code>)</>`.
  The default `never` branch enforces the case exists at compile time.
  `render-target.tsx` adds a `case "waitlist"` that renders a short hex
  id with no link (no detail page — same approach as
  `community_post`).
- **Acceptance:**
    - `pnpm typecheck` passes (would fail without the new case due to the
      exhaustiveness gate).
    - `/admin/audit` shows the audit row for a deleted waitlist entry
      with a human-readable detail line.
    - The target_type filter dropdown on `/admin/audit` now lists
      "Waitlist" as a filterable option.

### Task 9: End-to-end Playwright happy path

- **Files:**
    - `apps/web/e2e/admin-waitlist.spec.ts` (new)
- **What:** Authed admin Playwright spec that (a) seeds two waitlist rows
  (one consumer, one business) via direct DB insert in `beforeAll`, (b)
  navigates to `/admin/waitlist`, (c) verifies counts tiles match, (d)
  switches to the Business tab and verifies row visibility, (e) clicks
  delete on the business row, confirms in AlertDialog, asserts the row
  is gone after the table refresh, (f) opens `/admin/audit` and
  confirms the new audit row is present. Use the existing QA-admin
  storage state under `.mstack/qa/2026-05-27-1328/.auth/qa-admin.json`
  if available, else the doc'd auth fixture.
- **Acceptance:** Spec passes locally against `localhost:5000`.
- **Pause if:** the QA admin auth fixture is not present at the expected
  path; do not invent a new auth flow — escalate.

## Open questions

None for `/mlabs-code`. All open questions from the plan were resolved in
the "sensible defaults bundle" above. Anything new that surfaces during
implementation (e.g. a global toast primitive lands, or the AlertDialog
import path moves) should pause per Task 7's trigger.
