# Plan: Soft-delete + restore for businesses (F13 partial)

**Date:** 2026-06-09
**Slug:** 2026-06-09-business-soft-delete
**Status:** implemented
**Author:** /mlabs-plan

---

## Problem

Right now the only way an admin can remove a business from the
directory is a destructive `DELETE FROM businesses` via Drizzle Studio
or raw SQL. No undo, no audit trail in-app, no opportunity to recover
from "oh that was the wrong row". For a community-curated directory
the wrong tradeoff — bad listings happen (spam, closed businesses,
duplicates) and removing them should be a safe, single-click action
admins reach for without hesitation.

This plan adds soft-delete: admin clicks Archive on the business edit
page, a confirmation dialog appears, the row's `deleted_at` is stamped,
and the business disappears from every public surface. Admin can flip
the "Show archived" toggle on `/admin/businesses` to see archived rows
and Restore any of them with a click — `deleted_at` is set back to
NULL and the business reappears immediately.

Both beneficiaries:

- **Admins** get a safety net: archive is reversible, the destructive
  feeling disappears, churn becomes routine instead of nerve-wracking.
- **End-users** get a cleaner directory: archived businesses 404 on
  deep-link (cleanly, via the existing notFound flow), don't appear
  in featured, don't appear in category listings, don't appear in
  search results.

**Out-of-band benefit:** fixes a pre-existing bug surfaced during the
listings-pagination review on 2026-06-09: `/admin/businesses` calls
`listBusinessesOp({ input: {} })` which hits the "no-filter = featured"
fallback and only shows tier1+tier2 rows. Folding the fix in here is
natural — the admin list is changing anyway to support the archived
filter.

**Success:** admin opens `/admin/businesses/biz-001`, clicks Archive
in the header, confirms the dialog. The button flips to Restore.
End-user visits `/listings/restaurants` → Spice Garden is gone.
End-user visits `/listings/restaurants/biz-001` directly → 404. Admin
flips "Show archived" on the list → Spice Garden reappears with a
muted "Archived" chip. Admin clicks Restore → confirms → Spice Garden
back on the live directory.

## Scope

**In:**
- New `deleted_at timestamp NULL` column on `businesses`
- Public read queries filter out archived rows:
  `getFeaturedBusinesses`, `getBusinessesByCategory`,
  `getBusinessesByCategoryPaged`, `getBusinessById`
- New service mutations: `archiveBusiness(db, id)`,
  `restoreBusiness(db, id)` — both stamp / clear `deleted_at`,
  return updated `Business`
- New admin ops `archiveBusinessOp`, `restoreBusinessOp`
  (permission: "admin")
- New routes `POST /api/v1/admin/businesses/[id]/archive`,
  `POST /api/v1/admin/businesses/[id]/restore`
- Each mutation writes an `audit_log` entry (`action:
  "business.archived"` / `"business.restored"`, `actor_id`,
  `entity_id`)
- `BusinessSchema.deleted_at: z.string().nullable()` (ISO 8601, same
  as `created_at`)
- `listBusinessesOp` widened with an admin-only `includeArchived`
  input field. When `includeArchived=true`, returns ALL businesses
  (active + archived). When omitted or false, behaves as today
  (public surfaces unchanged).
- Pre-existing bug fix: `/admin/businesses` page calls
  `listBusinessesOp` with an explicit "give me everything active"
  input instead of the current `{}` (which silently hits the
  featured-only fallback).
- Admin list (`/admin/businesses`) UI:
  - New "Status" column showing Active (green chip) / Archived
    (muted chip)
  - "Show archived" toggle (URL-driven via `?archived=1`), default
    off
- Admin detail (`/admin/businesses/[id]`) UI:
  - New Archive / Restore button in the header, right of name
  - Uses `@base-ui/react/alert-dialog` for confirmation
  - Button state derives from `business.deleted_at` (null → show
    Archive, non-null → show Restore)
- Public deep-link to an archived row: `getBusinessById` returns
  null → page hits `notFound()` → 404. No special-casing.

**Out (deferred):**
- **Hard-purge cron** (180-day default) — that's S5 (F14)
- **`purge_soft_deleted` admin trigger button** — same as above
- **Mobile parity** — same REST endpoints already serve mobile when
  its admin screens land; web-only this pass
