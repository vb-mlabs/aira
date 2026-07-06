# Fix — primary category sidebar group doesn't open on hover

**Started:** 2026-07-06 13:12
**Source:** QA feedback #14 (2026-07-06)
**Status:** fixed
**Commit:** `181f4a5`

## Symptom / repro

On `/home`, `/categories`, or any `/listings/*` route, the web sidebar
lists 7 root categories. Users expect that hovering over a root row
would peek at the children; today the subs only appear after clicking
the small chevron on the right.

Reproduced by loading `/listings/education` while signed in as
`qa-super@aira-qa.test` — the "Restaurants to Food" root (which has
child "Test") stayed collapsed under mouse-over. Only chevron-click
opened it.

## Root cause

`CategoryGroup` in
`apps/web/src/app/(app)/_components/app-sidebar.tsx` tracked a single
`open` state driven by (a) chevron `onClick` toggle and (b) initial
route-match auto-open. No hover pathway existed at all.

## Fix

Split state:
- `clickOpen` — persistent, seeded from `parentActive || anyChildActive`
- `hoverOpen` — flipped by `onMouseEnter/onMouseLeave` on the group
  wrapper `<div>`
- Effective `open = clickOpen || hoverOpen || routeActive`

The chevron still toggles `clickOpen` so touch / no-hover devices are
unaffected. Route-active groups still stay open regardless of hover.
No mouse-hover-timeout debouncing — the sidebar entries are small and
snapping open/closed reads as responsive rather than jittery.

One file touched. No token / brand changes.

## Evidence

- Playwright verification spec:
  `.mstack/qa/2026-07-06-1131/specs/verify-14.spec.ts`
  - Asserts `aria-expanded=false` initially → hover → `aria-expanded=true`
    → mouse-away → `aria-expanded=false`.
  - `npx playwright test verify-14.spec.ts --config=playwright.config.ts`
    — **1 passed (13.3s)**
- Typecheck: `pnpm --filter @aira/web typecheck` — clean
- Lefthook: `check-migrations`, `check-no-server-actions`,
  `check-contrast` all passed on commit `181f4a5`
- Token drift: `check-token-drift.sh` invoked, no findings (the file
  touches only Tailwind class strings and React state, no OKLCH /
  design.ts imports).

## Follow-ups

None.
