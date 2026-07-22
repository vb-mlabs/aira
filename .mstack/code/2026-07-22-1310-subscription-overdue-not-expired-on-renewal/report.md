---
name: subscription-overdue-not-expired-on-renewal
description: /mlabs-code implementation report — Option A (UI-only derived status)
---

# Implementation report — subscription overdue→expired on renewal

**Debug report:** [.mstack/debug/2026-07-22-1310-subscription-overdue-not-expired-on-renewal/report.md](../../debug/2026-07-22-1310-subscription-overdue-not-expired-on-renewal/report.md)
**Branch:** feat/landing-explainer-videos
**Status:** complete
**Started:** 2026-07-22 13:22
**Finished:** 2026-07-22 13:29

## Tasks

| # | Result | Commit | Description |
|---|--------|--------|-------------|
| 1 | ✓ done | `4ffbcf4` | Add `deriveDisplayStatus` helper + co-located test (4/4 pass) |
| 2 | ✓ done | `51c90d4` | Wire `subscriptions-section.tsx` through the derivation |

## Commits

- `4ffbcf4` feat(admin/subscriptions): add deriveDisplayStatus helper
- `51c90d4` fix(admin/subscriptions): show superseded rows as Expired instead of stale Overdue

Both preceded by two housekeeping commits landed at pre-flight (unrelated to the fix):

- `1f191d5` chore(deps): bump @anthropic-ai/claude-code to 2.1.217
- `9d589f9` docs(mstack): debug report for subscription overdue→expired on renewal

## Verification

- ✓ Task-1 vitest suite (`subscription-display-status.test.ts`) — 4/4 pass
- ✓ `pnpm --filter @aira/web typecheck` — clean
- ✓ `pnpm --filter @aira/web lint` — 0 errors (15 pre-existing warnings in unrelated files)
- ✓ lefthook pre-commit ran clean on both fix commits (check-migrations, check-no-server-actions, check-contrast)
- ⏳ Acceptance criterion #2 (manual repro in the admin UI) — **not yet run**; see Follow-ups.

## Follow-ups

- **Manual repro in the admin UI.** The debug report's acceptance criterion #2 requires driving the admin UI with two subscriptions on the same listing and confirming the older row now renders "Expired" in muted grey. This wasn't run during the code phase (the derivation is unit-tested end-to-end, but the visual outcome needs eyeballs). Recommend `/mlabs-qa` targeting `/admin/businesses/<id>` → Subscriptions section, or run it manually via `pnpm dev`.
- **No related surfaces changed.** The businesses list (`app/admin/businesses/page.tsx`) already derives its "overdue" state from `days_remaining` of the newest sub, so it wasn't affected. The renewals queue (`/admin/renewals/`) filters by `end_date > now()`, so superseded rows don't leak in. Both were noted as out-of-scope in the debug report and no change was needed.
- **Branch context.** These commits landed on `feat/landing-explainer-videos`, not a fresh fix branch (user's explicit call at pre-flight). If you split the branch later for a PR, the four SHAs above should move together.

## Recommended next step

Run `/mlabs-qa` on the admin business-detail Subscriptions section to satisfy the manual acceptance criterion, or manually walk the repro against `pnpm dev`.
