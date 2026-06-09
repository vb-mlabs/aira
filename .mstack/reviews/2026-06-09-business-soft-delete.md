# Review: Soft-delete + restore for businesses (F13 partial)

**Date:** 2026-06-09
**Slug:** 2026-06-09-business-soft-delete
**Plan reviewed:** [2026-06-09-business-soft-delete.md](../plans/2026-06-09-business-soft-delete.md)
**Status:** approved
**UI-Significant:** yes
**Reviewer:** /mlabs-review

---

## Summary

Plan is ready to implement after three corrections that align it with
the existing audit convention in this codebase (audit-before-mutation,
not in-transaction; ctx threading; typed AuditMeta extension). The
partial index pattern, the new admin op (`listAllBusinessesAdminOp`),
the alert-dialog primitive, the pre-existing `/admin/businesses`
no-filter bug fix folded in — all sound calls.

## Findings

### Blockers (must fix before /mlabs-code)

_none_

### Concerns (raised, decided, recorded)

- **Concern:** Plan pseudocode wraps the archive/restore mutation +
  audit insert in `db.transaction`. The codebase convention (see
  `packages/services/src/admin/service.ts` `changeUserRole`, `banUser`,
  `unbanUser`, `notifyUser`, and the `audit_log.ts` schema comment)
  is: call `audit({...})` first; if it succeeds, do the mutation.
  This means "audit succeeded but mutation failed" → phantom audit
  entry; the convention explicitly accepts that trade for "mutation
  succeeded but audit failed → no trail" (worse) impossibility.
  **Decision:** Follow the existing convention. No transactions.
  `archiveBusiness` / `restoreBusiness` call `audit()` first, then
  the update. Documented in the affected task's notes.

- **Concern:** Plan signature is `archiveBusiness(db, id, actorId)`.
  Existing mutations take `ctx`:
  `changeUserRole(db, ctx, targetId, role)`. The `ctx` carries
  `userId` (for `actorId`) and is required by `auditClient(ctx)` to
  derive web vs mobile.
  **Decision:** `archiveBusiness(db, ctx, id)` and
  `restoreBusiness(db, ctx, id)`. The op handler passes `ctx`
  through unchanged.

- **Concern:** AuditMeta is a typed discriminated union in
  `packages/db/src/audit.ts` with a strict "no free-form strings"
  policy (anonymize-in-place GDPR safety). The plan said "audit
  with `action: business.archived`" but didn't flag that adding
  these requires extending `AuditMeta` with two new variants.
  **Decision:** Add to `AuditMeta`:
  - `{ kind: "business.archived" }`
  - `{ kind: "business.restored" }`
  Just `kind`, no extra fields — the action + target_id (business.id)
  + actor_id capture the full story; live business joins surface the
  name on-demand.

### Suggestions (taken or deferred)

- **Taken:** Separate `listAllBusinessesAdminOp` instead of widening
  the public `listBusinessesOp` with admin-conditional behavior. Keeps
  user-permission and admin-permission ops separate (matches
  `businesses.ts` vs `businesses-admin.ts` convention).
- **Taken:** Partial index `businesses_active_idx ON (category, tier)
  WHERE deleted_at IS NULL` so public reads don't scan archived rows.
- **Taken:** `getBusinessById` keeps the filter (returns null for
  archived). Public deep-link → existing `notFound()` flow. No new
  admin-flavor "bypass" param — instead a new
  `getBusinessByIdIncludingArchived` for the admin edit page (so it
  can load + edit archived rows).
