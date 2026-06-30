# Implementation report — category drift fix

**Status:** complete (with one documented follow-up)
**Branch:** `feat/admin-businesses-renewal-urgency-pill`
**Plan:** [2026-06-16-category-drift-fix](../../plans/2026-06-16-category-drift-fix.md)
**Review:** [2026-06-16-category-drift-fix](../../reviews/2026-06-16-category-drift-fix.md)

---

## Tasks

| | Task | Commit |
|---|---|---|
| ✓ | Task 1 — Defensive getCategoryMeta(slug) + sweep 9 consumers | `a647300` |
| ✓ | Task 2 — Slug-rename guard in updateCategoryOp + Vitest | `136df87` |
| ✓ | Task 3 — Drizzle migration 0027 (data cleanup) | `5016c0c` (+ snapshot fix `4c63f22`) |
| ✓ | Task 4 — Form reads categories from DB; delete VALID_CATEGORIES | `5990b00` |

## Commits

```
5990b00 feat(admin): BusinessCreateForm reads categories from DB; delete VALID_CATEGORIES
4c63f22 fix(db): correct snapshot chain pointers for 0027
5016c0c chore(db): migration 0027 — category drift cleanup
136df87 feat(admin): slug-rename guard on updateCategoryOp
a647300 refactor(listings): defensive getCategoryMeta(slug) helper + sweep 9 consumers
2d82666 docs(mstack): category drift fix — plan + review
```

## Verification

- `pnpm --filter @aira/web typecheck` — clean after every task
- `pnpm --filter @aira/web test` — 178/178 passing (added 7 cases in `categories-rename-guard.test.ts`)
- `pnpm db:migrate` — `0027_category_drift_cleanup.sql` applied cleanly after step-2 extension
- DB post-condition queries all return 0:
  - businesses with `category = 'food-dining'`: 0
  - rows in `category` with `slug LIKE 'qa-%'`: 0
  - join rows on Ayurveda Wellness in `business_category`: 0
  - dangling `sponsorship` rows with missing `category_id`: 0
- `grep -rn "VALID_CATEGORIES"` across the repo returns one match — the explanatory comment in `validators/businesses.ts`. Production code is fully purged.
- Lefthook pre-commit green on every commit (`check-migrations`, `check-no-server-actions`, `check-contrast`, `check-mobile-tailwind` as applicable).

## Pause-handling

- **Task 3** paused once at first migration apply. The FK pre-check raised correctly — 7 stale sponsorship rows from a 2026-06-10 QA run referenced the `qa-deactivate-1781028692142` category. User authorised deletion via AskUserQuestion; migration extended with a step-2 DELETE and re-applied cleanly.
- **Task 4** paused implicitly during the commit step: lefthook's `check-migrations` flagged the planned schema/businesses.ts doc-comment edit. Tried `pnpm db:generate` to confirm "no schema diff" and surfaced a **pre-existing 0025/0026 snapshot collision** (someone copied 0025_snapshot.json verbatim when shipping 0026). Three resolution options weighed; reverted the schema doc-comment edit and deferred it to a follow-up. The JS/TS form change shipped cleanly.

## Follow-ups

- **Schema doc-comment update on `packages/db/src/schema/businesses.ts`.** The plan called for updating two comment blocks (lines 9–13 "Allowed values are enforced by Zod constants…" and line 55 "One of VALID_CATEGORIES…") to point at the `category` DB table + the new rename guard instead. Reverted in this PR because the pre-existing 0025/0026 snapshot collision prevents `db:generate` from running, which means the migration-check lefthook can't verify "no schema diff" and blocks any schema-file commit. Fix the 0025/0026 snapshot chain first (separate PR), then this doc-comment update lands trivially.
- **Pre-existing 0025/0026 snapshot collision.** Documented in `4c63f22`'s commit message. The chain is walkable from 0026 forward (my fix to 0027 ensures that), but `db:generate` is broken until 0026's `id` is bumped to a fresh uuid AND every downstream snapshot's `prevId` is rewritten to chain correctly. Small, isolated; worth its own `fix(db)` PR.
- **0027 contains a stray `0027_snapshot.json`** that's a near-copy of 0026 — fine because the schema is unchanged, but a fresh `db:generate` would produce a smaller/cleaner snapshot once the upstream collision is fixed.

## Recommended next step

The branch now has a real mix of themes — start with renewal urgency (the original feature), now also category drift + admin/users polish + Send-notification removal + role/ban/reset modal refactor. Two reasonable paths:

1. **Ship as-is.** The commits are clean, each commit is reviewable on its own, and the branch name no longer fully describes the contents (cosmetic concern only).
2. **Cherry-pick the category-drift commits onto their own branch** (`feat/category-drift-fix`) for a more focused PR. Six commits: `2d82666 4c63f22 a647300 136df87 5016c0c 5990b00`. The other commits stay where they are.

Then run `/mlabs-qa` with focus "category drift — admin add business form, /admin/settings/categories rename guard" to drive Playwright through the new form behaviour and the rename-guard error path before merging.
