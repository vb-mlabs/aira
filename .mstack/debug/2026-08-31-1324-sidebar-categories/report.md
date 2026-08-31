# Debug — Sidebar leaks inactive categories + goes 404 after admin rename

**Started:** 2026-08-31 13:24
**Source:** user-report (web app; mobile unaffected)
**Env:** localhost (dev server on :5000) + code inspection
**Status:** implemented
**Investigator:** /mlabs-debug

## Symptom

Two coupled bugs on the web app's `AppSidebar` (persistent left nav in
`apps/web/src/app/(app)/layout.tsx`):

1. Categories and subcategories that were deactivated in the admin panel
   still appear as rows / expandable groups in the sidebar. The mobile
   Categories tab does not have this bug — it hides deactivated rows as
   expected.
2. When a super-admin renames a category or subcategory in
   `/admin/settings/categories/[id]` (changing the slug), the sidebar in
   other sessions — and in the same session across client-side
   navigations — keeps showing the OLD slug on the link. Clicking that
   stale link lands on `/listings/<old-slug>` which returns 404
   ("not-found"), because `getCategoryBySlugOp` filters `active = true`
   and the old slug is either gone or (if only the label changed and
   the row was also deactivated) inactive.

## Repro

### Bug 1 — inactive rows leak into the sidebar

1. Sign in as any user.
2. Sign in as a super-admin in a separate tab; go to
   `/admin/settings/categories/<id>`; uncheck "Active" and save.
3. In the first tab, refresh (or open the mobile hamburger drawer).
4. The deactivated category still renders in the sidebar; clicking it
   navigates to `/listings/<slug>` which 404s (or, for an inactive
   subcategory, renders under a still-listed parent group and 404s the
   same way).

**Expected:** deactivated categories/subcategories are absent from the
sidebar, exactly like `apps/mobile` behaves (the mobile Categories tab
consumes `?roots=1` → `listCategoriesRootsOp` which explicitly filters
`active`).

**Actual:** they render because the web sidebar is fed by
`listCategoriesTreeOp` → `categoriesService.getCategoryTree`, which
passes `includeInactive: true` at
[`packages/services/src/categories/queries.ts:62`](../../../packages/services/src/categories/queries.ts)
and applies **no** active filter to either roots or children.

**Artifact:** `specs/repro-bug1-inactive-in-tree.test.ts` — feeds a mixed
active/inactive row set through a stub `Database` and asserts the
returned tree omits inactive roots and children. Currently fails on
`expected [ 'restaurants', 'dead-root' ] to not include 'dead-root'`.

### Bug 2 — sidebar stays stale after a category rename

1. Sign in as a super-admin, load the app shell (`/home`).
2. Open a second tab; go to `/admin/settings/categories/<id>` and
   change the Slug field (e.g. `restaurants` → `dining`), leave the
   category active, save.
3. In the first tab, DO NOT hard-reload. Click any Server-Component
   link (e.g. `/community`) so Next.js does a soft nav — the sidebar
   is a persistent segment of `(app)/layout.tsx`, so its RSC render
   stays in the Router Cache.
4. Click the renamed category's row in the sidebar. It still points at
   `/listings/restaurants`. The route handler runs
   `getCategoryBySlugOp` (which filters `active = true`), finds no row
   matching the old slug (the DB updated it in-place), calls
   `notFound()` → 404 page.

**Expected:** after any admin category mutation, the sidebar re-renders
with fresh slugs on the next request in every session.

**Actual:** `apps/web/src/server/operations/categories-admin.ts` never
calls `revalidatePath("/", "layout")` (or any tag / path invalidator).
Grep confirms **zero** `revalidatePath` / `revalidateTag` calls in
`apps/web/src`. So the layout's server-rendered tree stays pinned.

**Artifact:** `specs/repro-bug2-no-revalidate.test.ts` — reads
`categories-admin.ts` and asserts a `revalidatePath("/", "layout")`
call plus the `next/cache` import. Both assertions currently fail.

## Investigation

Full data-flow trace with file:line references.

### The web sidebar's tree source

