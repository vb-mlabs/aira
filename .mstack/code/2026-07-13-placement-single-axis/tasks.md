# Implementation: Placement is sponsorship-only

**Started:** 2026-07-13 13:30
**Review:** [2026-07-13-placement-single-axis](../../reviews/2026-07-13-placement-single-axis.md)
**Branch:** feat/landing-explainer-videos
**Status:** in_progress

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [ ] **Task 1:** Audit script + pnpm alias + baseline
  - Files: `packages/db/scripts/audit-subscription-tier-holders.ts` (new) · `packages/db/package.json` (edit)
  - Commit: —

- [ ] **Task 2:** Design token rename + mobile Tailwind regen + classname sweep
  - Files: `design.ts`, `globals.css`, `tailwind.config.js` (regen), `business-card.tsx`, `TierPill.tsx`, `check-contrast.ts`
  - Commit: —

- [ ] **Task 3:** Schema drop + migration + backend refactor + cron delete + minimum UI edits (BIG atomic)
  - Files: schema × 3, migration, validators × 3, services × many, ops × 2, cron × 2, minimum UI × 5
  - Commit: —

- [ ] **Task 4:** Admin UI additions — display_slot picker + tier list slot column + dashboard stat + banner
  - Files: tier-form, tier list page, admin dashboard
  - Commit: —

- [ ] **Task 5:** Public listings web rewrite + marketing sweep
  - Files: `listing-view`, `directory-view`, `tier-section` → `slot-section`, `business-card`, `types.ts`, `index.ts` + marketing grep
  - Commit: —

- [ ] **Task 6:** Public listings mobile rewrite
  - Files: `TierSection` → `SlotSection`, `[category].tsx`, `TierPill`, `BusinessCard`
  - Commit: —
