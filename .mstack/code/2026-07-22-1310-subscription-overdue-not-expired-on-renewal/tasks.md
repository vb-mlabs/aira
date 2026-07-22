# Implementation: subscription overdue→expired on renewal (Option A)

**Started:** 2026-07-22 13:22
**Debug report:** [report](../../debug/2026-07-22-1310-subscription-overdue-not-expired-on-renewal/report.md)
**Branch:** feat/landing-explainer-videos
**Status:** complete

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [x] **Task 1:** Add `deriveDisplayStatus` helper + co-located test
  - Files:
    - `apps/web/src/features/admin/components/subscription-display-status.ts`
    - `apps/web/src/features/admin/components/subscription-display-status.test.ts`
  - Verification: 4/4 vitest cases pass (`pnpm --filter @aira/web exec vitest run src/features/admin/components/subscription-display-status.test.ts`)
  - Commit: `4ffbcf4` — feat(admin/subscriptions): add deriveDisplayStatus helper

- [x] **Task 2:** Wire `subscriptions-section.tsx` through the derivation
  - Files:
    - `apps/web/src/features/admin/components/subscriptions-section.tsx`
  - Verification: `pnpm --filter @aira/web typecheck` clean; `pnpm --filter @aira/web lint` 0 errors; derivation test still passes
  - Commit: `51c90d4` — fix(admin/subscriptions): show superseded rows as Expired instead of stale Overdue
