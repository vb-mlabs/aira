# Fix — Back on business detail skips listings screen, lands on Home/Post

**Started:** 2026-07-20 18:30
**Source:** debug/2026-07-20-1810-back-nav-skips-listings
**Status:** fixed
**Commit:** _pending_

## Symptom / repro

Mobile app: Back on business-detail screen skipped `/listings/<sub>`
and landed on Home (Scenario 1) or Post-on-AIRA (Scenario 2). Debug
run's failing spec at
`.mstack/debug/2026-07-20-1810-back-nav-skips-listings/specs/repro.spec.ts`
(3/3 failing pre-fix).

## Root cause

Debug run identified: expo-router's `useLocalSearchParams()` returns
route segments AND query params merged. `BusinessCard`'s and the
drawer's back-href computations stripped only `from` but preserved
every other param — including route segments like `category` — which
ended up as query params on top of the pathname that already encoded
them. The resulting URL `/listings/restaurants?category=restaurants`
failed to route reliably via `router.replace`; expo-router fell back
to the stack ancestor (Home / Post).

## Fix

Extracted a small shared helper at
`apps/mobile/lib/nav/buildBackHref.ts` that strips both `from` AND the
route-segment param names (`category`, `id`) so the returned back-href
is `pathname + only genuine query params` (e.g. `q`, `verified`). Both
call sites now import it:

- `apps/mobile/features/listings/components/BusinessCard.tsx` — replaces
  the inline `useMemo` at lines 58-68 with `useBuildBackHref()`.
- `apps/mobile/components/nav/AppDrawerContent.tsx` — replaces the
  inline `useMemo` at lines 69-77 with the same hook.

The `ROUTE_SEGMENT_PARAMS` set (`["category", "id"]`) lives in one
place so future route additions only need updating the helper.

## Evidence

- Failing spec now passes: `pnpm vitest run .mstack/debug/2026-07-20-1810-back-nav-skips-listings/specs/repro.spec.ts` → **3/3 pass**.
- `pnpm typecheck` → 10/10 tasks pass.
- Token drift check on touched files → no findings.
- Manual repro not possible in this environment (mobile app requires
  device / Expo Go). Handoff to `/mstack-qa` for device-side
  verification.

## Follow-ups

- Device-side verification via `/mstack-qa` — confirm both scenarios
  now land on `/listings/<sub>` with the drawer's selected menu item
  highlighted.
- If more `router.push` call sites emerge that pass `?from=` (e.g. a
  future featured section that navigates into a category), route them
  through the same `buildBackHref` helper. Grep for `from,` in
  `router.push({...params:` calls under `apps/mobile/` before adding
  new nav.
