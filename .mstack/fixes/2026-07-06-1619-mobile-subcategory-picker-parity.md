# Fix — SubcategoryPicker pill visually heavier than VerifiedFilterChip

**Started:** 2026-07-06 16:19
**Source:** UAT feedback from Radha 2026-07-06 (Issue #4 in the mobile UAT sprint plan `.mstack/plans/2026-07-06-mobile-uat-sprint.md`)
**Status:** fixed
**Commit:** `a534cf8`

## Symptom / repro

On mobile `apps/mobile/app/(app)/listings/[category].tsx`, the listing screen renders `<SubcategoryPicker>` and `<VerifiedFilterChip>` side-by-side in the filter row. The picker's pill sat visually taller with a heavier label and wider inner gap, breaking the row's vertical rhythm.

Reproduced statically from code inspection — no live device needed since the delta is deterministic Tailwind + inline-style tokens.

## Root cause

`SubcategoryPicker.tsx:130-131` used:
- `className="flex-row items-center self-start rounded-full border border-border bg-card px-3"` (no vertical padding)
- `style={{ minHeight: 36, gap: 6 }}` (forced 36px minimum height + 6px icon gap)
- label `text-sm font-semibold` (14px)
- chevron `size={18}`

While `VerifiedFilterChip.tsx:27-45` — the newer, compact standard the reviewer locked as canonical — uses:
- `px-3 py-1.5` (12px horizontal + 6px vertical padding)
- `style={{ gap: 4 }}` (4px icon gap)
- label `text-xs font-semibold` (12px)
- icon `size={14}`

Delta: picker was one text step + one padding scheme + one icon size larger than the chip.

## Fix

Single file, single Edit block on `SubcategoryPicker.tsx`:

- Line 130 className: added `py-1.5`; result matches VerifiedFilterChip's padding.
- Line 131 style: dropped `minHeight: 36`, changed `gap: 6` → `gap: 4`.
- Line 133 label className: `text-sm font-semibold` → `text-xs font-semibold`.
- Line 136 chevron: `size={18}` → `size={14}`.

Menu anchoring math (`MENU_ROW_HEIGHT`, `MENU_GAP_BELOW_PILL`, etc.) is unaffected because `handleOpen()` uses `View.measureInWindow()` at tap-time to read the pill's actual on-screen dimensions rather than depending on the removed `minHeight` value.

Zero behavior change. Zero new color literals introduced.

## Evidence

- **Typecheck** (fresh session): `pnpm --filter @aira/mobile typecheck` → `tsc --noEmit` exit 0, no output.
- **Token drift** (`check-token-drift.sh apps/mobile/features/listings/components/SubcategoryPicker.tsx`): 8 warn findings, ALL pre-existing (raw hex constants for menu chrome — `MUTED`, `FOREGROUND`, `ACCENT`, backdrop rgba, backgroundColor `#FFFBF2`, shadowColor, borderColor). My diff introduced zero new color literals; only className token changes and one inline `gap: 4`. Under the resolved config `conventions.tokenDrift = "warn"`, these do not block. Cleanup is a separate concern from this fix.
- **Pre-commit hooks** (lefthook): `check-migrations` ✓, `check-contrast` ✓.

## Follow-ups

**Attempted the token-drift sweep in the same session, then escalated.**

The 8 pre-existing raw color literals in this file (menu chrome `MUTED`,
`FOREGROUND`, `ACCENT` constants + rgba alphas + modal chrome) hit the
brand/design-token-layer escalation trigger. Deeper cause: the mobile
runtime theme file at `apps/mobile/lib/theme/tokens.ts` is **stale** —
its `foreground: "#252525"`, `primary: "#343434"` values don't match
the actual palette in the generated `apps/mobile/tailwind.config.js`
(warm-brown `foreground: "#301d0d"`, `primary: "#496036"`,
`mutedForeground: "#66503f"`).

The picker's constants actually match the CURRENT tailwind config
(exact match on `mutedForeground`); the theme/tokens.ts consumption
path is what's drifted. Blindly migrating SubcategoryPicker to call
`useThemeColors()` would pull the grayscale values and break the
picker menu visually.

Escalated to TODOS with:
- **What:** Sync `apps/mobile/lib/theme/tokens.ts` with the generated
  `tailwind.config.js` (or better: single-source both from
  `packages/config/src/design.ts` via a shared codegen).
- **Then:** Sweep consumers (SubcategoryPicker, others flagged by
  check-token-drift) in a follow-up plan.
- **Route:** `/mstack-plan` — needs proper scope, not a one-file fix.
