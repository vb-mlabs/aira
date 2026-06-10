# Review: Admin — Create Business

**Date:** 2026-06-10
**Slug:** admin-create-business
**Plan reviewed:** [2026-06-10-admin-create-business.md](../plans/2026-06-10-admin-create-business.md)
**Status:** approved
**UI-Significant:** yes
**Reviewer:** claude

---

## Summary

The plan is ready to implement with three corrections folded in: the op name
for city fetching, the `updateBusiness` service mapper gap, and the
`toBusiness` mapper clarification. Open questions resolved. All tasks are
non-destructive additions to nullable columns; no existing data is at risk.

## Findings

### Blockers (must fix before /mlabs-code)

None.

### Concerns (raised, decided, recorded)

- **Concern:** Plan says "fetched via `listCitiesOp`" but the actual op in
  `cities-admin.ts` is `listCitiesAdminOp` (permission: "admin"). The public
  `listCitiesOp` (if it even exists) wouldn't pass admin auth.
  **Decision:** Use `listCitiesAdminOp` in the RSC page and the task list.

- **Concern:** Plan says "update `getBusinessByIdIncludingArchived` query …
  to select new columns." All business queries already use `db.select().from(businesses)`
  (Drizzle select-star) so new DB columns are automatically included. The real
  work is in the `toBusiness` mapper in `queries.ts` — it must emit the three
  new fields. If the mapper is not updated, the Business type will have
  `city_id | undefined` at runtime which breaks Zod parsing.
  **Decision:** Task explicitly targets the `toBusiness` mapper, not the query
  SELECT. No SELECT change needed.

- **Concern:** `updateBusiness` in `service.ts` maps each field individually
  into `updatePayload`. Adding `city_id`, `business_type`, `years_operating` to
  `BusinessUpdateInputSchema` (as the plan requires) is inert unless those
  fields are also mapped inside `updateBusiness`. Otherwise editing them via
  the detail page later will silently no-op.
  **Decision:** Task 3 (service) includes mapping the three new fields in
  `updateBusiness`.

### Suggestions (taken or deferred)

- New `POST /api/v1/admin/businesses/route.ts` should export
  `runtime = "nodejs"` — follows every existing admin route handler in the
  codebase. **Taken** — noted in Task 5.
- Slug uniqueness: use a pre-check `SELECT 1 … WHERE slug = $1 LIMIT 1`
  rather than catching a DB unique-violation error. Gives a clean
  `ApiError.conflict` message surfaced inline. **Taken** — noted in Task 3.

## Decisions locked

- `city_id` column on `businesses` — **no DB index** until F25 city-aware
  slugs land; no query currently filters by city_id.
- `business_type` and `years_operating` — **admin-only** for now; not exposed
  on the public business detail page (F10 scope).
- The "Google Business Profile" field requested during planning is **deferred**
  (no column; can be added in a future enhancement).

## Implementation plan

### Task 1: DB schema — add city_id, business_type, years_operating

- **Files:** `packages/db/src/schema/businesses.ts` (edit)
- **What:** Add three nullable columns to the `businesses` table:
  - `city_id text REFERENCES city(id)` (nullable FK — no `notNull()`)
  - `business_type text` (nullable)
  - `years_operating text` (nullable)
  Then run `pnpm db:generate` to create the migration file.
- **Acceptance:** Migration file appears under `packages/db/drizzle/`; `pnpm typecheck` passes; `businesses.$inferSelect` includes the three new fields.

### Task 2: Validators — constants + BusinessCreateInputSchema + schema updates

- **Files:** `packages/validators/src/businesses.ts` (edit)
- **What:**
  1. Add `VALID_BUSINESS_TYPES = ["storefront", "home_based", "service_at_client", "online_only", "mixed"] as const` and `VALID_YEARS_OPERATING = ["under_1", "1_to_3", "3_to_5", "5_plus"] as const`
  2. Add `BusinessCreateInputSchema` with required fields (`name`, `slug` kebab-case pattern, `category`, `tier`) and optional fields (`description`, `phone`, `address`, `city_id`, `business_type`, `years_operating`, `instagram_url`, `facebook_url`, `website`, `whatsapp_number`) — all using `.strict()`
  3. Update `BusinessSchema` to include `city_id: z.string().nullable()`, `business_type: z.string().nullable()`, `years_operating: z.string().nullable()`
  4. Update `BusinessUpdateInputSchema` to include `city_id`, `business_type`, `years_operating` as optional nullable fields
- **Acceptance:** `pnpm typecheck` passes; `BusinessCreateInputSchema` parses a minimal `{name, slug, category, tier}` object; `BusinessSchema` accepts the three new nullable fields.

### Task 3: Service — toBusiness mapper + createBusiness + updateBusiness

