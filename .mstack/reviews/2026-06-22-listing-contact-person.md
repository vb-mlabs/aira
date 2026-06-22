# Review: Listing Contact Person field

**Date:** 2026-06-22
**Slug:** 2026-06-22-listing-contact-person
**Plan reviewed:** [2026-06-22-listing-contact-person.md](../plans/2026-06-22-listing-contact-person.md)
**Status:** approved
**UI-Significant:** yes
**Reviewer:** framer@millionlabs.co.uk

---

## Summary

Plan is approved with a tightened task list. The split-schema approach
(`BusinessAdminSchema` extends public `BusinessSchema`) holds up under
review, but the plan understated three implementation details: registering
a new `AuditMeta` variant requires four coordinated edits across
`@aira/validators` and `apps/web`, the single `toBusiness` mapper has to
be forked to project `contact_person` only on admin paths, and
auditing the change requires a service-signature change to
`updateBusiness(db, ctx, id, data)` (current sig is `(db, id, data)` and
takes no caller context). The review enumerates all three and locks the
remaining open questions; UI also picks up a small fourth surface (the
admin businesses list table) per the reviewer-locked decision below.

## Findings

### Blockers (must fix before /mlabs-code)

None. All raised items were resolvable with decisions recorded below.

### Concerns (raised, decided, recorded)

- **Concern:** Plan glosses over the audit-meta registration surface. A
  new `AuditMeta.kind` value needs **four coordinated edits** or the
  `_ActionsCoverage` compile-time check fails:
  1. Add the variant to the `AuditMeta` discriminated union in
     `packages/validators/src/audit-meta.ts`.
  2. Add the matching string literal to `KNOWN_AUDIT_ACTIONS`.
  3. Add a switch branch in
     `apps/web/src/features/admin/audit/render-detail.tsx` (the `never`
     default fires a tsc error until you do).
  4. (Optional but consistent with peer actions) Add a humanised entry
     to `AUDIT_ACTION_LABEL_OVERRIDES`.

  **Decision:** Use kind `"business.contact_person_changed"` with payload
  `{ from: string | null; to: string | null }`. All four edits are
  explicit tasks. The render-detail switch renders a short
  "Changed contact person from X to Y" line consistent with how
  `app_setting.updated` is rendered today.

- **Concern:** The plan assumed `updateBusinessOp` already audits
  field-level diffs. It doesn't — only archive/restore/owner-assign
  flows write to `audit_log` today (confirmed by grep on
  `packages/services/src/businesses/service.ts`). And the service-level
  `updateBusiness(db, id, data)` takes no `CallerContext`, so it can't
  call `createAudit(db)` with an `actorId`.

  **Decision:** Change the service signature to
  `updateBusiness(db: Database, ctx: CallerContext, id: string, data:
  UpdateData)` — matches `archiveBusiness` / `restoreBusiness` /
  `assignBusinessOwner`. The single caller
  (`updateBusinessOp.handler`) already has `ctx` in scope. Inside the
  service, SELECT the old `contact_person` before the UPDATE; emit
  `business.contact_person_changed` only when old !== new.

- **Concern:** The query layer has a single `toBusiness(row, images,
  extras)` mapper used by every read path
  (`packages/services/src/businesses/queries.ts:495`). Adding
  `contact_person` to its output would surface the field on public
  payloads via `safeParse`-strip (see next concern). Adding it
  conditionally needs a fork or a flag.

  **Decision:** Add a `toBusinessAdmin(row, images, extras)` mapper that
  spreads the public `toBusiness` output and appends `contact_person:
  row.contact_person ?? null`. Add an `attachRelationsAdmin` helper
  that mirrors `attachRelations` but uses `toBusinessAdmin`. Use it
  in `getBusinessByIdIncludingArchived`, `getAllBusinesses`, and
  `createBusiness` — those three are admin-only call sites. Public
  queries (`getFeaturedBusinesses`, `getBusinessesByCategory`,
  `getBusinessById`, etc.) continue to use the existing public
  helpers. The two functions stay tiny and the type system enforces
  the boundary (return type widens from `Business` to `BusinessAdmin`
  on the admin paths).

