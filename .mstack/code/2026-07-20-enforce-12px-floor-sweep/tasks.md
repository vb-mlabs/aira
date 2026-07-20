# Implementation: Enforce 12px absolute font-size floor

**Started:** 2026-07-20 16:45
**Finished:** 2026-07-20 17:20
**Review:** [2026-07-20-enforce-12px-floor-sweep](../../reviews/2026-07-20-enforce-12px-floor-sweep.md)
**Branch:** feat/landing-explainer-videos
**Status:** complete

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [x] **Task 1:** Sweep — web core shell (error, not-found, app-sidebar, bottom-tab-bar)
  - Files: 4
  - Commit: 66cb487
  - Notes: spec: ok — grep clean, typecheck 10/10.

- [x] **Task 2:** Sweep — web account + admin route pages
  - Files: 3
  - Commit: 1d04e13
  - Notes: spec: ok — grep clean, typecheck 10/10.

- [x] **Task 3:** Sweep — web marketing components
  - Files: 4
  - Commit: 96ecba1
  - Notes: spec: ok — grep clean, typecheck 10/10. Tracking tokens (tracking-[3px], tracking-[2px]) preserved as documented in the plan.

- [x] **Task 4:** Sweep — web admin components
  - Files: 11 (plan estimated 10; grep found +1 in `category-tree-manager.tsx`'s ActiveBadge ternary)
  - Commit: 4f1ffba
  - Notes: spec: ok — grep clean, typecheck 10/10. `category-tree-manager.tsx` ActiveBadge now returns same `text-xs` in both `small` and `!small` branches; padding still differs. Mechanically correct per plan; potential cleanup follow-up but out of scope.

- [x] **Task 5:** Sweep — web feature components + inline padding tweaks
  - Files: 9
  - Commit: f5a693a
  - Notes: spec: ok — grep clean, typecheck 10/10. SponsoredPill padding tightened `px-1.5 → px-1`. NotificationBell badge min-width nudged `min-w-[1.1rem] → min-w-[1.25rem]`. Both tweaks pre-approved in review's Decisions.

- [x] **Task 6:** Sweep — Expo mobile
  - Files: 7 (3 inline `fontSize` + 4 NativeWind `text-[Npx]` + 1 SponsoredPill fontSize)
  - Commit: bb7684a
  - Notes: spec: ok — grep clean, typecheck 10/10. NotificationBell badge lineHeight bumped 12 → 14 alongside fontSize 10 → 12 (fontSize must not exceed lineHeight or text clips on RN). No `check-token-drift.sh` findings introduced by these edits (pre-existing sRGB literals in AppDrawerContent.tsx are outside touched lines).