- **Bulk archive / restore on the admin list** — single-row only
- **Filter archived rows by who archived them / when** — `audit_log`
  has the data but no admin UI for it in scope
- **Cascade behavior** — businesses have no FK dependents today
  (gallery + multi-category join are future work); cascade is N/A

## Approach

Five layers, the same shape as `hours`, `aira_review`, and `rating`.

**1. Schema** — `packages/db/src/schema/businesses.ts`

Add the column:

```ts
deleted_at: timestamp("deleted_at"),
```

And a new partial index on the active subset so the common public-side
query (`WHERE deleted_at IS NULL`) doesn't have to scan archived rows:

```ts
index("businesses_active_idx")
  .on(table.category, table.tier)
  .where(sql`${table.deleted_at} IS NULL`),
```

Run `pnpm db:generate` → migration `0015_*.sql`. Additive only.

**2. Public queries** — `packages/services/src/businesses/queries.ts`

Every public read adds `isNull(businesses.deleted_at)` to its
predicates:

- `getFeaturedBusinesses` — `WHERE deleted_at IS NULL AND tier IN
  (tier1, tier2)`
- `getBusinessesByCategory` — `WHERE deleted_at IS NULL AND category
  = ?`
- `getBusinessesByCategoryPaged` — same predicate added to both the
  SELECT and the COUNT
- `getBusinessById` — `WHERE deleted_at IS NULL AND id = ?`

`toBusiness()` adds `deleted_at: row.deleted_at?.toISOString() ?? null`.

**3. Admin queries + mutations** — same file

Two new admin-only reads:

