# Plan: Listing Contact Person field

**Date:** 2026-06-22
**Slug:** 2026-06-22-listing-contact-person
**Status:** implemented
**Author:** framer@millionlabs.co.uk

---

## Problem

Admins need to know who to call about a given listing — the owner, the
manager, the person who actually answers their phone. We just hid the
heavy "Owner" card (`BusinessOwnerSection`, which linked a business to a
user row via the audited assign/unassign flow), and replaced it
conceptually with a lightweight free-text "Contact person" so ops can
jot down a name without provisioning a user account.

Benefits:
- AIRA ops gets one-click reachability info on every business listing.
- Avoids forcing every listed business through user-account creation
  just to record a contact name.
- Public surface stays unchanged (this is an admin-only operational
  detail, not a customer-facing trust signal).

Success: an admin opens a business in `/admin/businesses/[id]`, sees a
"Contact person" row in Core fields, edits it inline, and the change
persists + audits. New listings created via the Add Business modal can
optionally set the field at create time.

## Scope

**In:**
- New nullable `contact_person` text column on `businesses`
  (`packages/db/src/schema/businesses.ts`) + generated migration.
- Validator updates in `packages/validators/src/businesses.ts`:
  - Add field to `BusinessCreateInputSchema` (optional, nullable,
    trimmed, ≤120 chars).
  - Add field to `BusinessUpdateInputSchema` (optional, nullable,
    trimmed, ≤120 chars).
  - **Do NOT** add to public `BusinessSchema`. Introduce a new
    `BusinessAdminSchema = BusinessSchema.extend({ contact_person: z.string().nullable() })`
    and use it on admin output shapes (`BusinessAdminDetailOutputSchema`,
    `AdminBusinessItemSchema`, `BusinessUpdateOutputSchema`).
- Service-layer changes in `packages/services/src/businesses/`:
  - `queries.ts` — extend the row→business projection and DB SELECT
    list used by admin queries to include the new column. Public
    `getBusiness*` paths continue to project the public shape (no
    `contact_person`).
  - `service.ts` — thread `contact_person` through `createBusiness` and
    `updateBusiness` allow-lists.
- API surface in `apps/web/src/server/operations/businesses-admin.ts`:
  - `createBusinessAdminOp` output → switch to `BusinessAdminSchema`.
  - `updateBusinessOp` output → switch to `BusinessAdminSchema`.
  - `getBusinessByIdAdminOp` output already wraps in
    `BusinessAdminDetailOutputSchema` — that schema is updated centrally.
- Admin UI:
  - **Add Business modal** (`apps/web/src/features/admin/components/business-create-form.tsx`)
    — text input after Name, before Category. Labelled "Contact person".
    Submits trimmed value (or omits when blank).
  - **Core Fields section** on admin business detail
    (`apps/web/src/features/admin/components/business-detail.tsx`,
    `CoreFieldsSection` + `CoreFieldsEditModal` + `CoreFieldsPreview`):
    - Preview row showing the value (or em-dash placeholder when null).
    - Editable text input in the edit modal, saved through the existing
      `updateBusinessOp` call.
- Audit log entry whenever `contact_person` changes via the admin
  update path. **Open question (Q1):** existing
  `updateBusinessOp` doesn't currently audit field-level diffs at all —
  see Open questions for the two paths the reviewer can lock.

**Out (deferred):**
- Surfacing `contact_person` on any public route, listing card, or
  business detail page.
- Mobile app surfaces.
- Multiple contact people per business (single text field only).
- Email/phone/role fields on the contact (just a name for v1).
- Admin businesses list ILIKE search expansion to include
  `contact_person` (out per the planning Q&A).
- Backfilling `contact_person` from existing `owner_user_id`
  linkages — admins start each listing's contact entry from scratch.
- Re-enabling or deleting `BusinessOwnerSection` and the assign /
  unassign owner ops. The card is hidden but the service paths stay
  intact in case the user-linking flow returns.

