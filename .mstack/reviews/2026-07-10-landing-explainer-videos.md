# Review: Landing explainer videos (YouTube facade → Dialog)

**Date:** 2026-07-10
**Slug:** 2026-07-10-landing-explainer-videos
**Plan reviewed:** [2026-07-10-landing-explainer-videos.md](../plans/2026-07-10-landing-explainer-videos.md)
**Status:** approved
**UI-Significant:** no
**Reviewer:** vb-mlabs

---

## Summary

Plan is ready to implement with four decisions locked during review that
simplify the change: swap `next/image` for a plain `<img loading="lazy">`
(avoids adding a whole `images.remotePatterns` block to `next.config.mjs`),
switch the default poster URL from `hqdefault.jpg` (4:3 letterboxed) to
`mqdefault.jpg` (native 16:9, always exists), reverse the two Business Owner
videos so Verified Badge sits left (matches the perks list reading order),
and defer analytics + captions as explicit non-goals. CSP open question
resolved by reading the code — no CSP shipped anywhere on the marketing
route, so nothing to configure. Result: three-task implementation, no
config-file touches, no new dependencies, no migrations.

## Findings

### Blockers (must fix before /mlabs-code)

_None._

### Concerns (raised, decided, recorded)

- **Concern:** Plan says "add `i.ytimg.com` to `images.remotePatterns`", but
  `apps/web/next.config.mjs` has no `images` block at all — we'd be adding
  the entire object from scratch just to serve a 320×180 external thumbnail
  that YouTube already caches aggressively.
  **Decision:** Use plain `<img loading="lazy" src="...mqdefault.jpg"
  width="320" height="180">` instead of `next/image`. Zero config change,
  no build-time optimization work Next would do anyway (YouTube's poster
  is already the right size + format), and no `Image` domain plumbing to
  maintain. Reserving the 320×180 box on the element prevents CLS the same
  way `next/image` would.

- **Concern:** Plan's default poster `hqdefault.jpg` is 480×360 (4:3), which
  letterboxes YouTube's 16:9 source with visible black bars. Ugly on the
  cream card.
  **Decision:** Default to `https://i.ytimg.com/vi/{VIDEO_ID}/mqdefault.jpg`
  — 320×180, native 16:9, guaranteed to exist for every YouTube video.
  Right size for our in-flow surface too; no scaling needed. Skip
  `maxresdefault` entirely (404s on some videos + adds runtime fallback
  complexity).

- **Concern:** Plan orders the two Business Owner videos as Membership →
  Verified Badge, but the perks list in `business-panel.tsx` starts with
  "Verified badge" first. Left-to-right reading order should match.
  **Decision:** Reverse to Verified Badge (left) → Membership (right).
  Perks list stays the visual anchor; the videos read as an extension of
  it, not a re-ordering of the story.

- **Concern:** Plan mentions "CSP open question" — is there a `frame-src`
  header that would block `youtube-nocookie.com`?
  **Decision:** Resolved during review. `apps/web/next.config.mjs`
  `headers()` only sets content-type + cache-control for `/.well-known/*`.
  `apps/web/src/middleware.ts` is CORS-only for `/api/auth/*`. No CSP,
  X-Frame-Options, or `frame-src` directive ships anywhere. Iframe embed
  will work. Removed from open questions.

- **Concern:** Video 1 placement in `WaitlistCard` — the card contains an
  absolutely-positioned honeypot input (`position: absolute; left: -9999px`
  at lines 113–141 of `waitlist-card.tsx`). Plan should be explicit about
  where the `LiteYouTube` sits.
  **Decision:** Insert **inside** the wrapping `<div id={id}>` at the top
  of the non-`success` branch, above the `<h3>` "Be among the first 100
  users". Honeypot stays in the form scope; video sits above the headline.
  Not rendered in the `success` branch.

### Suggestions (taken or deferred)