- **Taken:** `updateBusiness` does NOT block edits on archived rows.
  Admin can clean up fields before restoring (plan's default).
- **Taken:** `?archived=1` URL param drives the admin list toggle;
  default off. Mirrors the `?q=`/`?page=`/`?verified=1` pattern from
  the listings work.
- **Taken:** `@base-ui/react/alert-dialog` for confirmation — no new
  dep, primitive already imported via `Button`.
- **Deferred (out of scope, called out):** Hard-purge cron is S5 (F14).
  Bulk archive/restore. Mobile parity. `audit_log` filter UI for
  archive actions.

## Decisions locked

Net new decisions made during review (beyond what was in the plan):

- **Audit-before-mutation, no transaction wrapping.** Match the
  existing pattern in `packages/services/src/admin/service.ts`.
- **`ctx` threading on archive/restore.** Service signature is
  `(db, ctx, id)`; op handler passes `ctx` straight through; service
  derives `actorId = ctx.userId` and `client = auditClient(ctx)`.
- **AuditMeta extended with `business.archived` + `business.restored`
  variants (`kind` only)**. No `name` or `tier` capture.
- **`getBusinessByIdIncludingArchived` is a new service function**
  rather than a `{ includeArchived: true }` param on the existing
  `getBusinessById`. Smaller blast radius — current call sites stay
  unchanged.

## Implementation plan

Ordered tasks for `/mlabs-code` to execute top-to-bottom. Each is
atomic.

### Task 1: Add deleted_at column + partial index

- **Files:** `packages/db/src/schema/businesses.ts` (edit) ·
  `packages/db/drizzle/migrations/0015_*.sql` (generated)
- **What:**
  - Add `deleted_at: timestamp("deleted_at")` to the column list
  - Add `index("businesses_active_idx").on(table.category,
    table.tier).where(sql\`${table.deleted_at} IS NULL\`)` to the
    table-callback array (after the existing indexes; need to import
    `sql` from `drizzle-orm`)
  - Run `pnpm db:generate`; verify migration is `ALTER TABLE …
    ADD COLUMN deleted_at timestamp` + `CREATE INDEX …
    businesses_active_idx … WHERE deleted_at IS NULL`. No data
    rewrites.
  - Run `pnpm db:migrate` to apply.
- **Acceptance:** Migration applied; `\d businesses` shows the column
  + index in psql. `pnpm typecheck` clean.
- **Pause if:** generator produces anything beyond the additive ADD
  COLUMN + CREATE INDEX (e.g. table rebuild, drops of other
  indexes).

### Task 2: Extend AuditMeta union with archive/restore variants

- **Files:** `packages/db/src/audit.ts` (edit)
- **What:**
  - Add to the `AuditMeta` union (alphabetical placement is fine,
    near other domain entries):
    ```ts
    | { kind: "business.archived" }
    | { kind: "business.restored" }
    ```
- **Acceptance:** `pnpm typecheck` clean. `AuditMeta["kind"]` now
  includes both new strings, so the `action` argument to `audit()`
  accepts them.
- **Pause if:** any other field is being added beyond these two
  variants (the typed-allowlist contract is sensitive — confirm
  before extending further).

### Task 3: Widen Business validator with deleted_at + add admin schemas

- **Files:** `packages/validators/src/businesses.ts` (edit)
- **What:**
  - Add `deleted_at: z.string().nullable()` to `BusinessSchema`
  - Add new schemas:
    ```ts
    export const BusinessArchiveInputSchema = z.object({ id: z.string().min(1) }).strict();
    export type BusinessArchiveInput = z.infer<typeof BusinessArchiveInputSchema>;
    export const BusinessRestoreInputSchema = z.object({ id: z.string().min(1) }).strict();
    export type BusinessRestoreInput = z.infer<typeof BusinessRestoreInputSchema>;
    ```
  - Reuse `BusinessUpdateOutputSchema` for both archive and restore
    output (returns `{ business }`)
  - Add `includeArchived: z.coerce.boolean().optional()` to
    `BusinessListInputSchema` (will be honored by the admin op only;
    public op ignores it)
- **Acceptance:** `pnpm typecheck` clean. Business type now includes
  `deleted_at: string | null`.

### Task 4: Filter archived in public queries + thread deleted_at in mapper

- **Files:** `packages/services/src/businesses/queries.ts` (edit) ·
  `packages/services/src/businesses/index.ts` (edit re-export)
- **What:**
  - Import `isNull` from `drizzle-orm` if not already
  - Add `isNull(businesses.deleted_at)` to every public WHERE
    predicate:
    - `getFeaturedBusinesses` — `inArray(...)` + `isNull(deleted_at)` via `and(...)`
    - `getBusinessesByCategory` — `eq(category) + isNull(deleted_at)` via `and(...)`
    - `getBusinessesByCategoryPaged` — add `isNull(deleted_at)` to the
      `predicates` array (covers both items + COUNT in one go)
    - `getBusinessById` — `eq(id) + isNull(deleted_at)` via `and(...)`
  - In `toBusiness()`, add:
    `deleted_at: row.deleted_at ? row.deleted_at.toISOString() : null`
    (same shape as `created_at`/`updated_at`)
  - Add a new exported function `getBusinessByIdIncludingArchived(db,
    id)` that does NOT filter on `deleted_at`. Re-export from
    `index.ts`.
  - Add a new exported function `getAllBusinesses(db, { includeArchived })`:
    `WHERE includeArchived ? TRUE : deleted_at IS NULL`, ordered by
    `TIER_ORDER` then `asc(name)`. Returns `Business[]`. Re-export
    from `index.ts`.
- **Acceptance:** `pnpm typecheck` clean. Existing callers compile.
  Direct verification: `getBusinessesByCategory(db, "restaurants")`
  with a DB row marked `deleted_at = now()` excludes that row.

### Task 5: Add archiveBusiness + restoreBusiness service mutations

- **Files:** `packages/services/src/businesses/service.ts` (edit) ·
  `packages/services/src/businesses/index.ts` (edit re-export)
- **What:**
  - Import `and`, `eq`, `isNotNull`, `isNull` from `drizzle-orm`,
    `createAudit` from `@aira/db/audit`, `auditClient` (move to a
    shared util) or replicate the small helper from
    `packages/services/src/admin/service.ts`.
  - Add `CallerContext` type import from `@aira/api/context` (or
    wherever `changeUserRole` etc. import it from).
  - `archiveBusiness(db, ctx, id)`:
    1. `const audit = createAudit(db); await audit({ actorId:
       ctx.userId, action: "business.archived", target: { type:
       "business", id }, meta: { kind: "business.archived" }, client:
       auditClient(ctx) })`
    2. `const result = await db.update(businesses).set({ deleted_at:
       new Date() }).where(and(eq(businesses.id, id),
       isNull(businesses.deleted_at))).returning({ id: businesses.id })`
    3. If `result.length === 0` → throw `ApiError.notFound("businesses.not_found", "Business not found or already archived")`
    4. `return getBusinessByIdIncludingArchived(db, id)`
  - `restoreBusiness(db, ctx, id)`: symmetric — `meta: { kind:
    "business.restored" }`, WHERE filter uses `isNotNull(deleted_at)`,
    sets `deleted_at: null`.
  - Re-export both from `index.ts`.
- **Acceptance:** `pnpm typecheck` clean. Unit-style sanity in a
  REPL: archiving an active business stamps `deleted_at`, writes an
  audit row with `action="business.archived"`, and returns the
  archived business. Restoring inverts.
- **Pause if:** importing `auditClient`/`CallerContext` reveals the
  helper needs to be exported from a non-services module — flag for
  reviewer before relocating.

### Task 6: Add archiveBusinessOp + restoreBusinessOp + listAllBusinessesAdminOp

- **Files:** `apps/web/src/server/operations/businesses-admin.ts`
  (edit)
- **What:**
  - Three new ops, all `permission: "admin"`:
    ```ts
    archiveBusinessOp = defineOperation({
      input: BusinessArchiveInputSchema,
      output: BusinessUpdateOutputSchema,
      permission: "admin",
      handler: async (db, ctx, { id }) => {
        const business = await businessesService.archiveBusiness(db, ctx, id)
        if (!business) throw ApiError.notFound(...)
        return { business }
      },
    })
    ```
  - `restoreBusinessOp` symmetric.
  - `listAllBusinessesAdminOp`:
    ```ts
    input: BusinessListInputSchema,   // reused; only includeArchived honored
    output: BusinessListOutputSchema, // reused; metadata synthesized via withFullPageMeta from businesses.ts
    handler: async (db, _ctx, input) => {
      const items = await businessesService.getAllBusinesses(db, {
        includeArchived: input.includeArchived ?? false,
      })
      return { items, total: items.length, page: 1, pageSize: items.length || 1 }
    },
    ```
    Import `withFullPageMeta` from businesses.ts if exported; else
    inline the synth.
- **Acceptance:** `pnpm typecheck` clean.

### Task 7: Add archive/restore POST routes

- **Files:**
  - `apps/web/src/app/api/v1/admin/businesses/[id]/archive/route.ts` (new)
  - `apps/web/src/app/api/v1/admin/businesses/[id]/restore/route.ts` (new)
- **What:**
  ```ts
  // archive/route.ts
  import { archiveBusinessOp } from "@/server/operations/businesses-admin"
  export const runtime = "nodejs"
  export const POST = archiveBusinessOp.runFromRequest
  ```
  Same shape for restore. `id` flows through Zod via path-param
  binding.
- **Acceptance:** `curl -X POST /api/v1/admin/businesses/biz-001/archive`
  with an admin session cookie returns 200 + the archived business.

### Task 8: Switch /admin/businesses page to admin op + status column + toggle

- **Files:** `apps/web/src/app/admin/businesses/page.tsx` (edit)
- **What:**
  - Read `searchParams.archived` → boolean
  - Call `apiServerFetch(listAllBusinessesAdminOp, { input: {
    includeArchived } })` instead of `listBusinessesOp({ input: {} })`
  - Add a new "Status" column to the table — small chip per row:
    Active (success/green token) when `deleted_at === null`,
    Archived (muted bg) otherwise
  - Add a toggle row above the table — labelled "Show archived" —
    rendered as a small `<Link>` that pushes `?archived=1` or removes
    the param. Pattern matches the verified chip on the listings page
    but uses `<Link>` for SSR.
- **Acceptance:**
  - Without `?archived=1`: every active business is listed; no
    tier filtering (regression fix for the no-filter=featured bug)
  - With `?archived=1`: archived rows also appear, with the Archived
    chip
  - `pnpm typecheck` + `pnpm lint` clean

### Task 9: Add ArchiveControl component + render in admin detail header

- **Files:**
  - `apps/web/src/features/admin/components/archive-control.tsx` (new)
  - `apps/web/src/features/admin/components/business-detail.tsx` (edit)
- **What:**
  - `<ArchiveControl business={business} />` is a client component
  - Renders a Button labelled "Archive" when `business.deleted_at ===
    null`, "Restore" otherwise
  - Click opens `@base-ui/react/alert-dialog`:
    - Title: "Archive {business.name}?" / "Restore {business.name}?"
    - Description: short explanation of consequence (archived rows
      disappear from public surfaces; restored rows reappear)
    - Cancel + Confirm buttons
  - On Confirm: `apiClient.post` (or `apiClient.patch` with empty
    body) to `/api/v1/admin/businesses/${business.id}/archive` (or
    `/restore`); on success `router.refresh()`; render the same
    `<StatusLine>` pattern the rest of the form uses
  - In `BusinessAdminDetail`'s `<header>` (next to `business.name`
    h1), insert `<ArchiveControl business={business} />`
  - For archived rows, also render a small muted badge ("Archived")
    next to the name so admin sees the state at a glance
