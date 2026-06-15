# Implementation report: Membership-plan-derived placement tier

**Status:** complete
**Review:** [2026-06-15-membership-plan-tier](../../reviews/2026-06-15-membership-plan-tier.md)
**Branch:** feat/rest-api-migration

## Tasks

| # | Status | Task | Commit |
|---|---|---|---|
| 1 | ✓ done | `tier` column on `membership_plan` + migration 0025 | `b5e266e` |
| 2 | ✓ done | `TIER_LABELS` exported from `@aira/validators/businesses` | `0989762` |
| 3 | ✓ done | `tier` added to MembershipPlan validators; stripped from Business write schemas | `3b38df2` |
| 4 | ✓ done | `findActivePaidPlansForBusiness` + `recomputeBusinessTier` helpers | `fd43848` |
| 5 | ✓ done | Subscription mutations wrapped in `db.transaction` + recompute fires | `d4dc9c4` |
| 6 | ✓ done | `createBusiness` drops explicit `tier:` insert | `3b38df2` (bundled with Task 3) |
| 7 | ✓ done | One-shot backfill cron + `/admin/cron` Run-now button | `7b9857b` |
| 8 | ✓ done | Membership plan UI — tier `<select>` + list-page chip | `c54fb3e` |
| 9 | ✓ done | Admin business detail — tier dropdown gone; per-sub chip in SubscriptionsSection | `630b266` |
| 10 | ✓ done | Admin businesses list table — `TIER_LABELS` in Tier column | `24ad3fb` |
| 11 | ✓ done | Public listings — `TIER_LABELS` everywhere; tier2 "Featured" → "Sponsored Level 2" | `2425978` |

## Commits (chronological)

```
adb1d10 feat(admin): preview + edit-modal pattern across business-detail sections   ← pre-flight cleanup of in-flight UX work
b5e266e feat(db): add tier column to membership_plan
0989762 feat(validators): export TIER_LABELS — single source of truth for tier UI labels
3b38df2 feat(validators): add tier to MembershipPlan; strip from Business write schemas
fd43848 feat(services): findActivePaidPlansForBusiness + recomputeBusinessTier
d4dc9c4 feat(services): wrap subscription mutations in db.transaction + fire recompute
7b9857b feat(admin): one-shot backfill-business-tiers cron + Run-now button
c54fb3e feat(admin): membership-plan tier picker + list-page chip
630b266 feat(admin): drop tier dropdown from Core Fields; per-sub tier chip in Subscriptions
24ad3fb feat(admin): businesses list table — Tier column uses TIER_LABELS
2425978 feat(listings): TIER_LABELS everywhere; fix tier2 "Featured" → "Sponsored Level 2"
```

## Verification

- `pnpm typecheck` — 10/10 packages pass (turbo: 8 cached, 2 fresh)
- `pnpm --filter @aira/services test` — 63/63 tests pass across 8 test files (5 new recompute-tier tests + 4 new recompute-wiring tests added this run)
- `pnpm --filter @aira/web test` — 164/164 tests pass across 18 test files
- Lefthook (`check-migrations`, `check-no-server-actions`, `check-contrast`) green on every commit

## Decisions worth knowing

- **Task 6 bundled into Task 3.** Removing `tier` from `BusinessCreateInputSchema` made `createBusiness`'s `tier: input.tier` insert column untyped. Couldn't split into two commits without leaving the build red between them, so the schema validator change and the service insert change ship together.
- **`tx as unknown as Database` at `recomputeBusinessTier` call sites.** Drizzle's `db.transaction((tx) => ...)` callback gives a `PgTransaction` that lacks the `$client` field on `NeonDatabase`. The cast matches the convention already in the messages-service test mock (`packages/services/src/messages/__tests__/service.test.ts:261`).
- **`rolloverExpiredSubscriptions` dedupes affected business_ids** before firing the recompute (one business can have multiple paid subs flip in the same run). The bulk UPDATE + per-business recompute all share one `db.transaction(...)` so a mid-flight failure rolls the whole flip back.
- **`backfillBusinessTiersFromActivePaidSubscriptions` registered but NOT scheduled.** It's a manual one-shot exposed under `/admin/cron` for post-deploy + recovery. Idempotent — re-running yields `updated: 0`.
- **SubscriptionsSection client-fetches the plan list** to render the per-row tier chip. The `/api/v1/admin/businesses/[id]/subscriptions` payload doesn't include plan info; the section now maintains a `Map<plan_id, MembershipPlan>` alongside the subs list.
- **Tier-section "Regular Listings" → "Regular"** to keep the single-source-of-truth invariant. Every UI surface (admin tables, plan picker, public business card badge, tier-section heading) now reads the label from `TIER_LABELS`.
- **`BusinessSchema.tier` (wire shape) stays on tier1/tier2/tier3 codes.** Mobile + web both import `TIER_LABELS` from `@aira/validators` — no `tier_label` field on the wire.

## Follow-ups

- **Existing membership plans were backfilled to `tier3` by the column-add migration.** Admin manually upgrades plans that should grant Sponsored or Sponsored Level 2 placement. **Important**: until plan tiers are reviewed, no business gets premium placement from a subscription — they all collapse to Regular.
- **Run the one-shot backfill** (`/admin/cron` → `backfill-business-tiers` → Run now) after the deploy to bring every business's `tier` column in line with its active-paid subscriptions. Without this, the column reflects whatever was set manually before the schema change.
- **`businesses.tier` column** could be removed entirely in a future plan (pure derivation at read time). Re-evaluate if any drift recurs.
- **Mobile (Expo) admin UI** for editing membership plans — admin is web-only today; mobile admin remains a separate plan.
- **`Business.tier` cast in admin/businesses page.tsx** — the listAllBusinessesAdmin operation returns the column as `string`; cast to `BusinessTier` at the cell. If the admin-list operation tightens its output schema to `BusinessTierSchema`, the cast can go away.
- **Per-tier color signal** on chips using the existing `tier1`/`tier2`/`tier3` design tokens — would help support staff scan a long subscription list at a glance.

## Recommended next step

`/mlabs-qa` focused on the new tier-derivation flow. Suggested scenarios:

1. Create a membership plan with Sponsored (tier1); subscribe a business to it with `payment_status='paid'`; verify the public business-card shows the Sponsored badge and the listings page sorts it into the Sponsored section.
2. Flip that subscription to `overdue` (or wait for the rollover cron); verify the public render collapses to Regular (the column may still show tier1, but the public read uses EFFECTIVE_TIER which gates on IS_PAID_ACTIVE).
3. Delete the only active paid subscription; verify `businesses.tier` rewrites to tier3 inside the same transaction.
4. Run `backfill-business-tiers` from `/admin/cron`; verify the cron_runs log shows the count of changed rows and re-running yields `updated: 0`.
5. Try POSTing `tier: "tier1"` to `/api/v1/admin/businesses` with curl — verify the response is a 400 Zod `unrecognized_keys` error.
6. SubscriptionsSection per-row chip: create subs with mixed plans (tier1, tier2, tier3, no-plan) and verify each row shows the right placement chip or `—`.