- `apps/web/src/app/(app)/layout.tsx:35` fetches the sidebar tree via
  `apiServerFetch(listCategoriesTreeOp, { input: {} })` (in-process op
  invocation, no HTTP round-trip).
- `apps/web/src/server/operations/categories.ts:66-75`
  (`listCategoriesTreeOp`) delegates to
  `categoriesService.getCategoryTree(db, CITY_ID)`.
- `packages/services/src/categories/queries.ts:58-68` (`getCategoryTree`)
  calls `getCategoriesByCity(db, cityId, { includeInactive: true })`
  and just partitions rows by `level` — no `active` post-filter on the
  root nor on the children. → **Bug 1's cause.**
- `apps/web/src/app/(app)/_components/app-sidebar.tsx:119-136` maps the
  raw tree straight to `<SidebarRow>` and `<CategoryGroup>` — no
  filtering.

### Why mobile is unaffected

- `apps/mobile/features/listings/api.ts:77-82` calls
  `apiGet<CategoryListResult>("/api/v1/categories", { roots: 1 })`,
  which routes to `listCategoriesRootsOp`
  (`apps/web/src/server/operations/categories.ts:39-64`). That op
  explicitly filters `tree.map(t => t.root).filter(r => r.active)` and
  `children.filter(c => c.active)` before returning. Same data, but the
  active gate is applied at the op boundary that mobile happens to use.

### The rename → 404 path

- The admin form `apps/web/src/features/admin/components/category-form.tsx`
  submits `PATCH /api/v1/admin/categories/[id]` with `{ id, name, slug,
  parent_id, active }`.
- The route handler is `updateCategoryOp` in
  `apps/web/src/server/operations/categories-admin.ts:61-80`, which
  calls `categoriesService.updateCategoryWithCascade`. That runs a
  transactional `UPDATE category ... SET slug = ...` and, when the
  slug changes, cascades every matching `businesses.category` row
  (with audit rows). DB side is correct.
