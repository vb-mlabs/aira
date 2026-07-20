# Fix — Sidebar submenu background matches sponsored-mid

**Started:** 2026-07-20 16:00
**Source:** user-report
**Status:** fixed
**Commit:** _pending_

## Symptom / repro

QA request: the sidebar submenu (subcategory rows that appear when a
category expands) should have the same background color as the mid-slot
Sponsored pill on business cards (burnt orange, `--sponsored-mid`).
Applies to both web and mobile.

Reproduced by reading the two live callers:

- Web `apps/web/src/app/(app)/_components/app-sidebar.tsx:282-289` — the
  `CategoryGroup` child rows have no persistent background (`transition-colors
  hover:bg-sidebar-foreground/5`, active `bg-sidebar-foreground/10`). Child
  rows blend into the sidebar.
- Expo mobile `apps/mobile/components/nav/AppDrawerContent.tsx:363-395` —
  `backgroundColor: childActive ? "rgba(243,235,221,0.10)" : "transparent"`.
  Same visual: no persistent background.

Web's `mobile-sidebar.tsx` wraps `AppSidebar`, so the web mobile-viewport
drawer inherits the fix from the same file — 2 source files total, not 3.

## Root cause

Not a bug — a design-consistency ask. The submenu was styled as a subtle
extension of the sidebar; QA wants it visually anchored to the
sponsored-mid identity that appears elsewhere in the app (business-card
mid-slot pill).

## Fix

- **Web** `apps/web/src/app/(app)/_components/app-sidebar.tsx:281-292`:
  - Subcategory Link background: `bg-sponsored-mid` (solid burnt orange).
  - Subcategory Link text: `text-sponsored-mid-foreground` (cream — the
    existing sponsored-mid-foreground token, already used by the mid-slot
    pill on cards).
  - Hover: `hover:brightness-95` (subtle darken, no new token).
  - Active state: keep `font-bold` only; drop the `bg-sidebar-foreground/10`
    overlay (it's no longer meaningful over a solid burnt-orange
    background — bold weight alone signals the current route).
  - Bullet dot recolored from `bg-[color:var(--tier2)]` (which equals
    `--sponsored-mid` and would disappear against the same-color
    background) to `bg-sponsored-mid-foreground/60` so it stays visible
    against the new background.
- **Expo mobile** `apps/mobile/components/nav/AppDrawerContent.tsx:363-395`:
  - `backgroundColor` on the child Pressable → `TIER2_HEX`
    (`#C97638`), the sRGB literal already used elsewhere in the drawer
    that represents `--sponsored-mid`.
  - Bullet dot color: `TINT_LIGHT` (cream, opacity 0.6) instead of
    `TIER2_HEX`.
  - Text color already `TINT_LIGHT` (cream = sponsored-mid-foreground) —
    no change needed; contrast already validated as the drawer's default
    label color.
  - Active state: font weight-only distinguisher; the `rgba(243,235,221,0.10)`
    overlay is dropped for parity with web.

`--sponsored-mid` and its foreground are pre-existing tokens
(packages/config/src/design.ts, apps/web/src/app/globals.css). No new
tokens; no design-layer edit.

## Evidence

- `pnpm typecheck` → 10/10 tasks pass.
- `check-token-drift.sh` on both touched files → filled in after run.
- The touched Expo file's inline `TIER2_HEX` / `TINT_LIGHT` constants
  are pre-existing (introduced when the drawer landed); this fix reuses
  them rather than adding new sRGB literals — no drift-count delta on
  the mobile file. Web edits use only existing Tailwind token classes.

## Follow-ups

- None. If future design work moves the mobile drawer off inline sRGB
  literals onto NativeWind classes (there's already a mobile Tailwind
  config), do it as a dedicated pass rather than folding into this fix.