- **Concern:** Plan's public-leakage acceptance criterion ("parse the
  response with `BusinessSchema` and confirm no extra keys") doesn't
  work — Zod's `safeParse` on a non-strict object SCHEMA silently
  strips unknown keys. The check would always pass even if the API
  did leak the field.

  **Decision:** Verification is a raw-body inspection — the test/
  manual check fetches `/api/v1/businesses` and
  `/api/v1/businesses/:id` and asserts `JSON.parse(body)` has no
  `contact_person` key. `defineOperation` strip-on-output is fine as a
  *defense*, but it's not what we test the contract with. The
  `BusinessSchema.strict()` refactor remains out of scope here
  (separate plan if anyone wants belt-and-braces).

- **Concern:** `BusinessUpdateOutputSchema` is currently typed with
  the public `BusinessSchema` but only admins can call the op. Plan
  flagged this; reviewer agrees switching it to admin shape is
  correct and a small fix.

  **Decision:** Switch `BusinessUpdateOutputSchema.business` to
  `BusinessAdminSchema` in the same task that introduces
  `BusinessAdminSchema`. No additional callers need updating because
  `defineOperation`'s type inference flows through.

### Suggestions (taken or deferred)

- **Suggestion (taken):** Add `business.contact_person_changed` to
  `AUDIT_ACTION_LABEL_OVERRIDES` as "Contact person changed" so the
  dropdown / audit list reads cleanly (otherwise auto-derive produces
  "Contact person changed" anyway, so this is a no-op — but documenting
  the intent is cheap).
- **Suggestion (deferred):** Mobile app surfaces — explicitly out of
  scope per the plan. Mirror in the implementation tasks: the mobile
  app never reads `contact_person` and the admin role isn't accessible
  from mobile, so no Expo files change.
- **Suggestion (deferred):** Show the legacy linked-user "Owner" column
  on the admin businesses list table. We hid the Owner card in the
  business detail page but the list-table Owner column is unrelated
  and was not in the user's request. Leave the column alone for now.

## Decisions locked

Net new decisions made during review:

1. **Modal placement** — Contact person input lives in the **Basics**
   section of the Add Business modal, immediately after Name and
   before Category. (Plan default confirmed.)
2. **Label wording** — Field labelled **"Contact person"** in both
   modals (Add Business + Core Fields edit). (Plan default confirmed.)
3. **Admin businesses list column** — Yes, add **"Contact person"**
   as a new column on the admin businesses list table. (Reviewer
   flipped the plan default from hide → show per user direction.)
   Place between **Owner** and **Verified** so reachability fields
   sit together. Cell renders the value or an em-dash placeholder
   when null.
4. **Public-leakage verification** — Raw-body inspection of
   `/api/v1/businesses` and `/api/v1/businesses/:id` responses, not
   Zod-parse comparison.
5. **Audit action name + payload** — `business.contact_person_changed`
   with `{ from: string | null; to: string | null }`.
6. **Service signature** — `updateBusiness(db, ctx, id, data)`. The
   `_ctx` underscore prefix in the existing op handler
   (`businesses-admin.ts:78`) becomes a real `ctx` arg and gets
   forwarded to the service.

## Implementation plan

Ordered tasks for `/mlabs-code` to execute top-to-bottom. Each task is
atomic (reviewable as a single commit). The order leaves the codebase
in a working state between tasks where reasonable.

### Task 1: Add `contact_person` column + migration

- **Files:**
  - `packages/db/src/schema/businesses.ts` (edit)
  - `packages/db/drizzle/00XX_<auto>.sql` (new, generated)
- **What:** Add `contact_person: text("contact_person"),` to the
  `businesses` pgTable definition, immediately after `address`. Run
  `pnpm db:generate` to produce a non-destructive additive migration.
  Apply with `pnpm db:migrate`. No index, no FK, no default.