- **Files:** `packages/services/src/businesses/queries.ts` (edit) · `packages/services/src/businesses/service.ts` (edit)
- **What:**
  1. In `queries.ts`: update `toBusiness` mapper to include `city_id: row.city_id ?? null`, `business_type: row.business_type ?? null`, `years_operating: row.years_operating ?? null`
  2. In `service.ts`: add `createBusiness(db, input)` — pre-checks slug uniqueness (`SELECT 1 WHERE slug = $1 LIMIT 1`; throws `ApiError.conflict("businesses.slug_taken", "Slug already in use")` if found), then `db.insert(businesses).values({...input, id: crypto.randomUUID()}).returning()`, then calls `getBusinessByIdIncludingArchived` and returns the result
  3. In `service.ts`: add mapping for the three new fields in the `updateBusiness` `updatePayload` block (same pattern as existing fields — `if (data.city_id !== undefined) updatePayload.city_id = data.city_id` etc.)
- **Acceptance:** `createBusiness` called twice with the same slug throws on the second call; `updateBusiness` with `{id, business_type: "storefront"}` updates the row; `pnpm typecheck` passes.

### Task 4: Operation — createBusinessAdminOp

- **Files:** `apps/web/src/server/operations/businesses-admin.ts` (edit)
- **What:** Import `BusinessCreateInputSchema`, `BusinessSchema` from `@aira/validators/businesses`. Add `createBusinessAdminOp` using `defineOperation` with `permission: "admin"`, `input: BusinessCreateInputSchema`, `output: z.object({ business: BusinessSchema })`. Handler calls `businessesService.createBusiness(db, input)` and returns `{ business }`.
- **Acceptance:** `pnpm typecheck` passes; op exports correctly; handler wires to service.

### Task 5: Route — POST /api/v1/admin/businesses

- **Files:** `apps/web/src/app/api/v1/admin/businesses/route.ts` (new)
- **What:** Create route file exporting `runtime = "nodejs"` and `POST = createBusinessAdminOp.runFromRequest`. Pattern identical to `[id]/route.ts`.
- **Acceptance:** File created; `pnpm typecheck` passes; no conflict with existing `[id]/` sub-routes.

### Task 6: Component — BusinessCreateForm

- **Files:** `apps/web/src/features/admin/components/business-create-form.tsx` (new)
- **What:** `"use client"` component. Three form sections:
  1. **Identity** — name input (onChange auto-slugifies using the `CityForm.slugify` pattern; sets slug state; slug input editable for override), category `<select>` (VALID_CATEGORIES), tier `<select>` (VALID_TIERS)
  2. **Details** — description `<textarea>`, phone `<Input>`, address `<PlacesAddressInput>`, city `<select>` with "— no city —" blank option + one `<option>` per city prop entry
  3. **Business profile** — business type `<select>` (blank + 5 VALID_BUSINESS_TYPES), years operating `<select>` (blank + 4 VALID_YEARS_OPERATING), instagram URL `<Input>`, facebook URL `<Input>`, website `<Input>`, whatsapp number `<Input>`
  On submit: `apiClient.post("/api/v1/admin/businesses", payload)`, then `router.push(\`/admin/businesses/${result.business.id}\`)`. Inline error state on failure (including duplicate slug message).
  Accepts `cities: City[]` prop (passed from RSC page).
- **Acceptance:** Form renders all three sections; typing in name auto-populates slug; slug can be manually overridden; city select shows "— no city —" when cities prop is empty; submit with duplicate slug shows inline error; successful submit navigates to edit page.
- **Pause if:** `PlacesAddressInput` import path differs from what's used in `business-detail.tsx` — check before writing.

### Task 7: Page — /admin/businesses/new

- **Files:** `apps/web/src/app/admin/businesses/new/page.tsx` (new)
- **What:** RSC page. Fetches active cities via `apiServerFetch(listCitiesAdminOp, { input: {} })`. Renders `<AdminFormModal title="New business" backHref="/admin/businesses">` wrapping `<BusinessCreateForm cities={cities} />`. Export `metadata = { title: "Admin · New Business" }`.
- **Acceptance:** Navigating to `/admin/businesses/new` shows the modal overlay on top of the businesses list; closing modal returns to `/admin/businesses`; `pnpm typecheck` passes.

### Task 8: List page — Add business button

- **Files:** `apps/web/src/app/admin/businesses/page.tsx` (edit)
- **What:** Add a `<Link href="/admin/businesses/new">` button in the page header alongside the existing description text. Style: `inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90` with a `<Plus className="size-4" />` icon from lucide-react.
- **Acceptance:** `/admin/businesses` shows "Add business" button in the header; clicking it opens `/admin/businesses/new` modal; `pnpm typecheck` and `pnpm lint` pass.

## Open questions

None — all resolved during review.
