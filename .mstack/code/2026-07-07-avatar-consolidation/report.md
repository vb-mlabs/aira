# Implementation report — Avatar consolidation

**Started:** 2026-07-07 10:15
**Finished:** 2026-07-07 15:04
**Branch:** feature/avatar-consolidation
**Review:** [2026-07-07-avatar-consolidation](../../reviews/2026-07-07-avatar-consolidation.md)
**Status:** complete
**Commits on branch (feature-only, since main):** 9

## Tasks

| # | Task | Status | Commit |
|---|---|---|---|
| — | Pipeline artifacts | ✓ done | de55579 |
| 1 | Add vitest to `@aira/ui-web` | ✓ done | f53e29d |
| 2 | Build `<Avatar>` primitive | ✓ done | 0d73f5c |
| 3 | Widen community post shape (`author_image`) | ✓ done | 2c9b6e0 |
| 4 | Migrate `/account` header | ✓ done | c92770b |
| 5 | Thread image → `TopUtilityBar` | ✓ done | 11a8558 |
| 6 | Refactor `AvatarUploader` | ✓ done | 569000e |
| 7 | Migrate community `post-card` | ✓ done | 6a878dc |
| 8 | Migrate community `post-detail-modal` | ✓ done | c15e449 |

## Commits

- `de55579` docs(mstack): avatar consolidation pipeline artifacts
- `f53e29d` chore(ui-web): add vitest infra
- `0d73f5c` feat(ui-web): add Avatar primitive with size scale + onError fallback
- `2c9b6e0` feat(community): expose author_image on post rows
- `c92770b` fix(account): render user profile image in /account header
- `11a8558` feat(app-shell): render profile image in desktop top utility bar
- `569000e` refactor(avatar): use shared Avatar primitive in uploader
- `6a878dc` feat(community): render author image on post cards
- `c15e449` feat(community): render author image on post detail modal

## Final verification

- `pnpm typecheck` — 10/10 tasks green
- `pnpm lint` — 0 errors, 15 warnings (all pre-existing, unrelated)
- `pnpm --filter @aira/services test` — 63/63 pass
- `pnpm --filter @aira/api test` — 47/47 pass
- `pnpm --filter @aira/auth test` — pass
- `pnpm --filter @aira/ui-web test` — passWithNoTests (see Task 2 deviation)

## Deviations from the review

- **Task 2 — unit test dropped.** `@testing-library/react` rendering blew
  up with React 19's "Invalid hook call" under this workspace's
  hoisted-pnpm layout (Expo compat forces
  `node-linker=hoisted`+`shamefully-hoist=true`, which leaves every
  package with its own physical react-dom copy). Aliases, `dedupe`, and
  `server.deps.inline` all failed — testing-library resolves react-dom
  via Node's own resolver before Vite can intercept. User approved
  shipping without the test; vitest infra kept in place so a fix can
  land later as a follow-up.

No other deviations. All other tasks followed the review's task list
verbatim.

## Follow-ups

1. **React 19 + hoisted-pnpm + testing-library** — figure out the
   dedupe recipe so ui-web can ship real component tests. Options to
   explore: `deps.optimizer.web.include` more aggressively; postinstall
   symlink from `node_modules/@testing-library/react/node_modules/react-dom`
   → workspace-root copy; a monorepo-wide `pnpm.overrides` entry pinning
   a single react-dom instance.
2. **Admin avatar surfaces** — `AdminTopBar`,
   `business-owner-section`, admin `community-table` + admin
   `post-detail-modal`. `AdminPostRow` now carries `author_image`, so
   the admin community surfaces can render it whenever the follow-up
   plan lands.
3. **Messages `conversation-row`** — already renders images correctly
   but still holds an inline `initials()` copy. One small commit
   deletes the last duplicate.
4. **Mobile avatar consolidation** — mirror the primitive on Expo
   (`apps/mobile/`). Standalone plan.

## Recommended next step

`/mlabs-qa` — focus on:
- upload avatar on `/profile` → verify it appears on `/account` header,
  desktop top-right utility bar, community post cards, and community
  post detail modal
- user with no avatar uploaded → verify initials fallback everywhere
- broken avatar URL (temporarily edit `user.image` to a 404 URL in
  Drizzle Studio) → verify `<Avatar>`'s onError falls back to initials
  without showing the browser's broken-image icon
