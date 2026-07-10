# Report: Landing explainer videos

**Date:** 2026-07-10
**Slug:** 2026-07-10-landing-explainer-videos
**Review:** [.mstack/reviews/2026-07-10-landing-explainer-videos.md](../../reviews/2026-07-10-landing-explainer-videos.md)
**Branch:** `feat/landing-explainer-videos`
**Status:** complete (3 done, 1 skipped)

---

## Tasks

| # | Task | Status | Commit |
|---|---|---|---|
| 1 | Add `LiteYouTube` marketing component | ✓ done | `d1e7eb9` |
| 2 | Wire video 1 into `WaitlistCard` | ✓ done | `c51c60d` |
| 3 | Wire videos 2 & 3 into `BusinessPanel` | ✓ done | `b2eeb13` |
| 4 | Vitest test for `LiteYouTube` | ⊘ skipped | — |

## Commits

- `00e54f2` `docs(mstack): landing explainer videos plan + review`
- `d1e7eb9` `feat(marketing): add LiteYouTube facade component`
- `c51c60d` `feat(marketing): wire notify-me-at-launch video into WaitlistCard`
- `b2eeb13` `feat(marketing): wire business-owner explainer videos into BusinessPanel`

## What shipped

- New component `apps/web/src/components/marketing/lite-youtube.tsx` — a facade
  YouTube embed that renders a `mqdefault.jpg` poster + brand-gold play overlay,
  and opens a `@base-ui/react` Dialog on click. The `<iframe>` is state-gated
  on the Dialog's `open` prop, so closing the dialog unmounts it immediately
  and playback halts before the exit animation finishes. Uses
  `youtube-nocookie.com` — no requests to `youtube.com` on initial load.
- Video 1 (`DnmolbDEcVE`, "60-second intro") rendered inside `WaitlistCard`
  above the "Be among the first 100 users" headline, only in the non-`success`
  branch. Once the user submits, the thank-you view replaces everything.
- Videos 2 & 3 rendered as a 2-column grid inside `BusinessPanel`'s left
  column, between the perks list and `BusinessCtaPair`. Left: Verified
  Badge & Stars (`snDcgvdaSQg`); right: Membership & Sponsorship
  (`dLipSrr3tBY`). Stacks vertically on mobile. Captions in
  `text-brand-cream-muted` so they read cleanly on the olive section
  background.
- Zero config-file touches: no `next.config.mjs images.remotePatterns`, no
  CSP additions, no new dependencies.
- All commits passed lefthook (`check-migrations`, `check-contrast`).
  `pnpm --filter @aira/web typecheck` clean across every task.
  `pnpm --filter @aira/web lint` — no new warnings on the changed files.

## What didn't ship

- **Task 4 (Vitest test) was skipped.** Root cause was a real React-instance
  duplication in the test environment: `@testing-library/react` ships its own
  nested `react-dom` (v19.2.4) at
  `node_modules/@testing-library/react/node_modules/react-dom`, and the
  workspace root also has `react-dom@19.2.4` — same version, separate
  instances. Vitest's `resolve.alias` + `resolve.dedupe` +
  `test.server.deps.inline` don't override esbuild's pre-bundle resolution
  inside the nested tree. Detail in `log.md`. Cleanest fix is a workspace-root
  `pnpm.overrides` entry + `pnpm install`, which the user opted to defer as
  a follow-up rather than mix into a marketing-only feature branch.
- No analytics event on video open (deferred per review — no analytics wired
  elsewhere on the landing).
- No captions work on the landing side (deferred per review — YouTube's own
  captions ship inside the iframe when enabled on the source videos).

## Post-implementation iterations

- `1c31d79` `refactor(marketing): move business videos to right column below listing card`
  — user requested the two Business Owner videos move from a 2-column
  row inside the left column (between perks and CTAs) to the right
  column, stacked vertically beneath `ListingCardPreview`. Left column
  returns to its pre-video shape (perks list → CTA pair). This
  supersedes the review's Task 3 acceptance criterion about the videos
  being "inside BusinessPanel's left column, between the perks list and
  BusinessCtaPair"; the shipped layout is now: left = perks + CTAs;
  right = listing preview card + Verified Badge video + Membership video
  (stacked, `max-w-[380px]`).

## Follow-ups

- **Component-test infra.** Land a `pnpm.overrides` entry at the workspace
  root to dedupe react/react-dom, then re-add `lite-youtube.test.tsx` (the
  test itself was written and works structurally — it hit the React-instance
  duplication, not a logic bug). This unlocks all future component tests
  in `apps/web`, which currently has zero.
- **Captions.** Verify captions are enabled on the three source YouTube
  videos (creator-side action).
- **Analytics.** Decide analytics tool for the landing, then wire a
  `landing_video_open` event on Dialog open.

## Recommended next step

`/mlabs-qa` — focus on the landing page. Verify:
1. Initial page load: no requests to `youtube.com` / `youtube-nocookie.com`
   in DevTools Network tab; posters loading from `i.ytimg.com` only.
2. Video 1: poster visible in the WaitlistCard above the headline; opens
   Dialog on click; correct video plays; audio stops on close.
3. Video 1 disappears from the WaitlistCard after a successful waitlist
   submission (thank-you view).
4. Videos 2 & 3: 2-col on desktop, stacked on mobile; correct left→right
   order; captions readable on the olive background.
5. Keyboard nav: Tab focuses each poster; Enter opens Dialog; Esc closes;
   focus returns to the poster.
6. Mobile Safari: video plays inline inside the Dialog (playsinline=1),
   not full-screen kick.