- `getAllBusinesses(db, { includeArchived })` — single dump for the
  admin list, no pagination (admin's a small audience, the table
  doesn't grow that fast). Returns archived rows when
  `includeArchived === true`.

Two new mutations in `packages/services/src/businesses/service.ts`:

- `archiveBusiness(db, id, actorId)` — atomic:
  ```ts
  await db.transaction(async (tx) => {
    const result = await tx
      .update(businesses)
      .set({ deleted_at: new Date() })
      .where(and(eq(businesses.id, id), isNull(businesses.deleted_at)))
      .returning({ id: businesses.id });
    if (!result.length) throw ApiError.notFound(...);
    await tx.insert(auditLog).values({
      action: "business.archived",
      actor_id: actorId,
      entity_type: "business",
      entity_id: id,
    });
  });
  return getBusinessById_includingArchived(tx, id);
  ```
  Note: `getBusinessById` filters archived, so the post-update read
  needs a non-filtering sibling (`getBusinessByIdIncludingArchived`)
  or pass-through the row from `.returning(...)`. Cleanest: add a
  bypass param to the existing query.

- `restoreBusiness(db, id, actorId)` — symmetric: clears `deleted_at`,
  audits as `business.restored`. The WHERE clause inverts:
  `isNull(businesses.deleted_at)` becomes `isNotNull(...)`.

**4. Validator + ops** —
`packages/validators/src/businesses.ts` + new operation file

- Add `deleted_at: z.string().nullable()` to `BusinessSchema`
- New schemas:
  - `BusinessArchiveInputSchema = z.object({ id: z.string().min(1) }).strict()`
  - `BusinessRestoreInputSchema = z.object({ id: z.string().min(1) }).strict()`
  - Reuse `BusinessUpdateOutputSchema` (returns `{ business }`)
- Widen `BusinessListInputSchema` with
  `includeArchived: z.coerce.boolean().optional()` — only respected
  when the op is invoked at admin level (the public `permission:
  "user"` op still filters)
- New ops in `apps/web/src/server/operations/businesses-admin.ts`
  next to `updateBusinessOp`:
  - `archiveBusinessOp` (permission: "admin")
  - `restoreBusinessOp` (permission: "admin")
- Widen the existing `listBusinessesOp` handler to pass through
  `includeArchived` when the caller has admin permission. Actually —
  cleaner — add a separate `listAllBusinessesAdminOp` instead, so
  the public op stays simple. Admin list page switches to it.

**5. Routes + UI** —

New route files (matching the existing PATCH pattern):

- `apps/web/src/app/api/v1/admin/businesses/[id]/archive/route.ts`
- `apps/web/src/app/api/v1/admin/businesses/[id]/restore/route.ts`

Existing `/api/v1/businesses` route stays — public consumers don't
see archived rows.

Admin list page (`apps/web/src/app/admin/businesses/page.tsx`):
- Switch from `listBusinessesOp({ input: {} })` to
  `listAllBusinessesAdminOp({ input: { includeArchived: ?? } })`
- Read `?archived=1` from searchParams
- Render a Status column with a small chip per row
- Render a "Show archived" toggle that pushes `?archived=1` /
  `?archived=` and re-renders

Admin detail page (`apps/web/src/features/admin/components/business-detail.tsx`):
- Add an `<ArchiveControl business={business} />` to the header
  next to the page title
- Component shows Archive button when `business.deleted_at === null`,
  Restore button otherwise
- Click opens an `@base-ui/react/alert-dialog` with title
  "Archive Spice Garden?" / "Restore Spice Garden?", description,
  Cancel + Confirm buttons
- On confirm: POST to the new route, `router.refresh()` on success,
  `<StatusLine>` shows result

**Alternatives considered:**

- **Hard delete with backup row.** Move the row to a `businesses_archived`
  table on delete; restore by moving it back. Adds a duplicate
  schema. Rejected — `deleted_at` is the boring industry-standard
  pattern and one column is cheaper than a parallel table.
- **`status: enum('active', 'archived')` instead of `deleted_at`.**
  Loses the "when was it archived" data that the audit_log gives us
  anyway, but more importantly conflicts with the existing
  `tier`/`category` text columns which were explicitly kept off
  pgEnum (schema comment: "adding a new tier/category doesn't
  require a DB migration round-trip"). Rejected.
- **No confirmation dialog.** Faster UX, but the user picked the
  dialog option to make the destructive action feel destructive.
  Worth the extra component.
- **Widen `listBusinessesOp` with `includeArchived` instead of new
  `listAllBusinessesAdminOp`.** Cleaner-looking from outside but
  requires runtime branching on the caller's permission inside one
  op. The MLabs pattern keeps user-permission and admin-permission
  ops separate (see businesses.ts vs businesses-admin.ts). Picking
  the separate-op path.

## Data model changes

- **New column** on `businesses`: `deleted_at timestamp NULL`
- **New partial index** `businesses_active_idx` on `(category, tier)`
  WHERE `deleted_at IS NULL` — keeps the existing
  category+tier composite hot path (used by
  `getBusinessesByCategory*`) fast on the active subset.
- Migration `0015_*.sql` generated via `pnpm db:generate`.
- No new tables.

## Files to touch

**New:**
- `apps/web/src/app/api/v1/admin/businesses/[id]/archive/route.ts`
- `apps/web/src/app/api/v1/admin/businesses/[id]/restore/route.ts`
- `apps/web/src/features/admin/components/archive-control.tsx` —
  the header button + AlertDialog wrapper

**Edit:**
- `packages/db/src/schema/businesses.ts` — column + partial index
- `packages/db/drizzle/migrations/0015_*.sql` — generated
- `packages/validators/src/businesses.ts` — extend `BusinessSchema`
  with `deleted_at`, add archive/restore input schemas, widen
  `BusinessListInputSchema` with `includeArchived`
- `packages/services/src/businesses/queries.ts` — predicate guards
  on all public reads, new `getAllBusinesses` for admin, optional
  bypass on `getBusinessById`
- `packages/services/src/businesses/service.ts` — new
  `archiveBusiness` + `restoreBusiness` with audit log writes
- `packages/services/src/businesses/index.ts` — re-export new fns
- `apps/web/src/server/operations/businesses-admin.ts` — new
  `archiveBusinessOp` + `restoreBusinessOp` + `listAllBusinessesAdminOp`
- `apps/web/src/app/admin/businesses/page.tsx` — switch to admin op,
  read `?archived=`, add Status column + toggle
- `apps/web/src/features/admin/components/business-detail.tsx` —
  render `<ArchiveControl>` in the header

## Edge cases

- **Race: admin archives twice in quick succession** — the
  `where ... AND isNull(deleted_at)` clause makes the second update
  affect 0 rows. `.returning(...).length === 0` → throw
  `ApiError.notFound`. Idempotent in spirit.
- **Race: admin restores twice** — same shape with `isNotNull`. Safe.
- **Archived row's existing detail-page URL** — `getBusinessById`
  filters → returns null → `notFound()` → 404. No special handling
  needed.
- **Admin loads the edit page, business gets archived in another
  tab, admin clicks Archive** — the WHERE filter on the mutation
  catches it (0 rows updated → notFound). UI shows the error.
- **Admin edit form fields are saved against an archived row** —
  `updateBusiness` doesn't filter on `deleted_at`. Admin can still
  edit archived rows' fields. Intentional: lets admin clean up the
  data before restoring. The existing PATCH route stays unchanged.
- **Featured query: archived tier1 row** — `WHERE deleted_at IS
  NULL` filter eliminates it. Featured slot just shows fewer rows
  until admin restores or archives another tier1.
- **Pagination: archive while user is paging** — server-side
  pagination computes `total` from the filtered count. User
  navigating page 2 just sees a slightly different list — no
  crash, no empty page (unless total drops below pageSize).
- **`audit_log` insert fails inside the transaction** — whole
  transaction rolls back. Business stays in its original state.
  The error propagates to the user.
- **Admin clicks Cancel on the dialog** — no API call, no DB write,
  no audit entry.
- **Archive a business while keyboard-focused on its row** — focus
  stays on the row; the Status chip flips. No focus loss.

## Acceptance criteria

- [ ] Migration `0015_*.sql` is `ALTER TABLE … ADD COLUMN deleted_at
  timestamp` plus `CREATE INDEX businesses_active_idx … WHERE
  deleted_at IS NULL`. No data rewrites.
- [ ] `BusinessSchema.deleted_at` is `string | null`; GET endpoint
  returns the field for every existing business as `null`.
- [ ] Admin sees an Archive button in the header of an active
  business's edit page; sees Restore for an archived one.
- [ ] Clicking Archive opens an AlertDialog with the business's name
  in the title and a Cancel + Confirm button.
- [ ] Confirming archives the business: page refreshes, button flips
  to Restore, `deleted_at` is set in the DB, an `audit_log` row
  exists with `action = "business.archived"` and the right
  `actor_id` + `entity_id`.
- [ ] Cancelling closes the dialog with no DB write.
- [ ] After archive, `GET /api/v1/businesses?category=restaurants`
  does NOT return the archived row.
- [ ] After archive, `GET /api/v1/businesses?featured=true` does NOT
  return the archived row (even if it was tier1).
- [ ] After archive, `GET /api/v1/businesses/<id>` returns 404.
- [ ] After archive, navigating to
  `/listings/restaurants/<archived-id>` shows the 404 page.
- [ ] On `/admin/businesses` with default URL (no `?archived=`),
  archived rows are NOT listed; total row count drops by one when a
  business is archived.
- [ ] Toggling "Show archived" → URL becomes `?archived=1` and
  archived rows render with a muted Status chip; toggling back drops
  the param and hides them.
- [ ] Restore: symmetric — confirm dialog, audit row with
  `action = "business.restored"`, public surfaces start returning the
  row again.
- [ ] `/admin/businesses` no-archive view now shows ALL active
  businesses (regression fix — previously only tier1+tier2 due to
  the "no-filter = featured" fallback).
- [ ] `/home` featured strip, `/admin` dashboard's recent list, and
  `/admin/businesses` list all continue to render with no errors.
- [ ] `pnpm typecheck` + `pnpm lint` clean.

## Open questions

- **AlertDialog styling**: base-ui ships unstyled. The shadcn alert-
  dialog primitive (if added) would be more polished, but adding it
  is a small new component scope. Default: lightweight inline styling
  on the base-ui primitives — overlay + popup with the brand `--card`
  surface. Reviewer can elevate.
- **Audit log structure**: the existing audit_log table has
  `action`, `actor_id`, `entity_type`, `entity_id`, plus `metadata
  jsonb`. Reuse as-is; no metadata to add for archive (the action
  itself is the full story). Reviewer can ask for richer metadata
  (e.g. capturing the business's `name` at archive time so reports
  can show "Spice Garden was archived" without joining to the live
  row).
- **Status chip color**: Active = green (success token), Archived =
  muted (muted-foreground on muted bg). Reviewer can flip.
- **Header button label**: "Archive" / "Restore" (verbs) vs "Archived"
  / "Active" (status). Going with verbs since the button is an
  action, not a status indicator.
- **Should `updateBusiness` reject mutations on archived rows?**
  Default: allow (admin can clean up data before restoring).
  Reviewer can argue for blocking.
