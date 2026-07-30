# Debug — Notify Business popup: all three audience pickers empty

**Started:** 2026-07-30 07:05
**Source:** user-report
**Env:** localhost / staging (repro is code-level, not env-specific)
**Status:** ready-for-code
**Investigator:** /mlabs-debug

## Symptom

In the admin **Manage Listings → Notify business owners** modal, none of the
audience-scoping controls populate:

- **By city** dropdown renders only the "Pick a city…" placeholder, no cities.
- **By categories** stays stuck on "Loading…" forever, no categories appear.
- **By specific businesses** stays stuck on "Loading…" forever, no businesses
  appear.

Send never becomes enabled because the audience target can't be built.

## Repro

1. Sign in as an admin.
2. Navigate to Manage Listings (`/admin/businesses`).
3. Click **Notify business owners** in the header.
4. Click **By city** — dropdown is empty apart from the placeholder.
5. Click **By categories** — pane shows "Loading…" indefinitely.
6. Click **By specific businesses** — pane shows "Loading…" indefinitely.

**Expected:** All three controls populate from their respective endpoints.
**Actual:** All three stay empty.

## Investigation

- The three lists are loaded in a single `Promise.all` in the modal's mount
  effect (`apps/web/src/features/admin/components/business-broadcast-modal.tsx:98-129`).
- The three GETs are:
  1. `/api/v1/admin/cities-for-broadcast` — backed by `listCitiesForAdminOp`
     (route: `apps/web/src/app/api/v1/admin/cities-for-broadcast/route.ts` — has
     `GET`).
  2. `/api/v1/categories?tree=1` — backed by `listCategoriesTreeOp` (route:
     `apps/web/src/app/api/v1/categories/route.ts:18-23` — has `GET`).
  3. `/api/v1/admin/businesses` — route file
     `apps/web/src/app/api/v1/admin/businesses/route.ts` only exports **POST**
     (create). No `GET`. **The GET request 405s.**
- `apiClient.get` throws `ApiError` on any non-2xx
  (`packages/api/src/client.ts:14-16, 182`).
- `Promise.all` is fail-fast: a single rejection rejects the entire batch, so
  the two working calls never surface their data.
- The modal's `catch` block is empty and only logs a comment about silent
  failure (`business-broadcast-modal.tsx:121-124`); `setCities` /
  `setCategories` / `setBusinesses` are never invoked, `optionsLoaded` is
  never flipped, so all three arrays stay `[]`.
- The picker UI shows "Loading…" whenever an array's length is 0
  (`business-broadcast-modal.tsx:348-351, 381-384`) — with the fetch failing
  there's no state transition, so "Loading…" reads as "forever".
- `listAllBusinessesAdminOp` already exists
  (`apps/web/src/server/operations/businesses-admin.ts:124`) with
  `permission: "admin"` and output `{ items, total, page, pageSize }` matching
  what the modal expects (`{ items: BusinessRow[] }`). It's just not wired to
  HTTP GET.
- Additional consequence: the "Silent — the picker just stays empty" comment
  is wrong in practice. Users don't get an empty-and-labeled-as-such picker —
  categories/businesses stay in the ambiguous "Loading…" state indefinitely
  because the loading indicator is derived from `arr.length === 0`, not from
  an explicit `loading` flag.

## Root cause

`GET /api/v1/admin/businesses` returns **405 Method Not Allowed** because
`apps/web/src/app/api/v1/admin/businesses/route.ts` only exports `POST` (the
admin-create handler). The broadcast modal batches all three picker loads via
`Promise.all`, so the 405 rejects the whole batch; the modal's silent `catch`
swallows the error and leaves cities / categories / businesses all empty.
Cities and categories fail together only because they were piggy-backing on
the same `Promise.all`, not because their own endpoints are broken.

**Failing test:** `.mstack/debug/2026-07-30-0705-broadcast-modal-empty-pickers/specs/repro.spec.ts` — imports
the route module and asserts a `GET` export exists. Currently fails with
`AssertionError: expected 'undefined' to be 'function'`, matching the cause
exactly.

## Fix plan (for /mlabs-code)

**Files to change:**

- `apps/web/src/app/api/v1/admin/businesses/route.ts` — add a `GET` export
  that delegates to the existing
  `listAllBusinessesAdminOp.runFromRequest`. Keep the current `POST` export
  untouched. Match the header comment style used by neighbouring admin route
  files (see `.../admin/cities-for-broadcast/route.ts`).

  Sketch:

  ```ts
  import {
    createBusinessAdminOp,
    listAllBusinessesAdminOp,
  } from "@/server/operations/businesses-admin"

  export const runtime = "nodejs"

  export const GET = listAllBusinessesAdminOp.runFromRequest
  export const POST = createBusinessAdminOp.runFromRequest
  ```

**Why it fixes the cause:** The 405 disappears, the `Promise.all` in the
modal resolves, all three `setX` calls fire, and the three pickers populate.
`listAllBusinessesAdminOp` already has the exact `{ items }` shape the modal
consumes.

**Hard-rule reminders:**

- Operation already has `permission: "admin"` — no auth work needed at the
  route layer.
- No schema/migration changes; no `db:generate` or `db:migrate`.
- No new env vars.
- No brand string literals introduced.
- The admin businesses page (`apps/web/src/app/admin/businesses/page.tsx`)
  reaches the same op via `apiServerFetch` — that path is unaffected; adding
  the HTTP GET just gives client callers parity, matching the CLAUDE.md
  "one REST API for both clients" rule.

**Acceptance:**

1. `pnpm exec vitest run --config /home/runner/workspace/.mstack/debug/2026-07-30-0705-broadcast-modal-empty-pickers/specs/vitest.config.ts`
   from `apps/web` — passes (currently fails).
2. Reload the admin listings page, open **Notify business owners**, and
   verify **By city** shows the cities list, **By categories** shows the
   category tree, **By specific businesses** shows business rows. The
   "Loading…" state resolves within one round-trip.

**Out of scope (spotted, not fixing here):**

- The modal's silent `catch` block hides genuine failures forever. Consider a
  separate change to surface a retry UI or at least a toast when any of the
  three loads fails. Not fixing now to keep this change minimal.
- The "Loading…" copy is emitted purely from `arr.length === 0`, so it lies
  after a failed fetch. Same follow-up — an explicit `loading` / `error`
  state would fix both symptoms together.

## External references

None — root cause is entirely local to the repo.
