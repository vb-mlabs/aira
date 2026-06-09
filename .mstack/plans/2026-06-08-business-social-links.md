# Plan: Business Social Links

**Date:** 2026-06-08
**Slug:** business-social-links
**Status:** implemented
**Author:** mlabs-plan

---

## Problem

Business cards on the Home and Category Listing pages show name, category, and
a call button — but no way to reach a business on Facebook, Instagram, or
WhatsApp. The Figma spec calls for a row of small circular social-platform
icons on every card and on the full business detail page. Admins currently have
no web UI to set these fields; they would need raw Drizzle Studio access.

**Who benefits:** end users who prefer social/messaging contact over phone
calls; admin operators who need a web form to populate social links without
direct DB access.

## Scope

**In:**
- `facebook_url`, `instagram_url`, `whatsapp_number` columns on the
  `businesses` table (nullable text, same pattern as `phone`/`website`)
- Zod schema update in `packages/validators/src/businesses.ts`
- `BusinessCard` — social icon row (FB, IG, WA) rendered below name/category
  when at least one link is present
- `BusinessDetail` — social links section in the contact field grid
- `PATCH /api/v1/admin/businesses/[id]` — admin-only route to update business
  fields (social links + any other editable fields)
- `/admin/businesses` page — list all businesses
- `/admin/businesses/[id]` page — edit form for a single business, modelled on
  the existing `user-detail` admin panel pattern
- DB migration generated via `pnpm db:generate` and applied via `pnpm db:migrate`

**Out (deferred):**
- Self-serve business editing by the business owner (requires auth roles work)
- Twitter/X, LinkedIn, or any platform beyond the three above
- Social link validation beyond basic URL/phone format (e.g. "must be a
  facebook.com URL")
- Mobile (Expo) social icon UI — covered once web ships; mobile reads the same
  `/api/v1/businesses` contract automatically

## Approach

Add three nullable text columns to the `businesses` table following the
established convention (`phone`, `website` are already nullable text; `tier`
and `category` are plain text validated at the Zod layer). Column names:
`facebook_url`, `instagram_url`, `whatsapp_number`. `whatsapp_number` stores
the raw number string (e.g. `14045551234`) so the UI can build a `wa.me/` deep
link without storing a full URL. All three default to NULL so existing rows are
unaffected.

Update `BusinessSchema` in `packages/validators/src/businesses.ts` with three
optional string fields. The REST API (`GET /api/v1/businesses`,
`GET /api/v1/businesses/[id]`) already passes through `BusinessSchema` output,
so mobile and web both receive the new fields automatically after the migration
— no API version bump needed.

For the social icon row on `BusinessCard` and `BusinessDetail`, use three small
inline SVG components (`FacebookIcon`, `InstagramIcon`, `WhatsappIcon`) living
in `apps/web/src/features/listings/components/social-icons.tsx`. Each is a
`<svg>` path inlined as a React component (~15 lines each). No new package
dependency. The icons render as `size-4` inside `size-8` circular buttons
styled to each platform's brand colour (Facebook `#1877F2`, Instagram
`#E1306C`, WhatsApp `#25D366`). Tapping opens the URL/WA link in a new tab.
Icons are only rendered when the corresponding field is non-null.

Admin editing follows the `user-detail` pattern exactly: a new
`business-detail.tsx` admin component wraps an inline edit form with
`<Input>` fields for all editable business properties (including the three new
social fields). It calls `PATCH /api/v1/admin/businesses/[id]` via `apiClient`.
The route is protected by the existing `requireAdmin` auth helper used in every
other admin route.

**Alternatives considered:**
- **JSONB `social_links` column** — rejected because it breaks the locked
  plain-text-columns convention in the businesses schema, makes Zod typing
  awkward, and is not column-queryable.
- **`business_social_links` join table** — rejected as overkill for three fixed
  platforms; adds a join to every card render at MVP scale.
