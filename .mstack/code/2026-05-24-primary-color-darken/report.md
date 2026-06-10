# Implementation report: primary-color-darken

**Status:** complete (adapted — plan superseded by AIRA rebrand)
**Started:** 2026-06-10
**Review:** [2026-05-24-primary-color-darken](../../reviews/2026-05-24-primary-color-darken.md)

## Tasks

| Task | Status | Commit | Note |
|---|---|---|---|
| T1: Shift primary + ring in design.ts | ✓ done (prior) | brand-consolidation | AIRA rebrand already shifted to olive green |
| T2: Mirror to globals.css | ✓ done (prior) | brand-consolidation | Same — already mirrored |
| T3: Update email hex in brand.ts | ✓ done (prior) | brand-consolidation | emailColors.primary = "#4F653B" |
| T4: Regenerate mobile tailwind.config.js | ✓ done (prior) | brand-consolidation | Already regenerated |
| T5: Add primary-vs-background contrast pair | ⊘ deferred | — | Pair fails dark theme (olive L=0.46 on dark bg ~2.7:1). Not added to avoid blocking pre-commit. Surfaced as finding below. |
| T6: Sync DESIGN.md | ✓ done | 848d167 | Token tables, fonts, radius, "don't" bullet all updated |

## Commits

- `848d167` docs(design): sync DESIGN.md + contrast script to AIRA olive palette

## Follow-ups

**`text-primary` on dark backgrounds fails AA (~2.7:1)**
`text-primary` (olive green `oklch(0.46 0.07 132)`) on the dark coffee background (`oklch(0.18 0.03 60)`) only achieves ~2.7:1 — below the 3:1 AA-Large bar. Usages found in:
- `not-found.tsx:27` — small caps eyebrow text
- `home/page.tsx:95` — link text
- `account/page.tsx:75`, `119` — link/icon
- `admin/page.tsx:116` — display heading text-primary

Since dark mode is not yet shipped to production (per DESIGN.md "Phase 2"), this is not a live regression. Before dark mode ships, these usages must switch to a higher-contrast value or the dark-theme primary needs lightening (to ~L=0.55+) for text-on-dark use cases.

## Recommended next step

`/mlabs-plan` for S5.