- **Acceptance:**
  - Generated migration is purely additive (adds the column; touches
    nothing else).
  - `pnpm db:migrate` applies cleanly on a database with rows in
    `businesses`. Existing rows have `contact_person = NULL`.
  - `pnpm typecheck` passes (no consumer references the column yet, so
    schema-only addition is type-safe).
- **Pause if:** the generated migration contains anything other than
  `ALTER TABLE businesses ADD COLUMN contact_person text` (e.g. column
  rename detection, type changes on other columns, dropped indices).

### Task 2: Register `business.contact_person_changed` audit action

- **Files:**
  - `packages/validators/src/audit-meta.ts` (edit)
  - `apps/web/src/features/admin/audit/render-detail.tsx` (edit)
- **What:**
  - Append `{ kind: "business.contact_person_changed"; from: string |
    null; to: string | null }` to the `AuditMeta` discriminated union.
  - Append `"business.contact_person_changed"` to `KNOWN_AUDIT_ACTIONS`.
  - Append `"business.contact_person_changed": "Contact person
    changed"` to `AUDIT_ACTION_LABEL_OVERRIDES`.
  - Add a `case "business.contact_person_changed":` branch to the
    render-detail switch that renders a one-line "Changed contact
    person from `<from>` to `<to>`" (treat null as "(empty)"). Look
    at the `app_setting.updated` case as a precedent for the diff
    presentation.
- **Acceptance:**
  - `pnpm typecheck` passes. The `_ActionsCoverage` compile-check
    confirms AuditMeta ↔ KNOWN_AUDIT_ACTIONS parity.
  - `render-detail.tsx`'s `never` default branch no longer fires for
    the new kind.
- **Pause if:** the `_ActionsCoverage` check still fires after edits —
  the union literal and the constants array are out of sync; do not
  patch around it with a cast.

### Task 3: Validator schema split + input fields

- **Files:**
  - `packages/validators/src/businesses.ts` (edit)
- **What:**
  - Export `BusinessAdminSchema = BusinessSchema.extend({
    contact_person: z.string().nullable() })`.
  - Export inferred TS type `BusinessAdmin = z.infer<typeof
    BusinessAdminSchema>`.
  - Add `contact_person:
    z.string().trim().min(1).max(120).nullable().optional()` to
    `BusinessCreateInputSchema`.
  - Add the same shape to `BusinessUpdateInputSchema`.
  - Update `BusinessAdminDetailOutputSchema.business` from
    `BusinessSchema.nullable()` → `BusinessAdminSchema.nullable()`.
  - Update `BusinessUpdateOutputSchema.business` from `BusinessSchema`
    → `BusinessAdminSchema`.
- **Acceptance:**
  - `pnpm --filter @aira/validators typecheck` passes.
  - Importing `BusinessAdmin` works from `apps/web` and
    `packages/services` via the existing re-exports.
  - Sending `contact_person: "x".repeat(121)` to either input schema
    yields a Zod error.

### Task 4: Query layer — admin row projection

- **Files:**
  - `packages/services/src/businesses/queries.ts` (edit)
- **What:**
  - Add a `toBusinessAdmin(row, images, extras): BusinessAdmin` mapper
    that spreads `toBusiness(...)` and appends `contact_person:
    row.contact_person ?? null`.
  - Add `attachRelationsAdmin(db, rows)` that mirrors
    `attachRelations` but uses `toBusinessAdmin`.
  - Switch `getBusinessByIdIncludingArchived` return type to
    `Promise<BusinessAdmin | null>` and use `attachRelationsAdmin`.
  - Switch `getAllBusinesses` return type to `Promise<BusinessAdmin[]>`
    and use `attachRelationsAdmin`.
  - Update `createBusiness` to (a) write `contact_person` into the
    `.values({...})` insert payload, (b) return
    `Promise<BusinessAdmin>` via `attachRelationsAdmin`.
  - Public mappers / queries (`getFeaturedBusinesses`,
    `getBusinessesByCategory`, `getBusinessesByCategoryPaged`,
    `getAllBusinessesPaged`, `getBusinessById`,
    `getBusinessesOwnedBy`) stay on `attachRelations` / `toBusiness`
    and continue to return `Business[]` with no `contact_person`.