- **`react-icons` package** — rejected to avoid a new dep; inline SVG achieves
  the same visual result.

## Data model changes

**New columns on `businesses` table:**
```
facebook_url     text  (nullable, default null)
instagram_url    text  (nullable, default null)
whatsapp_number  text  (nullable, default null)
```

**Migration:** `pnpm db:generate` produces the ALTER TABLE migration;
`pnpm db:migrate` applies it. No index needed (these are display-only fields,
not filtered/sorted).

**Validator update:** `BusinessSchema` gains three optional fields:
```ts
facebook_url:    z.string().nullable(),
instagram_url:   z.string().nullable(),
whatsapp_number: z.string().nullable(),
```

## Files to touch

**New:**
- `apps/web/src/features/listings/components/social-icons.tsx` — `FacebookIcon`, `InstagramIcon`, `WhatsappIcon` inline SVG components
- `apps/web/src/features/admin/components/business-detail.tsx` — admin edit form for a single business
- `apps/web/src/app/api/v1/admin/businesses/[id]/route.ts` — `PATCH` handler (admin-only)
- `apps/web/src/app/admin/businesses/page.tsx` — business list admin page
- `apps/web/src/app/admin/businesses/[id]/page.tsx` — business edit admin page
- `apps/web/src/server/operations/businesses-admin.ts` — `updateBusinessOp` operation

**Edit:**
- `packages/db/src/schema/businesses.ts` — add 3 columns
- `packages/validators/src/businesses.ts` — extend `BusinessSchema`
- `apps/web/src/features/listings/components/business-card.tsx` — social icon row
- `apps/web/src/features/listings/components/business-detail.tsx` — social links in contact grid
- `apps/web/src/features/listings/index.ts` — re-export `SocialIcons` if needed
- `apps/web/src/app/admin/layout.tsx` — add "Businesses" nav link alongside "Users"

## Edge cases

- **All three fields null:** icon row must not render at all on `BusinessCard`
  (no hollow gap in the card layout).
- **WhatsApp number formatting:** `wa.me/` requires digits only — strip spaces,
  dashes, parentheses before building the href.
- **Existing rows:** migration adds nullable columns with no default constraint,
  so all current businesses simply show no social icons until an admin fills
  them in.
- **Admin self-protection:** the PATCH route must not allow non-admin users to
  call it; reuse `requireAdmin` from existing admin routes.
- **URL sanitisation:** `facebook_url` and `instagram_url` should be stored
  as-is but the UI must use `rel="noopener noreferrer"` and `target="_blank"`.

## Acceptance criteria

- [ ] `pnpm db:generate` produces a migration adding the three columns
- [ ] `pnpm db:migrate` applies cleanly with no errors
- [ ] `GET /api/v1/businesses` response includes `facebook_url`, `instagram_url`,
      `whatsapp_number` on each item (null when unset)
- [ ] `BusinessCard` shows a social icon row when at least one social field is
      set; row is absent when all three are null
- [ ] Each icon opens the correct link in a new tab (FB URL, IG URL, `wa.me/`
      deep link)
- [ ] `BusinessDetail` page shows social icons in the contact section
- [ ] `PATCH /api/v1/admin/businesses/[id]` returns 403 for non-admin callers
- [ ] Admin can update social links via `/admin/businesses/[id]` form and
      changes are reflected immediately on the listing card
- [ ] `pnpm typecheck` passes with no new errors
- [ ] `pnpm lint` passes with no new warnings

## Open questions

- Should `whatsapp_number` include the country code, or should the admin UI
  enforce it? (Reviewer to decide — suggest: store with country code, add
  placeholder copy "Include country code, e.g. 14045551234".)
- Admin businesses list page: does it need search/filter, or a plain table is
  sufficient for MVP?
- Should the PATCH route support updating ALL business fields (name, category,
  tier, etc.) or only the social link fields for now?
