---
UI-Significant: yes
---

# Review: Business Social Links

**Date:** 2026-06-08
**Slug:** business-social-links
**Plan reviewed:** [2026-06-08-business-social-links.md](../plans/2026-06-08-business-social-links.md)
**Status:** approved
**Reviewer:** mlabs-review

---

## Summary

Plan is solid and ready to implement with two additions: the `toBusiness` mapper
in `packages/services/src/businesses/queries.ts` must be updated to include the
three new fields (without this, the API returns `null` for them even when the DB
has data), and the services layer needs a new `service.ts` for the write path.
Three open questions from the plan were locked during review. No blockers remain.

## Findings

### Blockers (must fix before /mlabs-code)

- None remaining — all resolved during review.

### Concerns (raised, decided, recorded)

- **Concern:** `packages/services/src/businesses/queries.ts` has a `toBusiness`
  mapper that explicitly lists every field. New DB columns not added to it will
  silently return `undefined`/`null` regardless of DB content.
  **Decision:** Task 3 explicitly updates the mapper. Treated as a blocker item
  woven into the implementation plan.

- **Concern:** `packages/services/src/businesses/` has no `service.ts` (only
  `queries.ts` for reads). Adding a write function (`updateBusiness`) to
  `queries.ts` would break the reads/writes separation visible in `admin/` and
  `messages/`.
  **Decision:** Create `packages/services/src/businesses/service.ts` for
  mutations, matching the `admin/` and `messages/` sub-domain pattern.

- **Concern:** Social icon `<a>` anchors inside `BusinessCard` will be covered
  by the `::after` overlay technique (whole-card link) unless they carry
  `relative z-10` like the existing Call button.
  **Decision:** Task 8 explicitly calls out `relative z-10` on every social
  icon anchor.

- **Concern:** PATCH scope — plan left open whether to cover all editable fields
  or only social links.
  **Decision (locked during review):** All editable fields — name, description,
  phone, website, address, tier, facebook_url, instagram_url, whatsapp_number.

### Suggestions (taken or deferred)

- Admin businesses list doesn't need search/filter for MVP — plain table
  sufficient. Deferred to post-MVP.
- The businesses admin list page can reuse the existing `listBusinessesOp`
  (permission: "user" which admins satisfy). No new list operation needed.

## Decisions locked

- `whatsapp_number` stored as raw digits including country code. Admin UI
  placeholder: `"Include country code, e.g. 14045551234"`.
- PATCH accepts all editable business fields (not just social links).
- `toBusiness` mapper update is part of the migration task, not a separate PR.
- New write mutations live in `packages/services/src/businesses/service.ts`.
- Admin businesses list reuses `listBusinessesOp` — no new list operation.

---

## Implementation plan

### Task 1: DB schema — add social columns

- **Files:** `packages/db/src/schema/businesses.ts` (edit)
- **What:** Add three nullable text columns — `facebook_url`, `instagram_url`,
  `whatsapp_number` — following the same pattern as `phone` and `website`.
  Then run `pnpm db:generate` to produce the migration file and
  `pnpm db:migrate` to apply it.
- **Acceptance:** `pnpm db:generate` produces a new migration file under
  `packages/db/drizzle/` containing `ALTER TABLE businesses ADD COLUMN`
  statements for all three fields. `pnpm db:migrate` exits 0 with no errors.
- **Pause if:** migration script errors or an existing migration conflict is
  detected.

### Task 2: Validator — extend BusinessSchema + add update schemas

- **Files:** `packages/validators/src/businesses.ts` (edit)
- **What:** Add `facebook_url: z.string().nullable()`, `instagram_url:
  z.string().nullable()`, `whatsapp_number: z.string().nullable()` to
  `BusinessSchema`. Add `BusinessUpdateInputSchema` (id: string, all other
  editable fields optional/nullable) and `BusinessUpdateOutputSchema`
  (`{ business: BusinessSchema }`). Export both new schemas and their inferred
  types.
- **Acceptance:** `pnpm typecheck` passes. `BusinessSchema.parse({...existing
  shape with nulls for new fields...})` succeeds.

### Task 3: Services read — update toBusiness mapper + index

- **Files:** `packages/services/src/businesses/queries.ts` (edit),
  `packages/services/src/businesses/index.ts` (edit)
- **What:** Add `facebook_url`, `instagram_url`, `whatsapp_number` to the
  `toBusiness` row mapper so all three fields flow through to the `Business`
  return type. Re-export any new types from `index.ts` if needed.
- **Acceptance:** The mapper compiles without type errors. `GET
  /api/v1/businesses` response shape includes the three fields (null when
  unset in DB).

### Task 4: Services write — updateBusiness()

- **Files:** `packages/services/src/businesses/service.ts` (new),
  `packages/services/src/businesses/index.ts` (edit)
- **What:** Create `service.ts` with a pure `updateBusiness(db, id, data)`
  function — accepts a partial update object (all editable fields optional),
  runs a Drizzle `update().set(...).where(eq(businesses.id, id))`, returns the
  updated row mapped through `toBusiness` (or `null` if id not found).
  Export `updateBusiness` from `index.ts`.
- **Acceptance:** Function signature matches the `BusinessUpdateInputSchema`
  payload (minus `id`). `pnpm typecheck` passes.

### Task 5: Admin operation — updateBusinessOp

- **Files:** `apps/web/src/server/operations/businesses-admin.ts` (new)
- **What:** New file with `import "server-only"` at top. Define
  `updateBusinessOp` via `defineOperation` with `permission: "admin"`, input
  `BusinessUpdateInputSchema`, output `BusinessUpdateOutputSchema`. Handler
  calls `businessesService.updateBusiness(db, id, data)` and returns
  `{ business }`. Returns a structured error if `business` is null (not found).