- **Acceptance:**
  - Active business → Archive button visible; click opens dialog;
    Cancel closes with no effect; Confirm → page refreshes → button
    flips to Restore + Archived badge appears
  - Archived business → loads cleanly via the updated detail-page
    fetch (next task)
  - `pnpm typecheck` + `pnpm lint` clean

### Task 10: Switch admin detail page to use getBusinessByIdIncludingArchived

- **Files:** `apps/web/src/app/admin/businesses/[id]/page.tsx` (edit)
  · `apps/web/src/server/operations/businesses-admin.ts` (edit — new
  op `getBusinessByIdAdminOp`)
- **What:**
  - The existing `getBusinessByIdOp` filters archived → admin can't
    load the edit page for archived rows once T4 lands. Add a sibling
    `getBusinessByIdAdminOp` with `permission: "admin"` that calls
    `getBusinessByIdIncludingArchived`.
  - Switch the admin detail page from `getBusinessByIdOp` to the new
    op via `apiServerFetch`.
- **Acceptance:** Navigate to `/admin/businesses/<archived-id>` — page
  loads with the archived business pre-populated and Restore button
  visible. Navigate to `/listings/restaurants/<archived-id>` (public)
  — 404.

### Task 11: API smoke + run report

- **Files:** `.mstack/code/2026-06-09-business-soft-delete/` (new)
- **What:**
  - Temporarily promote e2e user to admin; archive `biz-001`; verify:
    - `POST /api/v1/admin/businesses/biz-001/archive` → 200, returns
      business with `deleted_at` set
    - `GET /api/v1/businesses?category=restaurants` → biz-001 NOT in
      items
    - `GET /api/v1/businesses?featured=true` → biz-001 NOT in items
    - `GET /api/v1/businesses/biz-001` → 404
    - `audit_log` query for the corresponding row: action =
      "business.archived", actor_id = e2e user, target_id =
      "biz-001"
  - Then `POST /api/v1/admin/businesses/biz-001/restore` → 200; GET
    surfaces start returning biz-001 again; second audit_log row
    with action = "business.restored"
  - Double-archive attempt → 404 (idempotent in spirit)
  - Restore biz-001 to clean state, demote e2e user, write
    `api-smoke.md`
- **Acceptance:** All flows pass; report captures the curl output +
  follow-ups.

## Open questions

_none_ — three review concerns settled; five plan open questions
resolved inline (alert-dialog lightweight styling, AuditMeta `kind`-
only, Active/Archived chip colors via success/muted tokens, button
labels stay verb-form, `updateBusiness` allows edits on archived
rows).
