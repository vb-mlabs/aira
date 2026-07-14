# Review: admin sponsorship-tiers — row-click details modal + edit/deactivate/delete

**Date:** 2026-07-14
**Slug:** 2026-07-14-admin-sponsorship-tiers-row-actions
**Plan reviewed:** [2026-07-14-admin-sponsorship-tiers-row-actions.md](../plans/2026-07-14-admin-sponsorship-tiers-row-actions.md)
**Status:** approved
**UI-Significant:** yes
**Reviewer:** /mlabs-review (framer@millionlabs.co.uk, via /mlabs-auto)

---

## Summary

Plan is a direct application of the membership-plans row-actions + hard-delete cycles we just shipped, combined into one pipeline. Discovery during review turned up two implementation notes worth calling out: (a) `listSponsorshipTiers` currently `.orderBy(sponsorshipTiers.priority)` — the count subquery needs to preserve that ordering; (b) `toSponsorshipTier` casts `display_slot` from `text` to the `DisplaySlot` union — the new list-item mapper must keep the cast. Otherwise this is a mechanical mirror.

All three plan-level open questions locked to their recommended defaults without an AskUserQuestion round — same patterns the user approved in the plans cycles, no new UX decisions.

**UI-Significant heuristic:** New components (`tier-details-modal.tsx`, `tier-deactivate-confirm-dialog.tsx`, `tier-delete-confirm-dialog.tsx`) under `apps/web/src/features/admin/components/` plus edited `page.tsx`. That's ≥3 files under qualifying paths, so **UI-Significant = yes**. But this is a straight port of the plans modal shape — mockups would explore variations we already validated on plans. Recommend skipping to code.

## Findings

### Blockers (must fix before /mlabs-code)

None.

### Concerns (raised, decided, recorded)

- **Concern:** `listSponsorshipTiers` currently uses `.orderBy(sponsorshipTiers.priority)` — priority ordering is functional (lower = better placement). The count subquery must not break this.
  **Decision:** the new query keeps `.orderBy(sponsorshipTiers.priority)` on the outer query. Correlated subquery for count doesn't affect outer ordering.

- **Concern:** `toSponsorshipTier` casts `row.display_slot as DisplaySlot` because the DB column is `text` with a CHECK constraint. The new list-item mapper must preserve this cast or callers get `string` instead of the union type.
  **Decision:** list-item mapper reuses `toSponsorshipTier` for the base fields, then spreads `subscription_count`. Cast is inherited.

- **Concern:** `sponsorships-section.tsx` fetches `SponsorshipTier[]` via `apiClient.get<{ items: SponsorshipTier[] }>` at `/api/v1/admin/sponsorship-tiers?includeInactive=false`. After the list-op switch to `SponsorshipTierListItem[]`, that consumer receives rows with `sponsorship_count` at runtime but its generic still says `SponsorshipTier[]`. Same shape as plans — runtime safe (only reads base fields), types stay honest.
  **Decision:** leave `sponsorships-section.tsx` untouched. Same call recorded in the plans review.

- **Concern:** the "Delete permanently" button on the tier's confirm dialog — since sponsorships have `onDelete: "set null"`, deleting a tier with references would silently nullify referencing sponsorship rows. Service-side count guard prevents this. Client-side hide is polish.
  **Decision:** unchanged — service guard is source of truth, matches plans pattern.

- **Concern:** the warning banner (unclassified high-priority tiers) filter runs over the plans array in `page.tsx`. After the item-shape swap, `t.active && t.display_slot === "regular" && t.priority <= 5` still works — extra `sponsorship_count` field is invisible to the filter.
  **Decision:** no change needed to the banner logic.

### Suggestions (taken)

- **Taken.** Ordering: validator → service → op → route → confirm dialogs → details modal → page rewire. Every commit leaves the app in a working state. Same shape as the plans cycles.

## Decisions locked

1. **Route path:** `DELETE /api/v1/admin/sponsorship-tiers/[id]/hard`. Existing DELETE endpoint (deactivate) stays.
2. **Shared ConfirmDialog:** deferred to a dedicated follow-up commit after this ships. Five instances now; extract in one clean PR that touches all five.
3. **Modal footer button order:** Deactivate | Delete | Edit (left → right). Matches plans lock.
4. **Domain-error helper:** `ApiError.badRequest("sponsorship_tier.has_sponsorships", "...")`. No `.conflict` helper needed.
5. **List schema shape:** new `SponsorshipTierListItemSchema` extends `SponsorshipTierSchema` with `sponsorship_count`. `SponsorshipTierListOutputSchema.items` swaps to the item shape. Base untouched.
6. **Delete visibility rule:** `tier.sponsorship_count === 0`.
7. **Deactivate visibility rule:** `tier.active === true`.
8. **Task granularity for confirm dialogs:** one commit per dialog (T5 + T6) — matches plans-cycle granularity, keeps commits atomic.

## Implementation plan

Ordered tasks. Each = one commit. Server foundations first, UI last.

### Task 1: Validator — SponsorshipTierListItemSchema

- **Files:** `packages/validators/src/sponsorship-tiers.ts` (edit)
- **What:** Add `SponsorshipTierListItemSchema = SponsorshipTierSchema.extend({ sponsorship_count: z.number().int().nonnegative() })`. Export `SponsorshipTierListItem = z.infer<...>`. Swap `SponsorshipTierListOutputSchema.items` to `z.array(SponsorshipTierListItemSchema)`. Base schema untouched.
- **Acceptance:** `pnpm --filter @aira/validators typecheck` clean.

### Task 2: Service — extended list + new deleteSponsorshipTier