- **Acceptance:**
  - `pnpm --filter @aira/services typecheck` passes.
  - A grep for `contact_person` in `queries.ts` shows it only in
    `toBusinessAdmin` and the `createBusiness` insert — never in
    `toBusiness` or any public mapper.

### Task 5: Service mutation — `updateBusiness` signature + audit

- **Files:**
  - `packages/services/src/businesses/service.ts` (edit)
- **What:**
  - Change `updateBusiness(db, id, data)` →
    `updateBusiness(db, ctx, id, data)` (CallerContext as second arg,
    matching `archiveBusiness` / `restoreBusiness`).
  - Before the UPDATE, when `data.contact_person !== undefined`,
    SELECT the old `contact_person` value for `id`.
  - Add `if (data.contact_person !== undefined)
    updatePayload.contact_person = data.contact_person;` to the
    per-field allow-list.
  - After computing `updatePayload` but before the DB transaction,
    if `data.contact_person !== undefined && oldValue !==
    data.contact_person`, call `createAudit(db)` with kind
    `business.contact_person_changed`, target `{ type: "business", id
    }`, meta `{ kind: "business.contact_person_changed", from:
    oldValue, to: data.contact_person }`, and
    `client: auditClient(ctx)`. **Audit BEFORE the mutation** (matches
    archive/restore convention).
  - Update return type to `Promise<BusinessAdmin | null>` (flows from
    `getBusinessByIdIncludingArchived` widening in Task 4).
- **Acceptance:**
  - `pnpm typecheck` passes across all packages.
  - Calling `updateBusiness` with no `contact_person` in `data`
    writes nothing to `audit_log`.
  - Calling `updateBusiness` with `contact_person: "Same"` when DB
    has `contact_person = "Same"` also writes nothing
    (only-when-changed semantics).
  - Calling `updateBusiness` with a new value writes exactly one row
    to `audit_log` with the correct from/to.
- **Pause if:** another caller of `updateBusiness` is introduced
  during Task 5 work (currently only `updateBusinessOp` — verified
  via grep before review).

### Task 6: Op layer — output schemas + pass ctx to updateBusiness

- **Files:**
  - `apps/web/src/server/operations/businesses-admin.ts` (edit)
- **What:**
  - Import `BusinessAdminSchema` from `@aira/validators/businesses`.
  - `AdminBusinessItemSchema` (line 36) — change the base from
    `BusinessSchema.extend({...})` to
    `BusinessAdminSchema.extend({...})` so admin list rows carry
    `contact_person`.
  - `createBusinessAdminOp.output` — change `z.object({ business:
    BusinessSchema })` to `z.object({ business: BusinessAdminSchema })`.
  - `updateBusinessOp.handler` — accept `ctx` (drop the `_ctx`
    underscore) and forward it: `businessesService.updateBusiness(db,
    ctx, id, data)`.
  - `getBusinessByIdAdminOp` and `listAllBusinessesAdminOp` need no
    schema-level edits — their outputs already wrap shapes that get
    updated centrally in Task 3.
- **Acceptance:**
  - `pnpm --filter @aira/web typecheck` passes.
  - Hitting `POST /api/v1/admin/businesses` with `contact_person:
    "Test"` returns a payload whose `business.contact_person`
    matches.

### Task 7: Add Business modal — input

- **Files:**
  - `apps/web/src/features/admin/components/business-create-form.tsx`
    (edit)
