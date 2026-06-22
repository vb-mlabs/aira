# Implementation report — Favorite a listing

**Status:** complete
**Started:** 2026-06-22
**Branch:** feat/qa-test-accounts-seed
**Review:** [2026-06-22-listing-favorites](../../reviews/2026-06-22-listing-favorites.md)

---

## Tasks

| # | Task | Status | Commit |
|---|---|---|---|
| 1 | DB schema + migration | ✓ done | `810a12c` |
| 2 | Validators | ✓ done | `95148d5` |
| 3 | Services (paused: export mappers) | ✓ done | `13db08e` |
| 4 | API ops | ✓ done | `aa00c9f` |
| 5 | API route handlers | ✓ done | `438baa7` |
| 6 | FavoriteButton component | ✓ done | `fbca162` |
| 7 | FavoriteButton on BusinessCard | ✓ done | `f9f016d` |
| 8 | FavoriteButton on BusinessDetail | ✓ done | `3cda516` |
| 9 | /account/favorites page | ✓ done | `5c2e2d5` |
| 10 | Account hub menu row | ✓ done | `3b407e0` |
| 11 | Wire ids through public listings | ✓ done | `388a48f` |

## Commits

- `dc704dd` docs(mstack): plan + review for listing favorites (precursor)
- `810a12c` feat(db): add business_favorite join table
- `95148d5` feat(validators): favorites schemas
- `13db08e` feat(services): favorites queries
- `aa00c9f` feat(api): favorites operations
- `438baa7` feat(api): favorites route handlers
- `fbca162` feat(listings): FavoriteButton client component
- `f9f016d` feat(listings): FavoriteButton on BusinessCard
- `3cda516` feat(listings): FavoriteButton on detail page
- `5c2e2d5` feat(account): /account/favorites page
- `3b407e0` feat(account): My favorites menu row
- `388a48f` feat(listings): wire fav ids through public listing surfaces

## What shipped

End-to-end favorites feature for signed-in users:

- **Data layer.** New `business_favorite` join table mirroring the
  `post_interest` shape with cascade FKs on both sides. Migration
  `0032_moaning_marvel_boy.sql` applied to the live DB during T1.
- **Service / API.** Four ops, all `permission: "user"`:
  - `POST /api/v1/favorites` (idempotent — `ON CONFLICT DO NOTHING`)
  - `DELETE /api/v1/favorites/[business_id]` (idempotent — no-op on
    missing rows)
  - `GET /api/v1/favorites/mine` — full hydrated `Business[]`
  - `GET /api/v1/favorites/mine/ids` — slim `string[]` for card
    decoration on listing pages without paying for full hydration.
- **UI.** `FavoriteButton` client component with single-click toggle,
  optimistic state, silent revert + small red-dot indicator on
  failure (no toast, no notification-bell entry), hidden entirely
  for anonymous callers. Wired into:
  - The BusinessCard right-column stack above the Tier pill
    (small heart).
  - The BusinessDetail header next to the BadgeCheck verified mark
    (large heart).
  - The /account/favorites page so users can remove favorites
    directly from the saved set.
- **Account hub.** New "My favorites" menu row between "My listings"
  and "Notifications".
- **Page wiring.** `/home`, `/directory`, `/listings/[category]`, and
  `/listings/[category]/[id]` each read the session once, and when
  signed-in parallel-fetch `listMyFavoriteIdsOp` alongside their
  existing listings call so each card mounts with the correct heart
  state. Anonymous callers skip the fetch entirely — public listings
  ops stay user-agnostic and cacheable.

## Verification done

- `pnpm --filter @aira/web typecheck` — green after every task.
- ESLint on every touched file — no new warnings; one transient
  hard-rule violation (`process.env.NODE_ENV` in T6) caught by lint
  and fixed before commit.
- Pre-commit lefthook (check-contrast, check-migrations,
  check-no-server-actions) passed on every commit.

## Follow-ups

- **No live exercise.** Code paths inspected, types green, lint
  clean — but I did not drive Playwright through the toggle on a
  running server. `/mlabs-qa --focus "favorites: add/remove/list,
  anonymous, archived row"` is the right next step.
- **Mobile app.** Out of scope per the plan; Expo screens will
  consume the same `/api/v1/favorites/*` endpoints in a follow-up.
- **Public favorite counts.** Deliberately out of scope; reopen if
  product wants the social-proof signal later.
- **Toast surface.** Failed mutations currently show only a
  red-dot indicator. If the team wants a toast system anyway,
  that's a separate UI utility plan.

## Recommended next step

`/mlabs-qa --focus "favorites flow: home/directory/category card
hearts, detail-page heart, /account/favorites add+remove, anonymous
visibility, archived favorited business"`