## Approach

The column is admin-only PII (a person's name), so the data layer
enforces the boundary rather than relying on UI omission. We split the
single shared `BusinessSchema` into:

- `BusinessSchema` — unchanged public shape (no `contact_person`).
- `BusinessAdminSchema = BusinessSchema.extend({ contact_person: z.string().nullable() })`
  — used on every admin output (`BusinessAdminDetailOutputSchema`,
  `AdminBusinessItemSchema`, `BusinessUpdateOutputSchema`, the create
  op's output).

The pattern already exists in `businesses-admin.ts:36` —
`AdminBusinessItemSchema = BusinessSchema.extend({ ... })` — we extend
the same way for `contact_person`.

At the query layer, the public `mapRowToBusiness` projection stays
unchanged. We add a parallel `mapRowToBusinessAdmin` (or a single
projection with an `includeAdminFields` flag) that adds
`contact_person`. The admin SELECTs ask for the extra column; public
SELECTs continue to omit it. Defense-in-depth: the public Zod schema
would reject `contact_person` even if it accidentally landed in the
payload (BusinessSchema is `.strict()` via downstream consumers — or
add a `.passthrough()` audit if not).

In `updateBusiness` (`packages/services/src/businesses/service.ts`),
we add one more guarded assignment to the per-field allow-list — same
pattern as every other column. Audit handling is described in Open
questions.

**Alternatives considered:**

- **Single schema with public stripping at the service layer.** Adds
  `contact_person` to `BusinessSchema` like `owner_user_id` lives there
  today, then strips it in public queries via `Omit<Business, "contact_person">`
  on the public output type. Rejected because (a) it requires every
  public op to remember to project around the column instead of opting
  in to admin fields explicitly, which is a footgun for future devs,
  and (b) `owner_user_id` is an opaque FK with "no PII on its own" per
  its schema comment; a free-text name doesn't get that pass.

- **Promote a real `contact_people` join table.** One business → many
  contacts, each with role/email/phone. Rejected for v1 because the
  user explicitly asked for a name-only field as a lightweight
  replacement for the hidden Owner card; adding the join now is
  premature design.

- **Bring back `BusinessOwnerSection` with a "display name only" mode
  that doesn't require a user account.** Rejected because the
  user-linking flow has its own UI, audit messages, email notifications
  ("you've been listed as a business owner"), and assign/unassign ops.
  Repurposing it for free text would be more code than adding a column.

## Data model changes

New column on `businesses`:

```ts
// packages/db/src/schema/businesses.ts (inside pgTable block)
contact_person: text("contact_person"), // nullable
```

Generated migration via `pnpm db:generate`. Migration is purely
additive (nullable column with no default), so no advisory-lock
contention concerns beyond the standard `pnpm db:migrate` path.

No FK, no index. Search isn't in scope for v1 (per planning Q&A),
which is the only reason an index would be relevant.

## Files to touch

**New:**
- `packages/db/drizzle/00XX_contact_person.sql` (generated)
- (No new TS files — every change reuses existing modules.)

**Edit:**

Data layer:
- `packages/db/src/schema/businesses.ts` — add the column.
- `packages/validators/src/businesses.ts`:
  - Add `BusinessAdminSchema` (extends `BusinessSchema` with
    `contact_person: z.string().nullable()`).
  - Add `contact_person: z.string().trim().max(120).nullable().optional()`
    to `BusinessCreateInputSchema` and `BusinessUpdateInputSchema`.
  - Update `BusinessAdminDetailOutputSchema` to use `BusinessAdminSchema`
    (its `business` field is currently `BusinessSchema.nullable()`).
  - Update `BusinessUpdateOutputSchema` to use `BusinessAdminSchema`
    (it's currently typed as the public `BusinessSchema` even though
    only admins can call the update op — switching is correct).
- `packages/services/src/businesses/queries.ts`:
  - Extend the row mapper(s) so admin paths return `contact_person`.
  - Add admin-aware SELECTs for `getBusinessByIdAdmin` /
    `getAllBusinesses` (whichever feeds the admin ops; verify before
    code-time).
  - Public `getBusinesses*` paths stay as-is.
- `packages/services/src/businesses/service.ts`:
  - `createBusiness` — pass `contact_person` through to insert payload.
  - `updateBusiness` — add `if (data.contact_person !== undefined)
    updatePayload.contact_person = data.contact_person;` to the
    allow-list.

API layer:
- `apps/web/src/server/operations/businesses-admin.ts`:
  - `createBusinessAdminOp.output` → `z.object({ business: BusinessAdminSchema })`.
  - `updateBusinessOp.output` → equivalent admin shape.
  - `AdminBusinessItemSchema` (line 36) → extend from
    `BusinessAdminSchema` instead of `BusinessSchema` so the admin list
    rows also carry the contact person if we ever surface it there.
  - Audit hook for `updateBusinessOp` — see Open questions.

UI layer:
- `apps/web/src/features/admin/components/business-create-form.tsx`:
  - Add `contact_person` to the form state.
  - Add a Label + Input row labelled "Contact person", placed between
    Name and Category. No asterisk (optional).
  - Submit: include `contact_person: contactPerson.trim() || null` in
    the POST body.
- `apps/web/src/features/admin/components/business-detail.tsx`:
  - `CoreFieldsPreview` — add a row showing the value, with the same
    em-dash placeholder treatment used for other nullable fields.
  - `CoreFieldsEditModal` — add a text input bound to local state,
    threaded through the existing `apiClient.patch(/api/v1/admin/businesses/...)`
    or whichever update call the modal uses.
  - `BusinessAdminDetailProps.business` type updates automatically when
    `BusinessAdminDetailOutputSchema.business` switches to
    `BusinessAdminSchema`.

Types in admin features that read `business.contact_person` will get
the right type for free since the admin op outputs already drive
TypeScript inference via `defineOperation`'s type plumbing.

## Edge cases

- **Existing rows.** All current `businesses` rows get `contact_person =
  NULL` after migration. UI must render an em-dash (matching other
  optional text fields' empty state) — not the literal string
  "Contact: null".
- **Empty-string vs null.** Form submit must coerce `""` → `null`
  before POSTing so the DB stores `NULL`, not the empty string. Apply
  `.trim()` then check truthiness.
- **Length cap.** 120 chars in the Zod schema. Hard cap; the UI input
  gets `maxLength={120}`. Anything over should be a 400 from the API,
  not silently truncated.
- **Unicode names.** Plenty of contacts in the AIRA community have
  diacritics ("Priya Krishnamurthy"), so the column is plain `text`
  (UTF-8) — no normalization, no slug-style sanitisation.
- **Public payload leakage.** Critical: regression-test that
  `/api/v1/businesses` and `/api/v1/businesses/:id` (public, RSC, and
  apiClient paths) never include `contact_person`. The split-schema
  approach makes this a Zod validation failure rather than a silent
  leak, but a unit test on the public op's parsed output is cheap
  insurance.
- **Type drift in admin features.** Any admin component that currently
  destructures `Business` directly (not the admin-extended type) won't
  see `contact_person`. The TypeScript "Property does not exist" error
  surfaces during `pnpm typecheck` — fix by importing
  `BusinessAdmin` (the inferred TS type) where needed.
- **Strict Zod boundaries.** `BusinessUpdateInputSchema` and
  `BusinessCreateInputSchema` are `.strict()` — adding the optional
  property doesn't break existing callers but does mean any old
  test fixtures that snapshot the schema will need updating.
- **Audit diff shape.** If we choose Q1 Option B, the diff entry
  shape must redact long values and handle the null→string case. See
  Open questions.
- **Archived rows.** Per existing `updateBusiness` behaviour (allows
  edits on archived rows, see `service.ts:113`), admins can still edit
  `contact_person` on an archived listing — keep that consistent.

## Acceptance criteria

- [ ] `pnpm db:generate` produces a non-destructive migration that
      adds `contact_person` as a nullable `text` column on `businesses`.
- [ ] `pnpm db:migrate` applies cleanly on a database that has rows in
      `businesses`. Existing rows have `contact_person = NULL`.
- [ ] `BusinessAdminSchema` exists in `@aira/validators/businesses` and
      includes `contact_person: z.string().nullable()`. Public
      `BusinessSchema` does NOT include `contact_person`.
- [ ] Public ops (`listBusinessesOp`, `getBusinessByIdOp`,
      `countActiveBusinessesOp`) return payloads that do not include
      `contact_person`. Verified by an explicit unit test that parses
      the response with public `BusinessSchema` and confirms no extra
      keys (or by inspecting a real `/api/v1/businesses` response).
- [ ] Admin ops (`createBusinessAdminOp`, `updateBusinessOp`,
      `getBusinessByIdAdminOp`, `listAllBusinessesAdminOp`) return
      payloads that include `contact_person` for the admin caller.
- [ ] The Add Business modal accepts a "Contact person" text input,
      submits trimmed value (or `null` when blank), and shows a
      validation error when the value exceeds 120 chars.
- [ ] The admin Business Detail → Core Fields section renders the
      current `contact_person` value (or em-dash placeholder), and the
      Core Fields Edit modal can update it via the existing save flow.
      The saved value persists across page reloads.
- [ ] No public surface (any `/listings/*` page, `BusinessCard`,
      `BusinessDetail`, mobile app screens) renders or fetches
      `contact_person`. Verified by code search.
- [ ] `pnpm typecheck` and `pnpm lint` both pass.
- [ ] Audit log behaviour matches the Q1 decision (see Open questions).
- [ ] `BusinessOwnerSection` import + `owner` prop remain removed from
      `BusinessAdminDetail` (already done — confirming we don't
      accidentally regress it).

## Open questions

For `/mlabs-review` to resolve before implementation:

- **Q1 — Where does the audit entry live?** The planning Q&A said
  "reuse existing business-update audit", but `updateBusinessOp` does
  not currently audit field-level diffs (the only `audit_log` writes
  on this entity are for archive/restore/owner assignment). Two paths:
  - **A.** Add a *generic* business-update audit hook in
    `updateBusinessOp` (or `updateBusiness` service) that diffs old
    vs. new for every field on every admin edit. Bigger scope (audits
    every existing column too), but consistent.
  - **B.** Add a *targeted* audit just for `contact_person` changes,
    e.g. emit `business.contact_person.changed` with old/new in the
    `meta` blob when the field transitions. Smaller scope, scoped to
    the new field only.
  - Recommendation: **B** for v1 — keeps surface area tight; **A**
    can land later as its own plan once the team decides what level
    of field-level auditing makes sense across the board.

- **Q2 — Should the field be shown on the admin businesses list
  table?** Currently the list (`/admin/businesses`) shows Name,
  Category, Verified, Status, etc. Showing the contact person as an
  extra column would help reachability scans, but expands table width
  on already-dense desktop layouts. Defaults: hide for v1 (matches
  Search being out of scope). Reviewer can toggle.

- **Q3 — Field placement in the Add Business modal.** Plan says
  "between Name and Category". The modal currently flows Name → Slug
  (hidden) → Category → … . Confirm the visual placement is right;
  alternative would be grouping with Phone/Address as
  "contact metadata", but Phone is in a later step / different card.

- **Q4 — Render label.** "Contact person" vs "Listing contact"
  vs "Point of contact". User wrote "Listing Contact Person name" in
  the request. Defaulting to "Contact person" (sentence case, two
  words) for brevity but reviewer should confirm.
