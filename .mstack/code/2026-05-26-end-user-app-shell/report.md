# Implementation report — End-User App Shell

**Status:** complete
**Date:** 2026-05-27
**Branch:** feat/auth-shell-redesign
**Review:** [2026-05-26-end-user-app-shell](../../reviews/2026-05-26-end-user-app-shell.md)
**Mockup reference:** V4 Sidebar Refined

## Tasks

| #  | Task | Status | Commit  |
|----|------|--------|---------|
| 1  | DB schema — businesses table              | ✓ done | `b896d63` |
| 2  | Apply businesses migration                | ✓ done | (no commit — DB only) |
| 3  | Listings feature — server queries         | ✓ done | `49ab469` |
| 4  | Listings feature — UI components          | ✓ done | `b77c0ac` |
| 5  | App shell — Sidebar component             | ✓ done | `6922e5e` |
| 6  | App shell — Bottom tab bar                | ✓ done | `be5b639` |
| 7  | App shell — Layout restructure            | ✓ done | `419dc8b` |
| 8  | /home route                               | ✓ done | `45652c4` |
| 9  | /categories route                         | ✓ done | `a5cac3d` |
| 10 | /listings/[category] + /[id] routes       | ✓ done | `0ec5a32` |
| 11 | /account route                            | ✓ done | `5eb3db3` |
| 12 | Post-auth redirects → /home               | ✓ done | `ecbfb37` |

Plus planning artefact commit `285bd52` (V4 mockup + revised review doc).

## Commits

- `285bd52` chore(mstack): record V4 mockup + revise end-user-app-shell review
- `b896d63` feat(db): add businesses table for community listings
- `49ab469` feat(listings): server queries + types for business directory
- `b77c0ac` feat(listings): UI components — card, detail, category row, stat card
- `6922e5e` feat(app): persistent green-textured app sidebar + mobile drawer
- `be5b639` feat(app): mobile bottom tab bar — Home / Categories / Account
- `419dc8b` feat(app): restructure (app) layout around sidebar + bottom tabs
- `45652c4` feat(app): /home — branded landing with featured directory
- `a5cac3d` feat(app): /categories — full-screen browse for the mobile tab bar
- `0ec5a32` feat(app): /listings/[category] + business detail routes
- `5eb3db3` feat(app): /account — profile hub with Account + Support menus
- `ecbfb37` feat(auth): post-login redirect → /home (was /messages)

## Verification

- `pnpm typecheck` — clean across all 10 workspace packages after every commit.
- `pnpm lint` — 4 pre-existing `next.config.mjs` errors remain (untouched);
  no new lint errors introduced.
- Lefthook `check-contrast` + `check-migrations` passed on every commit.

## Follow-ups for /mlabs-qa

- **Seed test data.** The directory has no rows yet — `/home` will show no
  featured section, `/categories` will show 0 counts, every category listing
  will hit the EmptyState. Use `pnpm db:studio` to add a handful of businesses
  across tiers + categories before QA-testing the visual states.
- **Verify the green sidebar texture renders.** `--texture-paper-green` is an
  inline-SVG token in globals.css — confirm it paints over the `--sidebar`
  olive in the desktop column at 1280px and in the mobile drawer at 375px.
- **Mobile drawer interactions.** Confirm: hamburger opens, backdrop tap
  closes, ESC closes, swipe-to-dismiss is not implemented (expected; tap-only
  on this round).
- **Test the post-login redirect end-to-end.** Sign in with a verified
  account; should land at `/home`, not `/messages`.
- **Tier sort.** Add businesses with mixed tier/name combinations and verify
  the explicit CASE order in `queries.ts` puts tier1 first then tier2 then
  tier3 (alphabetical secondary sort by name).

## Pre-existing items (out of scope for this run)

- `next.config.mjs` has 4 `process.env` direct-access lint errors (lines 42).
  They existed on this branch before Task 1; the project's lefthook pre-commit
  hooks don't run lint, so commits pass. Worth a follow-up but unrelated.

## Recommended next step

`/mlabs-qa` with focus area **"end-user app shell — sign in → /home →
sidebar → category → business detail → account → sign out flow on both
desktop and mobile (375px) viewports"**.