- **Acceptance:** `pnpm typecheck` passes. Non-admin callers are rejected by
  the `permission: "admin"` gate (verify by checking `defineOperation`'s
  permission logic matches existing admin ops).

### Task 6: Admin PATCH route

- **Files:** `apps/web/src/app/api/v1/admin/businesses/[id]/route.ts` (new)
- **What:** Wire `updateBusinessOp.runFromRequest` as the `PATCH` export.
  Include `export const runtime = "nodejs"` matching all other admin routes.
- **Acceptance:** `PATCH /api/v1/admin/businesses/:id` with a valid admin
  session and a body of `{ facebook_url: "https://..." }` returns 200 with the
  updated business. A request with no session or a non-admin session returns
  401/403.

### Task 7: Social icons component

- **Files:** `apps/web/src/features/listings/components/social-icons.tsx` (new)
- **What:** Three inline SVG React components — `FacebookIcon`, `InstagramIcon`,
  `WhatsappIcon` — each rendering the platform's brand mark as a `<svg>` path.
  Export a `SocialLinks` component that accepts `{ facebook_url, instagram_url,
  whatsapp_number }` (all optional/null) and renders a `<div>` row of circular
  icon anchors. Each anchor has `rel="noopener noreferrer"` and
  `target="_blank"`. The row is not rendered at all when all three props are
  null/undefined. Brand colours: Facebook `#1877F2`, Instagram `#E1306C`,
  WhatsApp `#25D366`. Icon circle size: `size-8`, icon size: `size-4`.
  WhatsApp href: `https://wa.me/${whatsapp_number.replace(/\D/g, "")}`.
- **Acceptance:** Component renders zero DOM when all props are null. Renders
  1–3 icons correctly when props are provided. `pnpm typecheck` + `pnpm lint`
  pass.

### Task 8: BusinessCard — social icon row

- **Files:** `apps/web/src/features/listings/components/business-card.tsx`
  (edit)
- **What:** Import `SocialLinks` from `./social-icons`. Add it below the
  name/category line inside the `min-w-0 flex-1` div. Every social icon anchor
  must carry `relative z-10` to remain clickable through the card's `::after`
  overlay. The call button already has `relative z-10`; ensure social anchors
  match.
- **Acceptance:** A card with social fields set shows the icon row. A card with
  all null shows no row (no empty gap). Each icon is independently tappable
  (not intercepted by the card overlay link). `pnpm typecheck` passes.

### Task 9: BusinessDetail — social links section

- **Files:** `apps/web/src/features/listings/components/business-detail.tsx`
  (edit)
- **What:** Import `SocialLinks` and render it in the contact `<dl>` section
  (below phone/website/address fields). No `z-10` needed here since there's no
  overlay technique on the detail page.
- **Acceptance:** Business detail page shows social icons when present.
  `pnpm typecheck` passes.

### Task 10: Listings index — re-export SocialLinks

- **Files:** `apps/web/src/features/listings/index.ts` (edit)
- **What:** Add `export { SocialLinks } from "./components/social-icons"` so
  the public barrel exports it if needed by other parts of the app.
- **Acceptance:** No duplicate export errors. `pnpm lint` passes.

### Task 11: Admin businesses list page

- **Files:** `apps/web/src/app/admin/businesses/page.tsx` (new)
- **What:** Server component that calls `apiServerFetch(listBusinessesOp, {})`
  (no filter — returns featured, adequate for MVP list). Renders a plain table
  of businesses (name, category, tier, verified) with each row linking to
  `/admin/businesses/[id]`. Follows the structure of `admin/users/page.tsx`.
  Include `export const dynamic = "force-dynamic"` and `export const metadata`.
- **Acceptance:** Page renders at `/admin/businesses` with no errors.
  `pnpm typecheck` passes.
- **Pause if:** `listBusinessesOp` returns no businesses and the page needs a
  "list all" operation instead of featured-only — escalate for a new op.

### Task 12: Admin business edit page + component

- **Files:** `apps/web/src/app/admin/businesses/[id]/page.tsx` (new),
  `apps/web/src/features/admin/components/business-detail.tsx` (new)
- **What:** Page fetches the business via `getBusinessByIdOp`, renders
  `notFound()` if null. Renders `<BusinessAdminDetail business={...} />`.
  `BusinessAdminDetail` is a `"use client"` component mirroring the
  `UserDetail` pattern: one section per editable field group (Core fields:
  name, description, category, tier; Contact: phone, website, address; Social
  links: facebook_url, instagram_url, whatsapp_number). Each section has a
  save button that calls `PATCH /api/v1/admin/businesses/:id` via `apiClient`
  and calls `router.refresh()` on success. WhatsApp input carries placeholder
  `"Include country code, e.g. 14045551234"`.
- **Acceptance:** Admin can navigate to `/admin/businesses/[id]`, fill in
  social links, save, and the changes appear immediately on the listing card.
  `pnpm typecheck` + `pnpm lint` pass.

### Task 13: Admin layout nav — Businesses link

- **Files:** `apps/web/src/app/admin/layout.tsx` (edit)
- **What:** Add `<Link href="/admin/businesses">Businesses</Link>` to the admin
  nav alongside the existing Users and Audit links.
- **Acceptance:** "Businesses" link appears in the admin header nav.
  `pnpm typecheck` passes.

---

## Open questions

- None. All open questions from the plan were resolved during review.
