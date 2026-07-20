# Fix — "More Info" button restyled as a link instead of a green pill

**Started:** 2026-07-20 12:40
**Source:** user-report
**Status:** fixed
**Commit:** _pending — set below after commit_

## Symptom / repro

Report: the "More Info" button on every listing card renders with a solid
green background. Requested change: remove the green background, keep the
text green + bold so it reads like a clickable link.

Reproduced by reading the two listing-card components:

- Web `apps/web/src/features/listings/components/business-card.tsx:132,137`
  — `bg-primary text-primary-foreground rounded-full px-2.5 py-1` on both
  the interactive (`<Link>`) and non-interactive (`<span>`) variants.
- Mobile `apps/mobile/features/listings/components/BusinessCard.tsx:172-175`
  — same pill shape via a wrapping `<View className="rounded-full bg-primary px-2.5 py-1">`.

Both are the same design decision.

## Root cause

Pure styling. The pill-badge treatment predates the request that "More
Info" read as an inline link rather than a call-to-action button.

## Fix

- Web (both branches): drop `bg-primary`, `rounded-full`, `px-2.5`, `py-1`,
  and `transition-opacity hover:opacity-90`; recolor `text-primary-foreground`
  → `text-primary`; add `hover:underline` on the `<Link>` variant so it
  reads as a link. Focus-ring classes preserved. Bold, uppercase, tracking,
  and text size unchanged.
- Mobile: drop the `<View>` pill wrapper; recolor `text-primaryForeground`
  → `text-primary` on the `<Text>`. Parent `items-end` layout keeps the
  label aligned to the right column.

## Evidence

- `pnpm typecheck` → passes.
- Token-drift check on both files → 5 pre-existing warn-level findings
  in `BusinessCard.tsx` (shadowColor `#000`, `MUTED_FOREGROUND_HEX`,
  `VERIFIED_BLUE_HEX` — all outside the lines I touched). No new drift
  introduced by this fix.

## Follow-ups

- None. If the design team later wants an outlined pill instead of a plain
  text link, that's a separate design-system pass.