- The op's post-write side effect list is empty — no
  `revalidatePath`, no `revalidateTag`, no manual client refresh
  broadcast. The `(app)/layout.tsx` Server Component's rendered output
  (including the sidebar's `categoryTree` prop) stays in the Next.js
  Router Cache for every open session.
- Existing form-side mitigation is `router.refresh()` after save
  (`category-form.tsx:79`), which invalidates the Router Cache in the
  admin tab only. Other tabs, other users, and background sessions all
  keep the stale sidebar. → **Bug 2's cause.**

### Coupling between the two bugs

Fixing Bug 1 alone does NOT fully close Bug 2's rename story: a slug
change on an *active* category still 404s from a stale sidebar link.
Both fixes are needed.

Fixing Bug 2 alone does NOT close Bug 1: after `revalidatePath` runs
the sidebar still renders inactive rows on subsequent hits because
`getCategoryTree` never applied the filter.

## Root cause

**Bug 1.** `getCategoryTree` in `packages/services/src/categories/queries.ts`
is the single source of truth for the web sidebar's data. It passes
`includeInactive: true` to `getCategoriesByCity` and applies no
post-filter. That decision — likely originally intended for the admin
tree manager, which does want to see inactive rows — leaked into the
public sidebar because `listCategoriesTreeOp` returns the tree
unchanged. The public-facing op should either filter at the op layer
or the shared service function should default to active-only and
opt-in inactive for admin callers.

**Bug 2.** None of the four category-admin ops
(`createCategoryOp`, `updateCategoryOp`, `deactivateCategoryOp`,
`reorderCategoriesOp`) invalidate the Next.js layout cache after they
mutate the DB. The sidebar is rendered by `(app)/layout.tsx` — a
persistent segment above every authed route — so without an explicit
`revalidatePath("/", "layout")`, its previous render is what the
Router Cache serves on client-side navigation, across sessions, until
each viewer hard-reloads.

**Failing tests:**
- `specs/repro-bug1-inactive-in-tree.test.ts` — feeds a mixed active /
  inactive row set through `getCategoryTree` and asserts inactive
  rows are omitted from both `root` and `children`. Currently:
  `AssertionError: expected [ 'restaurants', 'dead-root' ] to not include 'dead-root'`.
- `specs/repro-bug2-no-revalidate.test.ts` — asserts
  `apps/web/src/server/operations/categories-admin.ts` calls
  `revalidatePath("/", "layout")` after a mutation and imports it from
  `next/cache`. Currently both matchers fail.

## Fix plan (for /mlabs-code)

**Files to change:**

- `packages/services/src/categories/queries.ts` — change
  `getCategoryTree` to accept an optional
  `{ includeInactive?: boolean } = {}` third argument (defaults to
  `false`). When `false` (the public path), pass `includeInactive:
  false` down to `getCategoriesByCity` AND `.filter(c => c.active)` the
  child arrays (`getCategoriesByCity` already respects the flag for the
  top query, but partitioning by parent_id is done in-memory here).
  When `true`, keep today's behaviour so the admin tree keeps seeing
  inactive rows.
- `apps/web/src/server/operations/categories.ts` — leave
  `listCategoriesTreeOp` calling `getCategoryTree(db, CITY_ID)` (which
  is now active-only by default). No callsite change needed.
- `apps/web/src/server/operations/categories-admin.ts`:
  - `import { revalidatePath } from "next/cache"` at the top.
  - After each successful mutation in `createCategoryOp`,
    `updateCategoryOp`, `deactivateCategoryOp`, and
    `reorderCategoriesOp` (immediately before `return`),
    call `revalidatePath("/", "layout")`. That invalidates the
    `(app)/layout.tsx` Router Cache for every subsequent request so
    the sidebar re-fetches with fresh slugs / active states.
  - If the admin tree manager also needs the raw (with-inactive) view,
    it will still get it via `listCategoriesAdminOp` — that op builds
    its own tree from `getCategoriesByCity(..., { includeInactive: true })`
    directly and is unaffected by the service default change.

**Why it fixes the cause:**

- Bug 1: the service function no longer returns inactive rows for the
  public tree op, so the sidebar can only render active
  categories/subcategories.
- Bug 2: `revalidatePath("/", "layout")` after every category mutation
  invalidates the layout render across sessions on the next request,
  so a renamed slug propagates to the sidebar without a hard reload.

**Hard-rule reminders:**

- `packages/services` is server-side by convention — no `import
  "server-only"` needed inside `queries.ts` (already covered by the
  callers).
- Zod at the boundary is unchanged: only the service function
  signature grows an internal opts arg; the operation input/output
  schemas do not change.
- No Drizzle schema change → no `db:generate` migration.
- Do NOT reach into `packages/services` from any `apps/web` code path
  other than route handlers under `/api/v1/*` — the fix stays on the
  service/op layer.

**Acceptance:**

1. `pnpm exec vitest run --config .mstack/debug/2026-08-31-1324-sidebar-categories/specs/vitest.config.ts`
   passes (both Bug 1 and Bug 2 repros).
2. Manual re-run of the two repro flows above:
   - Deactivate a category → sidebar drops it on next request in every
     session.
   - Rename a category's slug → sidebar shows the new slug on the next
     client-side navigation in every open session, and clicking it
     lands on `/listings/<new-slug>` (not 404).

**Out of scope:**

- The admin form's `handleNameChange` deliberately does NOT
  auto-regenerate the slug in edit mode
  (`category-form.tsx:53-55`). That's a UX choice (slug changes
  cascade to businesses so the intent should be explicit) and is not
  part of this fix.
- Deactivating a category with active businesses — the current
  behaviour hides it from public but leaves the business rows
  pointing at an inactive slug. Separate concern; noted here so
  `/mlabs-code` doesn't chase it.
- Cross-tab live update (e.g. websocket push of category changes to
  end-user sessions). `revalidatePath` only invalidates on the next
  request; a truly-live tab still needs a manual reload. Out of scope
  — the reported bug is served by the next-request semantics.

## External references

None — the fix is entirely codebase-internal. The Next.js
`revalidatePath` API is used elsewhere in the Next docs at
https://nextjs.org/docs/app/api-reference/functions/revalidatePath
(behavior + `"layout"` second-arg documented there).
