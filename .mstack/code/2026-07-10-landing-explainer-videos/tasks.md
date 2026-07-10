# Implementation: Landing explainer videos

**Started:** 2026-07-10
**Review:** [2026-07-10-landing-explainer-videos](../../reviews/2026-07-10-landing-explainer-videos.md)
**Branch:** feat/landing-explainer-videos
**Status:** complete (3 done, 1 skipped)

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [x] **Task 1:** Add LiteYouTube marketing component
  - Files: `apps/web/src/components/marketing/lite-youtube.tsx` (new)
  - Commit: `d1e7eb9 feat(marketing): add LiteYouTube facade component`
  - Notes: Iframe is state-gated on `open` so audio stops instantly on close.

- [x] **Task 2:** Wire video 1 (DnmolbDEcVE) into WaitlistCard
  - Files: `apps/web/src/components/marketing/waitlist-card.tsx` (edit)
  - Commit: `c51c60d feat(marketing): wire notify-me-at-launch video into WaitlistCard`
  - Notes: Only in the non-success branch — thank-you view stays uncluttered.

- [x] **Task 3:** Wire videos 2 & 3 (snDcgvdaSQg, dLipSrr3tBY) into BusinessPanel
  - Files: `apps/web/src/components/marketing/business-panel.tsx` (edit)
  - Commit: `b2eeb13 feat(marketing): wire business-owner explainer videos into BusinessPanel`
  - Notes: Verified Badge → Membership left-to-right; captions in cream-muted for the olive surface.

- [-] **Task 4:** Vitest test for LiteYouTube
  - Files: `apps/web/src/components/marketing/lite-youtube.test.tsx` (would have been new)
  - Commit: —
  - Notes: Skipped by user decision (recommended option) after hitting a real React-instance duplication in the test env. Details in `log.md` and `report.md`.
