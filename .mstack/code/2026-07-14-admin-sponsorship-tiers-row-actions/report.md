# Run report — admin sponsorship-tiers row-actions + hard-delete

**Status:** complete
**Review:** [2026-07-14-admin-sponsorship-tiers-row-actions](../../reviews/2026-07-14-admin-sponsorship-tiers-row-actions.md)
**Branch:** feat/landing-explainer-videos
**Commits:** 8

## Tasks

| # | Task | Status | Commit |
|---|---|---|---|
| 1 | SponsorshipTierListItemSchema (validator) | ✓ | bce658f |
| 2 | deleteSponsorshipTier service + list count | ✓ | fc9808d |
| 3 | deleteSponsorshipTierOp | ✓ | 722aa78 |
| 4 | DELETE /hard route | ✓ | 0cb15b6 |
| 5 | TierDeactivateConfirmDialog | ✓ | 2e40a77 |
| 6 | TierDeleteConfirmDialog | ✓ | 92bf449 |
| 7 | TierDetailsModal | ✓ | fcf0a76 |
| 8 | TierList + page.tsx rewire | ✓ | 66b7a48 |

## Verification

- `pnpm --filter @aira/validators typecheck` — clean after T1.
- `pnpm --filter @aira/services typecheck` — clean after T2.
- `pnpm --filter @aira/web typecheck` — clean after each subsequent task.
- `pnpm --filter @aira/web lint` — 0 errors (16 pre-existing warnings unrelated to this diff).
- Lefthook gates (`check-migrations`, `check-no-server-actions`, `check-contrast`) — passed on every commit.
- No `Pause if` triggers fired. Drizzle's correlated `COUNT(*)::int` subquery over `sponsorships.tier_id` compiled cleanly, same as it did on plans.

## Deviations

- **T2 required a re-write.** The initial Write to `packages/services/src/sponsorship-tiers/queries.ts` silently no-op'd (returned success but the file stayed on the old shape). Typecheck passed anyway because `defineOperation` output validation is runtime, not compile-time — the mismatch between the service's `SponsorshipTier[]` return and the op's `SponsorshipTierListOutputSchema` (now expecting `SponsorshipTierListItem[]`) would have blown up at first request. Caught by re-reading the file and re-issuing the Write. Not a real bug; noted for the run log.
- No other deviations from the review's task list.

## Files touched

**New:**
- `apps/web/src/features/admin/components/tier-deactivate-confirm-dialog.tsx`
- `apps/web/src/features/admin/components/tier-delete-confirm-dialog.tsx`
- `apps/web/src/features/admin/components/tier-details-modal.tsx`
- `apps/web/src/app/admin/settings/sponsorship-tiers/_components/tier-list.tsx`
- `apps/web/src/app/api/v1/admin/sponsorship-tiers/[id]/hard/route.ts`

**Edited:**
- `packages/validators/src/sponsorship-tiers.ts` — `SponsorshipTierListItemSchema` + type; list output swap.
- `packages/services/src/sponsorship-tiers/queries.ts` — `listSponsorshipTiers` returns items with `sponsorship_count` via correlated subquery; `.orderBy(sponsorshipTiers.priority)` preserved.
- `packages/services/src/sponsorship-tiers/service.ts` — new `deleteSponsorshipTier` + `SponsorshipTierHasSponsorshipsError`.
- `packages/services/src/sponsorship-tiers/index.ts` — export both.
- `apps/web/src/server/operations/sponsorship-tiers.ts` — new `deleteSponsorshipTierOp`.
- `apps/web/src/app/admin/settings/sponsorship-tiers/page.tsx` — thinned; warning banner + helper paragraph preserved; table markup moved to `TierList`.

**Deliberately not touched:**
- `deactivateSponsorshipTierOp`, its DELETE route, `createSponsorshipTierOp`, `updateSponsorshipTierOp` — zero regression.
- `TierForm` — untouched.
- `sponsorships-section.tsx` — reads `SponsorshipTier[]` via `apiClient.get`; runtime now carries `sponsorship_count` but the consumer only reads base fields (same story as plans).
- Base `SponsorshipTierSchema` — untouched.
- Any schema migration, FK config, or mobile file.

## Follow-ups (for future work)

- **Extract shared `ConfirmDialog` primitive.** Five instances now use the base-ui AlertDialog + useTransition + inline-error pattern: `DeleteConfirmDialog` (community posts), `PlanDeactivateConfirmDialog`, `PlanDeleteConfirmDialog`, `TierDeactivateConfirmDialog`, `TierDeleteConfirmDialog`. Extract into `apps/web/src/features/admin/components/confirm-dialog.tsx` as a single follow-up commit that touches all five call sites — deferred here per the review's decision.
- **Show sponsorship count in the tier list column.** The list op returns it now — could display as a muted cell so admins see references at a glance without opening the modal. Small polish.
- **Trailing row-actions column.** Same trade-off as plans — add if usage suggests admins want faster access than the row-click-to-modal flow.

## Recommended next step

Manual QA is fastest:
1. `pnpm dev` → visit `/admin/settings/sponsorship-tiers` as super_admin.
2. Verify the warning banner and helper paragraph still render (unchanged).
3. Click any tier row → details modal opens with priority + slot + status.
4. Create a fresh test tier that's never been attached to a sponsorship → open details → both Deactivate and Delete visible.
5. Attach a sponsorship to another tier via `/admin/businesses/<id>` → open its details → only Deactivate visible; Delete hidden.
6. Race check: open a 0-sponsorship tier's details in tab A; attach a sponsorship in tab B; back in tab A tap Delete → dialog surfaces the specific `sponsorship_tier.has_sponsorships` inline message without closing.

For a Playwright sweep, `/mlabs-qa` with focus "admin sponsorship-tiers row-click + delete flow with FK race" covers the interesting paths.
