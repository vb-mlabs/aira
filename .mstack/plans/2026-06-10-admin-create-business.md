# Plan: Admin — Create Business

**Date:** 2026-06-10
**Slug:** admin-create-business
**Status:** reviewed
**Author:** vb-mlabs

---

## Problem

There is no way to create a new business from the admin panel. The only route
today is Drizzle Studio, which is inaccessible after launch. Every new listing
onboarded by the AIRA team has to be bootstrapped manually via raw SQL or
Studio. The `/admin/businesses` list has no "New" button, and
`/admin/businesses/new` doesn't exist.

## Scope

**In:**
- `/admin/businesses/new` page with `AdminFormModal` + `BusinessCreateForm`
- Required at creation: name, slug (auto-generated from name, editable), category, tier, description, phone, address
- Optional at creation: city, business type, years operating, instagram URL, facebook URL, website URL, whatsapp number
- Three new nullable columns: `city_id` (FK → cities), `business_type` (text), `years_operating` (text)
- New `BusinessCreateInputSchema` in `packages/validators/src/businesses.ts`
- New `createBusiness` service function in `packages/services/src/businesses/service.ts`
- New `createBusinessAdminOp` in `apps/web/src/server/operations/businesses-admin.ts`
- New `POST /api/v1/admin/businesses` route
- "Add business" button on `/admin/businesses` list header
- Redirect to `/admin/businesses/[id]` on success

**Out (deferred):**
- Google Business Profile URL field (no column exists; can be added later)
- Gallery images at creation (upload flow is separate, handled post-create on the edit page)
- Subscription / sponsorship assignment at creation
- Verified flag at creation (admin promotes manually on the edit page)
- Rating at creation

## Approach

Follow the cities pattern exactly. `/admin/cities/new/page.tsx` wraps
`AdminFormModal` + `CityForm`. We'll do the same: a `BusinessCreateForm`
client component inside an `AdminFormModal` at `/admin/businesses/new/page.tsx`.

The form has three logical sections:
1. **Identity** — name (auto-slugifies), slug (override), category (select from VALID_CATEGORIES), tier (select from VALID_TIERS)
2. **Details** — description textarea, phone, address (uses existing `PlacesAddressInput`), city (select from active cities fetched via `listCitiesOp`)
3. **Business profile** — business type (select: Storefront / Home-based / Service at client / Online only / Mixed), years operating (select: Under 1 year / 1–3 years / 3–5 years / 5+ years), social links (instagram URL, facebook URL, website, whatsapp number)

Slug auto-generation follows the exact `CityForm.slugify` pattern: lowercased,
non-alphanumeric → hyphen, leading/trailing hyphens stripped. Admin can
override the slug before submitting.

The `createBusinessAdminOp` `defineOperation` handler calls a new
`createBusiness(db, input)` service function. The service does:
1. Validates slug is unique; throws `ApiError.conflict` if taken
2. `db.insert(businesses).values(...)` and returns the new row

On success the `BusinessCreateForm` uses `router.push` to navigate to
`/admin/businesses/[id]`.

Cities are fetched server-side in the `/admin/businesses/new/page.tsx` RSC
using `apiServerFetch(listCitiesOp)` and passed as a prop to `BusinessCreateForm`.

**Alternatives considered:**
- **Inline drawer on list page** — rejected: diverges from the cities/membership-plans `/new` page pattern; more UI complexity for no gain
- **Require city_id as non-nullable** — rejected: city-aware slugs (F25) haven't landed yet; making it nullable lets admins create businesses before assigning a city

## Data model changes

Three new nullable columns on the `businesses` table:

```sql
ALTER TABLE businesses
  ADD COLUMN city_id   TEXT REFERENCES city(id),
  ADD COLUMN business_type    TEXT,
  ADD COLUMN years_operating  TEXT;
```

- `city_id` — nullable FK to `cities.id`; consistent with membership_plan, categories, sponsorship_tiers
- `business_type` — text, nullable; allowed values: `"storefront"`, `"home_based"`, `"service_at_client"`, `"online_only"`, `"mixed"` — validated by Zod constant (no pgEnum, same pattern as tier/category)
- `years_operating` — text, nullable; allowed values: `"under_1"`, `"1_to_3"`, `"3_to_5"`, `"5_plus"` — same Zod constant approach

Migration generated via `pnpm db:generate` after schema edit.

Update `BusinessSchema` and `BusinessUpdateInputSchema` in
`packages/validators/src/businesses.ts` to include the three new fields.
Update `getBusinessByIdIncludingArchived` query in
`packages/services/src/businesses/queries.ts` to select the new columns.

## Files to touch

**New:**
- `apps/web/src/app/admin/businesses/new/page.tsx` — RSC page; fetches cities; renders `AdminFormModal` + `BusinessCreateForm`
- `apps/web/src/features/admin/components/business-create-form.tsx` — client form component
- `apps/web/src/app/api/v1/admin/businesses/route.ts` — `POST` handler (`createBusinessAdminOp.runFromRequest`)

**Edit:**
- `packages/db/src/schema/businesses.ts` — add `city_id`, `business_type`, `years_operating` columns
- `packages/validators/src/businesses.ts` — add `VALID_BUSINESS_TYPES`, `VALID_YEARS_OPERATING` constants + `BusinessCreateInputSchema`; update `BusinessSchema` + `BusinessUpdateInputSchema`
- `packages/services/src/businesses/service.ts` — add `createBusiness(db, input)`
- `packages/services/src/businesses/queries.ts` — select new columns in `getBusinessByIdIncludingArchived`
- `apps/web/src/server/operations/businesses-admin.ts` — add `createBusinessAdminOp`
- `apps/web/src/app/admin/businesses/page.tsx` — add "Add business" button linking to `/admin/businesses/new`

## Edge cases

- **Duplicate slug**: Zod regex enforces kebab-case format; service throws `ApiError.conflict` if slug already exists in the table
- **Cities list empty**: `<select>` for city should include a blank "— none —" option since `city_id` is nullable; gracefully handles an empty city list
- **PlacesAddressInput requires GOOGLE_PLACES_API_KEY**: The component renders a plain text input as fallback when the key is absent — existing behavior, no change needed
- **Category list**: VALID_CATEGORIES is a static array; the form `<select>` iterates it directly — no async fetch needed

## Acceptance criteria

- [ ] `/admin/businesses` shows an "Add business" button in the page header
- [ ] Clicking "Add business" opens `/admin/businesses/new` as an overlay modal
- [ ] Name field auto-populates the slug (kebab-case); admin can override slug
- [ ] Category `<select>` lists all entries in VALID_CATEGORIES
- [ ] Tier `<select>` lists tier1, tier2, tier3
- [ ] City `<select>` lists active cities (nullable — "— none —" option present)
- [ ] Business type `<select>` lists the 5 type options
- [ ] Years operating `<select>` lists the 4 ranges
- [ ] Social link fields (instagram, facebook, website, whatsapp) are present and optional
- [ ] Submitting with a duplicate slug shows an inline error
- [ ] Successful creation creates a DB row and redirects to `/admin/businesses/[id]`
- [ ] The new business appears in the `/admin/businesses` list
- [ ] `typecheck` and `lint` pass

## Open questions

- Should the `city_id` column on `businesses` get a DB index now, or defer until F25 city-aware slugs land? (Probably defer — no query filters by city_id yet.)
- `business_type` and `years_operating` — expose on the public-facing detail page (F10) or keep admin-only for now?