- **Files:** `packages/services/src/sponsorship-tiers/queries.ts` (edit) · `packages/services/src/sponsorship-tiers/service.ts` (edit) · `packages/services/src/sponsorship-tiers/index.ts` (edit — export new fn + error class)
- **What:**
  - `queries.ts`: `listSponsorshipTiers` returns `Promise<SponsorshipTierListItem[]>`. Correlated `COUNT(*)::int` subquery over `sponsorships.tier_id`. Preserve `.orderBy(sponsorshipTiers.priority)`. Reuse `toSponsorshipTier` for base fields; spread `sponsorship_count` on the returned object.
  - `service.ts`: new `deleteSponsorshipTier(db, id)` + `SponsorshipTierHasSponsorshipsError` domain error class. Count check first over `sponsorships.tier_id`; refuse with the error if > 0; else DELETE + return the row.
  - `index.ts`: export the new function + error class.
- **Acceptance:** `pnpm --filter @aira/services typecheck` clean.
- **Pause if:** Drizzle's correlated subquery expression fights the type checker (same risk noted in the plans cycle; didn't trigger there, unlikely here). Surface the exact TS error and confirm.

### Task 3: Operation — deleteSponsorshipTierOp

- **Files:** `apps/web/src/server/operations/sponsorship-tiers.ts` (edit)
- **What:** Mirror of `deleteMembershipPlanOp`. Permission `super_admin`, input `{ id }`, output `{ tier: z.any() }`. Handler wraps service call; catches `SponsorshipTierHasSponsorshipsError` and rethrows as `ApiError.badRequest("sponsorship_tier.has_sponsorships", err.message)`; throws `ApiError.notFound(...)` when service returns null.
- **Acceptance:** `pnpm --filter @aira/web typecheck` clean.

### Task 4: HTTP route — DELETE /hard

- **Files:** `apps/web/src/app/api/v1/admin/sponsorship-tiers/[id]/hard/route.ts` (new)
- **What:** Two-line file mounting `deleteSponsorshipTierOp.runFromRequest` on DELETE. Same shape as the plans equivalent.
- **Acceptance:** typecheck clean; route resolves.

### Task 5: UI — TierDeactivateConfirmDialog

- **Files:** `apps/web/src/features/admin/components/tier-deactivate-confirm-dialog.tsx` (new)
- **What:** Mirror of `plan-deactivate-confirm-dialog.tsx`. Props `{ tier, open, onClose, onDeactivated }`. Hits `DELETE /api/v1/admin/sponsorship-tiers/${tier.id}`. Copy: "Deactivate '{tier.name}'? Existing sponsorships on this tier stay active until they expire; new sponsorships cannot be created against it. Reversible by editing the tier and toggling Active back on." Button label "Deactivate".
- **Acceptance:** typecheck clean; component renders with a fake tier.

### Task 6: UI — TierDeleteConfirmDialog

- **Files:** `apps/web/src/features/admin/components/tier-delete-confirm-dialog.tsx` (new)
- **What:** Mirror of `plan-delete-confirm-dialog.tsx`. Props `{ tier, open, onClose, onDeleted }`. Hits `DELETE /api/v1/admin/sponsorship-tiers/${tier.id}/hard`. Copy: "Delete tier permanently? '{tier.name}' will be removed from the database. This cannot be undone. No sponsorships currently reference this tier." Handles `ApiError.code === "sponsorship_tier.has_sponsorships"` inline with "A sponsorship was created after this list was loaded. Refresh and Deactivate instead to retire the tier without losing history." Button label "Delete permanently".
- **Acceptance:** typecheck clean.

### Task 7: UI — TierDetailsModal

- **Files:** `apps/web/src/features/admin/components/tier-details-modal.tsx` (new)
- **What:** Mirror of `plan-details-modal.tsx`. Props `{ tier: SponsorshipTierListItem | null, onClose }`. Header: tier name + AdminBadge for status. Body dl: Priority (`{tier.priority}` with muted "Lower = better placement" hint), Display slot (`{DISPLAY_SLOT_LABELS[tier.display_slot]}`), City, Updated. Footer: Deactivate | Delete | Edit in that order. Deactivate rendered when `tier.active === true` (opens `TierDeactivateConfirmDialog`); Delete rendered when `tier.sponsorship_count === 0` (opens `TierDeleteConfirmDialog`); Edit closes modal + `router.push('/admin/settings/sponsorship-tiers/${tier.id}')`. Success handlers close both modals + `router.refresh()`.
- **Acceptance:** typecheck clean; buttons render per visibility rules.

### Task 8: UI — TierList client component + page.tsx rewire

- **Files:** `apps/web/src/app/admin/settings/sponsorship-tiers/_components/tier-list.tsx` (new) · `apps/web/src/app/admin/settings/sponsorship-tiers/page.tsx` (edit)
- **What:**
  - New `TierList` Client Component. Accepts `tiers: SponsorshipTierListItem[]`. Owns `openId` state. Renders the existing table markup with three interaction changes: whole `<tr>` clickable via `onClick` + `role="button"` + `tabIndex={0}` + `onKeyDown` (Enter/Space); tier name is plain text (no `<Link>`); mounts `<TierDetailsModal tier={openTier} onClose={() => setOpenId(null)} />`.
  - Edit `page.tsx`: keep the fetch + header + warning banner + empty-state branch + helper paragraph. Replace the inline `<table>` markup with `<TierList tiers={tiers} />`. Drop the `<Link>` import if no longer used on page.
- **Acceptance:** row-click opens the modal; keyboard Enter/Space open the modal; Escape closes it; warning banner + helper paragraph still visible; `pnpm typecheck` + `pnpm lint` + `pnpm --filter @aira/web build` all clean.

## Open questions

None. All three plan-level opens resolved above; two review-surfaced implementation notes (orderBy preservation, display_slot cast reuse) folded into Task 2's what.