- **Deferred:** Analytics event on Dialog open. No analytics currently wired
  on the landing (waitlist submits don't fire events either) — adding one
  now expands scope and forces a tool choice. Follow-up ticket.
- **Deferred:** Video captions. YouTube's CC ships inside the iframe when
  the source video has captions enabled — that's a creator-side action, not
  a landing-page concern.
- **Taken:** Vitest render test for `LiteYouTube` (asserting no iframe on
  initial render, iframe present after trigger click). Cheap to write given
  the component is 50 lines.
- **Taken:** Explicit "no `www.`" hygiene — apex `youtube-nocookie.com` and
  `i.ytimg.com` (no `www.` on either). Not the AIRA apex rule but the
  same discipline.

## Decisions locked

Net new decisions made during review (beyond what was in the plan):

- **Poster element:** plain `<img loading="lazy">`, not `next/image`.
- **Poster URL variant:** `mqdefault.jpg` (16:9, 320×180, guaranteed).
- **Video order (BusinessPanel):** Verified Badge (left) → Membership (right).
- **CSP:** confirmed no CSP anywhere — no config change needed.
- **Honeypot placement:** `LiteYouTube` sits inside the WaitlistCard's
  outer `<div id={id}>`, above the headline, above the form — honeypot's
  absolute-positioned input remains in its current position in the form.
- **Analytics + captions:** deferred (non-goals for this ticket).
- **Test:** ship a small Vitest test alongside the component.
- **Iframe URL shape:** `https://www.youtube-nocookie.com/embed/{VIDEO_ID}?autoplay=1&rel=0&modestbranding=1&playsinline=1`
  (adding `playsinline=1` so iOS Safari plays inline inside the Dialog
  rather than kicking to full-screen).

## Implementation plan

Ordered tasks for `/mlabs-code` to execute top-to-bottom. Each task is
atomic (reviewable as a single commit). Runs autonomously unless a task
lists a **Pause if** trigger.

### Task 1: Add `LiteYouTube` marketing component

- **Files:**
  - `apps/web/src/components/marketing/lite-youtube.tsx` (new)
- **What:** New client component. Props: `videoId: string`, `title: string`,
  `posterAlt: string`, `caption?: string`, `className?: string`.
  Renders a button element containing a plain
  `<img loading="lazy" src="https://i.ytimg.com/vi/{videoId}/mqdefault.jpg" width="320" height="180" alt={posterAlt}>`,
  a centered play-button overlay (SVG triangle in a brand-gold circle),
  and — if `caption` is set — a caption line below the poster (styled
  with the same font-display italic used in
  `ListingCardPreview`'s tagline). Clicking the button opens a
  `@base-ui/react` Dialog whose popup is a 16:9 iframe pointed at
  `https://www.youtube-nocookie.com/embed/{videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`.
  Iframe unmounts on close (state-guarded — do not just hide it).
  Dialog styling mirrors the "Get Listed Early" dialog in
  `business-cta-pair.tsx` (backdrop blur, cream card, brand-gold
  accent, backdrop + popup opacity + scale transitions). Popup width
  clamps to `min(800px, calc(100vw - 32px))` — larger than the sign-up
  dialog because video needs the real estate.
  Component is `"use client"`.
- **Acceptance:**
  - File exists at the given path.
  - Component exports a named React FC with the props above.
  - `pnpm --filter @aira/web typecheck` clean.
  - On initial render (poster visible, dialog closed), the DOM contains
    **no** `<iframe>` and issues **no** request to
    `youtube-nocookie.com` or `youtube.com` — verified in Task 4.
  - Clicking the poster opens the Dialog with the correct video ID
    autoplaying.
  - Closing the Dialog (Esc, backdrop click, or Close button) unmounts
    the iframe (audio stops).
  - Keyboard: Tab focuses the poster button, Enter opens the Dialog,
    Esc closes, focus returns to the poster.
- **Pause if:** none.

### Task 2: Wire video 1 into `WaitlistCard`

- **Files:**
  - `apps/web/src/components/marketing/waitlist-card.tsx` (edit)
- **What:** Import `LiteYouTube` from `./lite-youtube`. Inside the
  non-`success` branch (the `<>…</>` fragment), immediately before the
  existing `<h3>` at line 82, render:
  ```
  <LiteYouTube
    videoId="DnmolbDEcVE"
    title="Watch: what is AIRA?"
    posterAlt="Play the 60-second AIRA intro video"
    caption="60-second intro"
    className="mx-auto mb-6"
  />
  ```
  Do **not** render in the `success` branch. Poster centers above the
  headline; caption reads *60-second intro*. No other layout changes.
- **Acceptance:**
  - Video 1 poster renders inside the WaitlistCard, above the "Be among
    the first 100 users" headline, on initial page load (non-`success`
    state).
  - After successful waitlist submit, WaitlistCard swaps to the
    thank-you view and the video is **not** rendered.
  - `pnpm --filter @aira/web typecheck && pnpm --filter @aira/web lint`
    clean.
  - Manual click on the poster opens the Dialog and plays the correct
    video.
- **Pause if:** the copy strings ("Watch: what is AIRA?", "60-second
  intro") trip the `no-brand-string-literal` ESLint rule — surface the
  error, don't try to allowlist a new file.

### Task 3: Wire videos 2 & 3 into `BusinessPanel`

- **Files:**
  - `apps/web/src/components/marketing/business-panel.tsx` (edit)
- **What:** Import `LiteYouTube` from `./lite-youtube`. Inside the left
  column `<div>`, between the closing `</ul>` of the perks list and the
  `<BusinessCtaPair />` line, insert:
  ```
  <div className="mb-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
    <LiteYouTube
      videoId="snDcgvdaSQg"
      title="The Verified Badge & Stars"
      posterAlt="Play: what the blue tick and stars mean on AIRA"
      caption="The blue tick & stars, explained."
    />
    <LiteYouTube
      videoId="dLipSrr3tBY"
      title="Membership & Sponsorship, explained"
      posterAlt="Play: how AIRA membership and sponsorship work"
      caption="How membership & sponsorship work."
    />
  </div>
  ```
  Left → right order: Verified Badge, Membership (matches perks list
  reading order). Two-column grid on `sm:` and up; single column stacked
  on mobile. `mb-10` matches the `my-10` breathing room the perks list
  uses. Caption text color should inherit the cream-muted palette used
  elsewhere in the section (add `text-brand-cream-muted` if the
  caption element doesn't inherit correctly — verify visually).
- **Acceptance:**
  - Videos 2 & 3 render as a 2-column row inside `BusinessPanel`'s left
    column, between the perks list and `BusinessCtaPair`.
  - Left video is Verified Badge (`snDcgvdaSQg`); right is Membership
    (`dLipSrr3tBY`).
  - Mobile viewport (< `sm:`): videos stack vertically, still in the
    same relative order (Verified Badge above Membership).
  - Right column (`ListingCardPreview`) unchanged.
  - `pnpm --filter @aira/web typecheck && pnpm --filter @aira/web lint`
    clean.
- **Pause if:** the two-column video row visibly disrupts the section's
  vertical rhythm (e.g. pushes `ListingCardPreview` far out of vertical
  alignment on desktop) — surface a screenshot and ask before shipping.

### Task 4: Vitest test for `LiteYouTube` initial-render behaviour

- **Files:**
  - `apps/web/src/components/marketing/lite-youtube.test.tsx` (new)
- **What:** Vitest + Testing Library render test. Two assertions:
  1. On mount, `queryByRole("iframe")` (or a `container.querySelector("iframe")`)
     returns `null` — the facade must not include an iframe until the
     trigger is clicked.
  2. After firing a click on the poster button, `findByRole("dialog")`
     resolves and `container.querySelector("iframe")` is non-null,
     with `src` containing `youtube-nocookie.com/embed/<the-test-id>`
     and `autoplay=1`.
  Use a benign fake video ID (e.g. `"test-video-id"`) — this test does
  not actually load YouTube. If `@base-ui/react` Dialog needs any test
  environment shim (portal target), match whatever pattern any existing
  Dialog test in the repo uses; if none exists, use `document.body` as
  the portal target.
- **Acceptance:**
  - `pnpm --filter @aira/web test` passes.
  - Both assertions above evaluate green.
- **Pause if:** no existing Dialog test pattern exists in the repo AND
  the `@base-ui/react` Dialog portal doesn't render in JSDOM out of the
  box — surface the exact error; do not skip the test.

## Open questions

Anything still unresolved that `/mlabs-code` should escalate, not guess.

- **None.** All plan-level open questions were resolved during review
  (CSP → confirmed absent; poster resolution → `mqdefault`; caption copy
  → locked in the task descriptions above; video order → Verified Badge
  first; analytics + captions → deferred as explicit non-goals).
