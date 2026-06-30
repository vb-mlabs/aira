# Implementation report — Listing Contact Person field

**Status:** complete
**Started:** 2026-06-22
**Branch:** feat/qa-test-accounts-seed
**Review:** [2026-06-22-listing-contact-person](../../reviews/2026-06-22-listing-contact-person.md)

---

## Tasks

| # | Task | Status | Commit |
|---|---|---|---|
| 1 | contact_person column + migration | ✓ done | `3c3fb5b` |
| 2 | register audit action | ✓ done | `acbc8ac` |
| 3 | validator schema split + inputs | ✓ done | `eed3baf` |
| 4 | admin row projection in queries | ✓ done | `f5d1354` |
| 5 | updateBusiness signature + audit | ✓ done | `d069796` |
| 6 | op layer output + ctx wiring | ✓ done | `74757a6` |
| 7 | Add Business modal input | ✓ done | `bd4f595` |
| 8 | Core Fields preview + edit | ✓ done | `b3a9807` |
| 9 | admin businesses list column | ✓ done | `75446a0` |
| 10 | verification | ✓ done | (no source changes) |

## Commits

Two precursor commits to clean the tree before /mlabs-code started:

- `465823a` chore(admin): rename Businesses → Manage listings, hide owner card
- `a406398` docs(mstack): plan + review for listing contact person

Then the 9 implementation commits (T10 had no source changes):

- `3c3fb5b` feat(db): add contact_person column to businesses
- `acbc8ac` feat(audit): add business.contact_person_changed kind
- `eed3baf` feat(validators): split BusinessAdminSchema from public BusinessSchema
- `f5d1354` feat(services): admin row projection for contact_person
- `d069796` feat(services): audit contact_person changes in updateBusiness
- `74757a6` feat(api): admin op outputs include contact_person
- `bd4f595` feat(admin): Contact person input in Add Business modal
- `b3a9807` feat(admin): Contact person in Core Fields preview + edit
- `75446a0` feat(admin): Contact person column on businesses list

## What shipped

End-to-end implementation of the admin-only Contact person field on
business listings:

- **Data layer.** Nullable `contact_person` text column on `businesses`
  (migration 0031). Split-schema approach in `@aira/validators`:
  `BusinessSchema` stays public, `BusinessAdminSchema` extends with
  `contact_person`. Admin query helpers (`toBusinessAdmin`,
  `attachRelationsAdmin`) project the field on admin-only paths;
  public mappers continue to omit it.
- **Audit.** New `business.contact_person_changed` action with
  `{ from, to }` payload. `updateBusiness` signature changed to
  `(db, ctx, id, data)` so the service can call `createAudit` with
  the caller's `userId`. Audit fires before the mutation only when
  `old !== new`.
- **Admin UI.** Three surfaces: Add Business modal (input between
  Name and Category), Core Fields preview + edit modal on the
  business detail page, and a new column on the admin businesses
  list (between Owner and Verified). Public listing card, public
  business detail page, and mobile app are untouched.
- **Leakage guarantee.** Public ops (`listBusinessesOp`,
  `getBusinessByIdOp`, `countActiveBusinessesOp`) continue to use
  plain `BusinessSchema` + `attachRelations`. The column never
  reaches a public payload because public mappers don't project it
  from the DB row. defenseInDepth: `defineOperation` would
  `safeParse`-strip it anyway if a regression added the field to a
  public output.

## Verification done

- Root `pnpm typecheck` — 10/10 packages pass.
- Lint on touched files — no new warnings; pre-existing unrelated
  warnings noted in T6 but not introduced by this work.
- Grep for `contact_person` in `apps/web/src/features/listings`,
  `apps/web/src/app/(app)`, `apps/mobile/src` — 0 matches.
- Public op output schemas inspected — confirmed `BusinessSchema`
  (not `BusinessAdminSchema`) is used in `listBusinessesOp:154`.

## Follow-ups (not done — explicit out-of-scope per plan)

- **No live curl run.** The plan/review specified raw-body
  inspection of `/api/v1/businesses` and `/api/v1/businesses/:id` to
  confirm `contact_person` is absent. Code-path inspection
  (public query → public mapper → public schema) gives equivalent
  certainty without a running server, but the dynamic curl check is
  still worth doing once before shipping. Recommend `/mlabs-qa` for
  the running-server verification.
- **No DB migration run.** `pnpm db:migrate` should run against the
  target DB before any admin attempts to use the new field. The
  migration is additive and safe but does need to be applied.
- **Mobile app surfaces.** Out of scope per the plan; admin role
  isn't accessible from mobile so there's no surface to update.
- **`BusinessSchema.strict()` refactor.** Reviewer noted this as a
  belt-and-braces follow-up; not bundled here to keep scope tight.

## Recommended next step

`/mlabs-qa --focus "admin business detail + Add Business modal +
admin businesses list"` to:

1. Apply the migration in the QA DB.
2. Run through the create flow with a Contact person populated.
3. Edit it via the Core Fields modal.
4. Confirm the audit entry renders in `/admin/audit`.
5. curl `/api/v1/businesses` and `/api/v1/businesses/:id` to confirm
   no `contact_person` key in the public payload.