- **What:**
  - Add `const [contactPerson, setContactPerson] = useState("")` to
    the form's state group.
  - Add a Label + Input row immediately after the Name input, before
    Category. Label text: **"Contact person"**. Input id:
    `bc-contact-person`. No `required` attribute (optional field).
    Apply `maxLength={120}` on the input.
  - In `handleSubmit`'s POST body, include `contact_person:
    contactPerson.trim() || null`.
  - Match the existing field's empty-state behaviour (trim then
    coalesce to null).
- **Acceptance:**
  - Visual: the modal renders an extra Label+Input row directly
    under Name with placeholder text matching peer fields' tone.
  - Creating a business with a contact person populates the field;
    creating without it persists `null`.
  - `pnpm lint` passes; no new ESLint warnings.

### Task 8: Core Fields — preview + edit

- **Files:**
  - `apps/web/src/features/admin/components/business-detail.tsx`
    (edit)
- **What:**
  - Add a "Contact person" row to `CoreFieldsPreview` near the
    business-type / years-operating preview rows. Render
    `business.contact_person` or em-dash when null. Match the
    existing preview-row visual treatment (label + value pair).
  - Add `const [contactPerson, setContactPerson] = useState(
    business.contact_person ?? "")` to `CoreFieldsEditModal`.
  - Add a Label + Input row in the edit modal between the existing
    Name and About inputs. Label: **"Contact person"**. Input id:
    `b-contact-person`. `maxLength={120}`.
  - In the modal's `save()` `runUpdate(...)` call, add
    `contact_person: contactPerson.trim() || null` to the payload.
  - The `Business` prop type the section receives must be
    `BusinessAdmin` — the page already gets this for free via
    `BusinessAdminDetailOutputSchema.business` updating in Task 3.
    Verify by spot-check.
- **Acceptance:**
  - On `/admin/businesses/[id]`, the Core Fields section shows the
    current `contact_person` value (or em-dash).
  - Editing via the Core Fields modal saves the new value through
    `updateBusinessOp` and the change persists across page reload.
  - The audit log entry written by Task 5 appears at `/admin/audit`
    with the correct from/to rendering from Task 2.

### Task 9: Admin businesses list — column

- **Files:**
  - `apps/web/src/app/admin/businesses/page.tsx` (edit)
- **What:**
  - Add a `<th className="px-4 py-3 text-left font-semibold">Contact
    person</th>` to the thead, positioned between the Owner column
    (line 129) and Verified column (line 130).
  - Add the matching `<td>` cell in the row template rendering
    `b.contact_person` or em-dash when null. Truncate visually if
    needed via `max-w-[150px] truncate` so a long name doesn't
    blow out the row.
  - The `b.contact_person` field is already available because
    `AdminBusinessItemSchema` extends `BusinessAdminSchema` after
    Task 6.
- **Acceptance:**
  - The admin businesses list shows a new "Contact person" column
    between Owner and Verified.
  - Businesses with a contact render the name; those without render
    em-dash.
  - Table doesn't horizontally scroll on a 1280×720 viewport (verify
    by eye in dev).

### Task 10: Verification — leakage test + final checks

- **Files:**
  - (No file edits if the verification stays manual; otherwise a new
    test in `apps/web/src/server/operations/__tests__/businesses.public-leakage.test.ts`
    — pattern after existing contract tests in
    `packages/api/src/__tests__/contract.test.ts`.)
- **What:**
  - Manually `curl http://localhost:3000/api/v1/businesses` and
    `curl /api/v1/businesses/<id>` for a business that has a
    contact_person populated; assert the JSON body has NO
    `contact_person` key at the top level of each item / item.
  - Run `pnpm typecheck`, `pnpm lint`, `pnpm test` from the root.
    All must pass.
  - Grep `apps/web/src/features/listings`, `apps/web/src/app/(app)`,
    and `apps/mobile/src` for `contact_person`. Zero matches.
- **Acceptance:**
  - All three commands pass.
  - Raw-body curl asserts pass (or the new test runs green if
    automated).
  - Grep returns no matches in public surfaces.
- **Pause if:** any public payload includes `contact_person` —
  indicates a query-layer regression; don't ship.

## Open questions

Anything still unresolved that `/mlabs-code` should escalate, not guess.

- None. All four open questions in the plan are resolved in
  "Decisions locked" above. The remaining ambiguities are documented
  as `Pause if` triggers on the tasks where they could surface.
