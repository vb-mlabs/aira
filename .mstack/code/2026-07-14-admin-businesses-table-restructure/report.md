# Implementation report — admin businesses table restructure

**Slug:** 2026-07-14-admin-businesses-table-restructure
**Review:** [.mstack/reviews/2026-07-14-admin-businesses-table-restructure.md](../../reviews/2026-07-14-admin-businesses-table-restructure.md)
**Branch:** feat/landing-explainer-videos
**Status:** complete

---

## Tasks

| # | Task | Status | Commit |
|---|---|---|---|
| 1 | extend list op with plan_name (server) | ✓ done | `baaffb9` |
| 2 | restructure businesses table columns (UI) | ✓ done | `4718cc4` |

## Commits

- `bd1165c` — chore(mstack): plan + review for admin businesses table restructure
- `baaffb9` — feat(admin/businesses): surface plan_name on list rows
- `4718cc4` — feat(admin/businesses): plan_name column + separate due-date column

## Verification

- `pnpm --filter @aira/web typecheck` — clean after T1 and T2.
- `pnpm --filter @aira/web lint` — 0 errors after T2 (16 pre-existing warnings in unrelated files).
- Lefthook check-migrations / check-no-server-actions / check-contrast all passed on both feature commits.

## Follow-ups

- **Column-width behaviour under long plan names** — deliberately unaddressed per the review's decision (no speculative `max-w-*` / `truncate`). Add a follow-up if long plan names ever cause wrapping issues in production data.
- **`owner` / `contact_person` fields still on the response** — kept for future consumers and the still-live `?owner=has|none` server-side filter. If both prove unused after a quarter, worth pruning as a separate cleanup.

## Recommended next step

`/mlabs-qa` with focus on `/admin/businesses` — golden-path row scan, overdue row treatment survives the refactor, Renewing filter + CSV download still work, "no subscription" and "orphaned plan_id" cases both render as "—".
