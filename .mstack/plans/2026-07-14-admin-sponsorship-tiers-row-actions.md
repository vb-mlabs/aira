# Plan: admin sponsorship-tiers — row-click details modal + edit/deactivate/delete

**Date:** 2026-07-14
**Slug:** 2026-07-14-admin-sponsorship-tiers-row-actions
**Status:** reviewed
**Author:** /mlabs-plan (framer@millionlabs.co.uk, via /mlabs-auto)

---

## Problem

The `/admin/settings/sponsorship-tiers` list page suffers the same two issues we just fixed on the sibling membership-plans list — a tiny inline plan-name link as the only way to open a tier, and no way to delete a tier ever (not even soft-delete via the UI; `deactivateSponsorshipTierOp` exists but the button doesn't). Applying the same treatment for consistency across the admin surface: whole row clickable, details modal with Deactivate / Delete / Edit footer, hard-delete gated on `sponsorship_count === 0`.

Two extras unique to the tiers page must survive the refactor: (a) the warning banner above the table that flags migration-seeded rows still sitting at `display_slot === 'regular'` with `priority <= 5`; (b) the explanatory paragraph below the table about priority + slot semantics. Both live on the page shell (Server Component) and are unaffected by moving the table into a Client Component.

## Scope

**In:**

- New `SponsorshipTierListItemSchema = SponsorshipTierSchema.extend({ sponsorship_count: z.number().int().nonnegative() })` in `packages/validators/src/sponsorship-tiers.ts`. `SponsorshipTierListOutputSchema` swaps to the item shape. Base `SponsorshipTierSchema` untouched.
- Extend `listSponsorshipTiers` in `packages/services/src/sponsorship-tiers/queries.ts` to return items with `sponsorship_count` via correlated `COUNT(*)::int` subquery over `sponsorships.tier_id`.
- New `deleteSponsorshipTier(db, id)` service + `SponsorshipTierHasSponsorshipsError` domain error class in `packages/services/src/sponsorship-tiers/service.ts`. Same shape as `deleteMembershipPlan` — count check first, refuse with the error if > 0, else DELETE + return the row.
- Export the new function + error class from `packages/services/src/sponsorship-tiers/index.ts`.
- New `deleteSponsorshipTierOp` in `apps/web/src/server/operations/sponsorship-tiers.ts`. Permission `super_admin`, translates the domain error to `ApiError.badRequest("sponsorship_tier.has_sponsorships", ...)`.
- New HTTP route `apps/web/src/app/api/v1/admin/sponsorship-tiers/[id]/hard/route.ts` exposing DELETE via `deleteSponsorshipTierOp.runFromRequest`. Existing `[id]/route.ts` (PATCH=update, DELETE=deactivate) untouched.
- New UI components under `apps/web/src/features/admin/components/`:
  - `tier-deactivate-confirm-dialog.tsx` — mirror of `plan-deactivate-confirm-dialog.tsx`. Hits `DELETE /api/v1/admin/sponsorship-tiers/${id}`. Copy: "Deactivate '{name}'? Existing sponsorships on this tier stay active until they expire; new sponsorships cannot be created against it. Reversible by editing the tier and toggling Active back on."
  - `tier-delete-confirm-dialog.tsx` — mirror of `plan-delete-confirm-dialog.tsx`. Hits `DELETE /api/v1/admin/sponsorship-tiers/${id}/hard`. Handles the `sponsorship_tier.has_sponsorships` error code inline with a "refresh and Deactivate instead" message.
  - `tier-details-modal.tsx` — mirror of `plan-details-modal.tsx`. Read-only summary: name (heading + AdminBadge for status), priority (numeric with muted "Lower = better" hint), display_slot (via `DISPLAY_SLOT_LABELS[tier.display_slot]`), city_id, updated_at. Footer: Deactivate | Delete | Edit in that order. Deactivate rendered when `tier.active === true`; Delete rendered when `tier.sponsorship_count === 0`; Edit navigates to `/admin/settings/sponsorship-tiers/${id}` (existing intercept-routed edit modal opens on top).
- New `apps/web/src/app/admin/settings/sponsorship-tiers/_components/tier-list.tsx` — Client Component owning row-click state, replaces the current inline table markup, mounts `TierDetailsModal`. Row is `role="button"`, keyboard-accessible via `tabIndex={0}` + `onKeyDown` for Enter/Space, tier name is plain text (no `<Link>`).
- Edit `apps/web/src/app/admin/settings/sponsorship-tiers/page.tsx` — thinned to fetch + hand off. Keeps the header (title + New-tier button), the warning banner (unclassified high-priority tiers), the empty-state branch, and the helper paragraph. Only the inline `<table>` markup gets replaced with `<TierList tiers={tiers} />`.

**Out (deferred):**

- Cascade-delete of sponsorships along with the tier — never; sponsorships represent real billing history. FK `onDelete: "set null"` remains as a safety net if the service-side race is ever lost, but the service refuses on the count check first.
- Extract a shared `ConfirmDialog` primitive across the five destructive-action dialogs (community `DeleteConfirmDialog`, `PlanDeactivateConfirmDialog`, `PlanDeleteConfirmDialog`, and the two new tier dialogs). Recommended as a dedicated follow-up commit after this ships — five call sites is a real refactor, deserves its own review surface. Each dialog carries slightly different copy anyway.
- Bulk operations, restore of hard-deleted tiers (impossible by definition), mobile changes, warning-banner logic changes, `TierForm` changes, schema migrations.
- Any change to the `deactivateSponsorshipTierOp` path or the existing DELETE route contract.

## Approach

**Chosen path — same shape as the membership-plans hard-delete + row-actions cycles, applied in one pipeline since the pattern is proven.**

Mirror commits from the plans cycle:
1. Validator schema (list-item extends base with count) — protect existing consumers.
2. Service: extend list to return items with count; new `deleteSponsorshipTier` service + domain error class.
3. Op: new `deleteSponsorshipTierOp` (super_admin, translates error).
4. Route: new `/hard` DELETE endpoint.
5. UI confirm dialogs (both Deactivate + Delete).
6. UI details modal.
7. UI list Client Component + rewire `page.tsx`.

Ordered so each commit leaves the app in a working state. UI wiring lands last (T6 details modal, T7 page.tsx rewire).

**Alternatives considered:**

- **Batch T6 + T7 into one commit ("all UI").** Rejected — keeping the details modal separate from the page rewire preserves the useful review surface pattern from the plans cycle. Modal in isolation is testable; page rewire is a small mechanical follow-up.
- **Delete only when `active === false`** (require Deactivate first before Delete allowed). Rejected — imposes friction for a legitimate "created by mistake, still active" flow. The `sponsorship_count === 0` guard is the right invariant; active/inactive is orthogonal.
- **Show Deactivate + Delete as trailing-column icons on each row instead of inside the details modal.** Rejected — the row-click-to-modal-then-action pattern is the one we just locked for plans; consistency matters more than one-click access for a rare-use admin screen.
- **Extract shared ConfirmDialog now.** Rejected as noted above — five call sites plus this feature is too much for one review. Defer.

## Data model changes

None. No schema migration. Existing `sponsorships.tier_id` FK config (`onDelete: "set null"`) stays.

## Files to touch

**New:**
- `apps/web/src/features/admin/components/tier-deactivate-confirm-dialog.tsx`
- `apps/web/src/features/admin/components/tier-delete-confirm-dialog.tsx`
- `apps/web/src/features/admin/components/tier-details-modal.tsx`
- `apps/web/src/app/admin/settings/sponsorship-tiers/_components/tier-list.tsx`
- `apps/web/src/app/api/v1/admin/sponsorship-tiers/[id]/hard/route.ts`

**Edit:**
- `packages/validators/src/sponsorship-tiers.ts` — `SponsorshipTierListItemSchema`, `SponsorshipTierListItem` type, `SponsorshipTierListOutputSchema.items` swap.
- `packages/services/src/sponsorship-tiers/queries.ts` — extend `listSponsorshipTiers` with subscription count.
- `packages/services/src/sponsorship-tiers/service.ts` — new `deleteSponsorshipTier` + `SponsorshipTierHasSponsorshipsError`.
- `packages/services/src/sponsorship-tiers/index.ts` — export both.
- `apps/web/src/server/operations/sponsorship-tiers.ts` — new `deleteSponsorshipTierOp`.
- `apps/web/src/app/admin/settings/sponsorship-tiers/page.tsx` — thin to Server Component, hand off to `TierList`, preserve warning + helper.

**Do not touch:**
- `deactivateSponsorshipTierOp`, its route, or the create/update ops.
- `TierForm` component.
- Existing plan-* components (they stay independent; not reused for tiers).
- Base `SponsorshipTierSchema` (protects consumers of the vanilla type).
- Schema files, migrations, FK configs.

## Edge cases

- **Race: sponsorship created between list fetch and Delete click.** UI shows Delete (count was 0). Admin clicks Delete. Server's count check runs fresh — count is now 1. Server returns 400 with `code: "sponsorship_tier.has_sponsorships"`. Confirm dialog shows the specific race message inline; admin can Cancel or refresh.
- **Tier is already inactive AND has no sponsorships.** Delete button renders; Deactivate does not. Correct.
- **Tier is active AND has no sponsorships.** Both Delete and Deactivate render. Admin picks.
- **Tier is active AND has sponsorships.** Only Deactivate. Delete hidden.
- **Tier is inactive AND has sponsorships.** Neither. Modal is read-only. Correct — the tier's job is historical reference at this point.
- **`display_slot === 'regular'` with `priority <= 5`.** Warning banner on page.tsx already surfaces these. The details modal doesn't need to duplicate the warning (banner covers the "you probably want to reclassify" case). If reclassify feels friction, admin uses Edit.
- **Warning-banner query.** After `listSponsorshipTiers` returns items with `sponsorship_count`, the banner filter (`t.active && t.display_slot === "regular" && t.priority <= 5`) still runs on the same array — extra field is invisible.
- **`sponsorship_count` performance.** Same shape as plans: correlated `COUNT(*)::int` per tier over ~5–20 tiers. Negligible. If perf ever matters, swap to `LEFT JOIN + GROUP BY`.
- **Concurrent admin actions.** Two super_admins delete the same tier. First wins; second gets 404 (row gone). Op rethrows as `ApiError.notFound(...)`.
- **`SponsorshipTierListOutputSchema` output validator.** After the item shape swap, the op's runtime validation now expects `sponsorship_count` on every item. If any test snapshot depends on the old shape, it'll fail — verify no fixture/mock references the old shape without the count.
- **Other consumers of `SponsorshipTier` type.** Grep-check reveals sponsorships-section fetches, plan/tier form callers, etc. All read the base `SponsorshipTier` fields — adding `sponsorship_count` to the base would ripple; keeping it list-item-only avoids that.

## Acceptance criteria

- [ ] `SponsorshipTierListItemSchema` exists in validators, extends base with `sponsorship_count: z.number().int().nonnegative()`.
- [ ] `listSponsorshipTiers` returns items with `sponsorship_count` populated correctly (verify on a tier with known sponsorship count).
- [ ] `deleteSponsorshipTier` service refuses when `sponsorships.tier_id = id` count > 0 (throws `SponsorshipTierHasSponsorshipsError`); succeeds and returns the deleted row otherwise.
- [ ] `deleteSponsorshipTierOp` exists, permission `super_admin`, translates the domain error to `ApiError.badRequest("sponsorship_tier.has_sponsorships", ...)`.
- [ ] `DELETE /api/v1/admin/sponsorship-tiers/[id]/hard` route exists and mounts the op.
- [ ] `TierDeactivateConfirmDialog` and `TierDeleteConfirmDialog` components exist; the delete one handles the `sponsorship_tier.has_sponsorships` error code inline with a specific message.
- [ ] `TierDetailsModal` renders name / priority / display_slot / status / updated_at; footer has Deactivate | Delete | Edit with the visibility rules above.
- [ ] Row click on the tier list opens the modal (whole `<tr>` clickable, keyboard-accessible).
- [ ] Tier name is plain text in the row (no `<Link>`, no `text-primary hover:underline`).
- [ ] Warning banner and helper paragraph still render on the page after the refactor.
- [ ] `pnpm --filter @aira/validators typecheck`, `pnpm --filter @aira/services typecheck`, `pnpm --filter @aira/web typecheck` — all clean.
- [ ] `pnpm --filter @aira/web build` succeeds.
- [ ] Existing Deactivate route (`DELETE /api/v1/admin/sponsorship-tiers/[id]`) still soft-deletes correctly.
- [ ] No mobile changes.
- [ ] No schema migration.

## Open questions

For `/mlabs-review` to resolve before implementation:

1. **Details modal contents.** The plan modal shows description + price + duration. The tier equivalent has priority + display_slot but NO description field. Should the modal show anything else — a "recent sponsorships" summary, the raw slot key alongside the human label, a hint about what "priority" means? Recommend: keep it minimal (name, priority with a small "lower = better" hint, display_slot as label, status, updated). Match plan modal's compactness. Additional context lives in the helper paragraph on the page and in the Edit form.

2. **Shared ConfirmDialog extraction.** Five instances now — is this the moment? Recommend: defer to a dedicated follow-up commit after this ships. Extracting mid-feature adds noise; the follow-up is small enough to be one clean PR.

3. **Order of tasks — combine the two Confirm dialogs into one task or separate?** Two very similar components with different copy. Recommend: one task per dialog (T5 + T6) matches the plan cycle's granularity and keeps commits atomic. Or fold both into one "T5: tier confirm dialogs (both)" if you prefer fewer commits. Reviewer's call.
