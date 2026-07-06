# Implementation: Mobile Business Detail parity uplift

**Started:** 2026-06-30
**Review:** [2026-06-30-mobile-business-detail-parity-uplift](../../reviews/2026-06-30-mobile-business-detail-parity-uplift.md)
**Branch:** feat/qa-test-accounts-seed
**Status:** complete

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [x] **Task 1:** TierPill component + render on Hero and Card
  - Files: features/listings/components/TierPill.tsx (new), BusinessHero.tsx, BusinessCard.tsx (edit)
  - Commit: 2e9a76d
  - Notes: Pause-if didn't fire — NativeWind compiled tier classes on first build

- [x] **Task 2:** ContactCard — Get directions via native maps schemes
  - Files: features/listings/components/ContactCard.tsx
  - Commit: 67e7e59
  - Notes: maps://?daddr= on iOS, google.navigation:q= on Android, HTTPS fallback for both

- [x] **Task 3:** BusinessHero — inline SocialIcons row
  - Files: features/listings/components/BusinessHero.tsx
  - Commit: 4baad69
  - Notes: reuses SocialIcons compact mode; no new component

- [x] **Task 4:** Bottom Go-back Button on detail screen
  - Files: app/(app)/listings/[category]/[id].tsx
  - Commit: 1e37147
  - Notes: Button variant="secondary" + arrow-left glyph inline

- [x] **Task 5:** Gallery — full-width auto-advancing carousel with dots
  - Files: features/listings/components/Gallery.tsx
  - Commit: 0ab6478
  - Notes: Pause-if didn't fire — getItemLayout prevented scrollToIndex out-of-range
