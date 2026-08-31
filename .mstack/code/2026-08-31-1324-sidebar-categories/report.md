# Implementation report — sidebar-categories

**Debug doc:** [../../debug/2026-08-31-1324-sidebar-categories/report.md](../../debug/2026-08-31-1324-sidebar-categories/report.md)
**Branch:** fix/mobile-notifications-re-trigger-banner
**Status:** complete
**Finished:** 2026-08-31 13:49

## Tasks

| # | Task | Status | Commit |
|---|------|--------|--------|
| 1 | `getCategoryTree` active-only default + JS-level guard | ✓ done | `17940cb` |
| 2 | `revalidatePath("/", "layout")` after category-admin mutations | ✓ done | `5ac13d0` |

## Commits

- `17940cb` — fix(services/categories): hide inactive rows from the public tree
- `5ac13d0` — fix(web/admin/categories): revalidate app-shell layout after mutations

## Verification

- `pnpm typecheck` — green after each task.
- Both debug repros green together:
  `pnpm exec vitest run --config .mstack/debug/2026-08-31-1324-sidebar-categories/specs/vitest.config.ts`
  → 2 files / 3 tests passed.
- Pre-commit hooks (check-migrations, check-no-server-actions, check-contrast) passed on both commits.

## Follow-ups

- Cross-tab live update is still out of scope: `revalidatePath` only invalidates on the next request in a given session — a user with the app already open who never navigates or refreshes won't see the change until they do. If we later want push-based sidebar refresh, that's a separate feature.
- Admin form's `handleNameChange` still deliberately does NOT auto-regenerate slug in edit mode — untouched per debug doc's out-of-scope note.
- Deactivating a category with active businesses still leaves those business rows pointing at an inactive slug — untouched per debug doc's out-of-scope note.

## Recommended next step

Run `/mlabs-qa` focusing on the categories admin flow: create → verify sidebar picks it up, rename slug → verify no 404 on click from a not-refreshed sidebar, deactivate → verify sidebar drops it. Mobile parity should be unchanged (mobile uses `?roots=1` which was already active-only).
