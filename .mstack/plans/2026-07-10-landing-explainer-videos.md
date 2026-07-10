# Plan: Landing explainer videos (YouTube facade → Dialog)

**Date:** 2026-07-10
**Slug:** 2026-07-10-landing-explainer-videos
**Status:** implemented
**Author:** vb-mlabs

---

## Problem

Pre-launch landing page currently reads as text-only marketing prose. Two
concrete audiences arrive with different mental models and neither has a
low-friction way to *see* the product before deciding to opt in:

1. **Users** landing on the Hero see the waitlist card but no explanation of
   what AIRA actually is — the "Notify me at launch" CTA asks for commitment
   before the value prop is visible.
2. **Business owners** scanning the "For business owners" panel see a perks
   list ("Verified badge", "Sponsored placement", …) but no visual on how
   membership works or what the blue tick / stars actually mean before they
   click "Get Listed Early".

We have three ready-to-embed YouTube explainers (provided by the user) that
close exactly these gaps. The problem is *how* to embed them so they add
context without tanking the landing's LCP/CLS or hijacking the section
rhythm.

## Scope

**In:**
- A new marketing `LiteYouTube` component (facade thumbnail + play overlay
  that opens a `@base-ui/react` Dialog with a `youtube-nocookie.com` iframe).
- Wire video 1 (`DnmolbDEcVE` — "Notify me at launch") **inside**
  `WaitlistCard`, above the "Be among the first 100 users" headline.
- Wire videos 2 & 3 (`dLipSrr3tBY` — "AIRA Membership & Sponsorship";
  `snDcgvdaSQg` — "AIRA verified badge & Stars") into `BusinessPanel` as a
  new 2-column row **below the perks list, above the CTA pair**.
- Suggested labels/copy for each video (for reviewer to approve/refine).
- Reuse existing design tokens (`brand-gold`, `brand-cream-bright`,
  `bg-card`, oklch palette from `@aira/config`).
- Privacy-preserving embed via `youtube-nocookie.com`; no YouTube JS on
  initial load.

**Out (deferred):**
- Self-hosted or Mux-hosted video (stays on YouTube for now — creator retains
  the source of truth, no bandwidth cost, no CDN work).
- Analytics on video open/play (not wired; can be a follow-up).
- Auto-play, autoplay-muted, or scroll-into-view previews.
- Captions / transcript rendering on the landing page (YouTube's own captions
  ship inside the iframe).
- Consent banner integration (there is none today; the facade + `-nocookie`
  domain sidesteps the need until we add one).
- Modifying `PhoneShowcase` or `AboutEditorial`.

## Approach

**Facade → Dialog modal.** Build one small client component,
`LiteYouTube`, that renders a static poster thumbnail (Next `Image`) with a
brand-styled play button overlay. Click opens a `@base-ui/react` Dialog
(same primitive already used in `apps/web/src/components/marketing/business-cta-pair.tsx`)
whose popup is a 16:9 iframe pointed at
`https://www.youtube-nocookie.com/embed/{VIDEO_ID}?autoplay=1&rel=0&modestbranding=1`.
When the dialog closes, the iframe unmounts — playback stops, no leaked
audio, no lingering third-party JS.

This gives us the best of every column of the tradeoff matrix from the
consultation:

- **Perf:** zero YouTube iframe or JS on first paint. LCP/CLS on the landing
  stays governed by the tree-of-life PNG and the waitlist card — same as
  today. Landing already ships an `<Image priority>` for the logo; poster
  thumbnails use the standard lazy path.
- **Privacy:** `youtube-nocookie.com` domain, and no request to YouTube at
  all until the user clicks — a soft consent gesture.
- **Section rhythm:** videos surface as small posters (roughly 320×180
  desktop, full-width mobile) that sit *inside* the existing sections
  instead of adding a new full-width block. The Hero remains centered on
  the tree-of-life + waitlist card; the BusinessPanel keeps its perks +
  `ListingCardPreview` structure.
- **Consistency:** reuses the exact `Dialog.Root` / `Dialog.Portal` /
  `Dialog.Backdrop` / `Dialog.Popup` composition that already ships in
  `business-cta-pair.tsx`, including the backdrop blur/opacity transitions
  and the "gold accent + cream card" surface treatment.

Thumbnails come from YouTube's standard poster endpoint
(`https://i.ytimg.com/vi/{id}/hqdefault.jpg` — falls back to `sddefault`
or `maxresdefault` if we prefer sharper). Because these are hot-linked
external images, `next.config.mjs` needs `i.ytimg.com` (and probably
`img.youtube.com` as belt-and-braces) added to `images.remotePatterns`.

Component placement:
- `LiteYouTube` lives at
  `apps/web/src/components/marketing/lite-youtube.tsx` — it's marketing-page
  furniture, same folder as `hero.tsx` etc.
- It's a client component (`"use client"`) because it owns the Dialog
  open/close state.

**Alternatives considered:**

- **Inline iframe (option B in consultation).** Rejected: three YouTube
  iframes on the landing pull ≥ 400 KB of third-party JS on first paint,
  murder LCP on low-end mobile, and every page view sends a request to
  `youtube.com` (no consent gesture). Also visually dominates the Hero.

- **Inline facade swap in-place (option C).** Rejected: still requires
  reserving 16:9 space in-flow, which materially changes both the
  centered-hero rhythm and the two-column BusinessPanel layout. The
  Dialog approach lets the poster sit small in-flow (or as a compact
  card) while the actual playback surface is generously sized without
  competing with surrounding content.

- **Self-hosted MP4 or Mux.** Rejected for MVP. YouTube is where the
  creator (user) is producing these; keeping them on YouTube lets the
  same asset serve the AIRA channel, embeds, and any future in-app tour.
  Revisit only if we need frame-accurate control, captions on the
  landing surface itself, or per-play analytics.

- **`lite-youtube-embed` npm dep or `<lite-youtube>` custom element.**
  Rejected: adds a dep + web-component polyfill for functionality we can
  express in ~40 lines with the primitives we already have. The wins
  (dedicated component maintained by Paul Irish) don't outweigh the
  bundle + integration cost for three thumbnails.

## Data model changes

None. Video IDs are constants inside the marketing components.

## Files to touch

**New:**
- `apps/web/src/components/marketing/lite-youtube.tsx` — `LiteYouTube`
  client component. Props: `videoId: string`, `title: string`,
  `thumbnailAlt: string`, optional `className?: string`. Owns Dialog
  state, renders poster + play overlay + Dialog with 16:9 iframe.
- (Optional) `apps/web/src/components/marketing/lite-youtube.test.tsx` —
  a Vitest render test that (a) verifies no iframe in the DOM on initial
  render and (b) verifies the iframe appears after the trigger is
  clicked. Nice-to-have; skip if scope-cutting.

**Edit:**
- `apps/web/src/components/marketing/waitlist-card.tsx` — insert a
  `<LiteYouTube>` at the top of the card, above the "Be among the first
  100 users" `<h3>`. Only render it in the non-`success` state (once the
  user has submitted, the thank-you replaces the entire content).
- `apps/web/src/components/marketing/business-panel.tsx` — insert a new
  `<div className="grid grid-cols-1 gap-6 sm:grid-cols-2">` row inside
  the left column, between the closing `</ul>` of perks and the
  `<BusinessCtaPair />` line. Two `<LiteYouTube>` children.
- `apps/web/next.config.mjs` — add `i.ytimg.com` (and
  `img.youtube.com`) to `images.remotePatterns` so Next's `<Image>` can
  serve YouTube posters.
- `apps/web/src/config/csp.ts` (or wherever the CSP `frame-src` /
  `connect-src` directives live — reviewer to confirm) — allow
  `https://www.youtube-nocookie.com` on `frame-src`. Only relevant if the
  app currently ships a strict CSP header; if none exists on the
  marketing route, skip.

**Suggested labels/copy (for reviewer to lock):**
- Video 1 (`DnmolbDEcVE`) inside WaitlistCard:
  `title="Watch: what is AIRA?"` — displayed as a caption under the
  poster: *"60-second intro"*.
- Video 2 (`dLipSrr3tBY`) in BusinessPanel:
  `title="Membership & Sponsorship, explained"` — caption:
  *"How AIRA membership works for your business."*
- Video 3 (`snDcgvdaSQg`) in BusinessPanel:
  `title="The Verified Badge & Stars"` — caption:
  *"What the blue tick and star ratings mean on AIRA."*

All three copy strings live inline in the parent (WaitlistCard /
BusinessPanel) per the same "marketing prose is section-local" pattern
already in `hero.tsx` and `business-panel.tsx`. Not routed through the
brand-string ESLint allowlist because they don't contain the literal
brand name in a way that would trigger it — but reviewer to double-check.

## Edge cases

- **iframe autoplay blocked on Safari mobile without user gesture** —
  we're opening the iframe *from* a user click on the poster, so the
  browser treats that as a gesture and `autoplay=1` works. Still,
  fallback: if autoplay fails, the YouTube player will just show its own
  play button — no visible bug.
- **YouTube thumbnail URL variants** — `hqdefault.jpg` always exists;
  `maxresdefault.jpg` returns 404 for some videos. Default to
  `hqdefault`, don't try to fall back at runtime (avoid a broken image
  flash).
- **Dialog stack collision inside `WaitlistCard`.** WaitlistCard is
  inside the Hero, which does not currently host any Dialog. Fine.
  Inside `BusinessPanel` the CTAs already use `Dialog.Root`. Two
  `Dialog.Root` instances on the same tree are safe with `@base-ui/react`
  as long as each has its own portal — verify at review by checking that
  the "View Launch Offer" and the video Dialogs can coexist.
- **Waitlist success state.** Once the user submits, WaitlistCard swaps
  to the thank-you view. The video must not render there — otherwise
  it steals attention from the confirmation. Guard: render `LiteYouTube`
  only when `status.kind !== "success"`.
- **CLS on hero when the poster loads.** Use fixed dimensions on the
  Next `<Image>` (`width={320} height={180}` or via `aspect-video` + fill).
  No layout shift.
- **Right-column `ListingCardPreview` on mobile.** BusinessPanel already
  stacks to single-column at `md:` breakpoint. New video row inside the
  left column will land between the perks and the CTAs on mobile, above
  the preview card — check that the visual order still reads
  perks → videos → CTAs → preview card, which is the intended flow.
- **`youtube-nocookie` iframe on strict CSP.** If a `frame-src` directive
  is set anywhere, the iframe will refuse to load. Reviewer to confirm no
  Next.js response-header CSP is set on the marketing route (`/`); we've
  historically been permissive there.
- **Focus trap on close.** `@base-ui/react` Dialog handles focus return
  to the trigger. Verify manually — a poster tab-index issue would break
  keyboard nav for anyone tabbing through the Hero.

## Acceptance criteria

- [ ] `LiteYouTube` component exists at
      `apps/web/src/components/marketing/lite-youtube.tsx` and exports a
      typed React FC accepting `videoId`, `title`, `thumbnailAlt`.
- [ ] Video 1 renders inside `WaitlistCard`, above the "Be among the
      first 100 users" headline, only in the non-`success` state.
- [ ] Videos 2 & 3 render inside `BusinessPanel` as a 2-column grid
      (single column on mobile) between the perks list and
      `BusinessCtaPair`.
- [ ] Landing page network waterfall shows **zero** requests to
      `youtube.com` or `youtube-nocookie.com` on initial load (verified
      via `pnpm dev` + DevTools Network tab). Only the poster image
      requests hit `i.ytimg.com`.
- [ ] Clicking any poster opens a Dialog with the correct video
      auto-playing. Closing the Dialog stops playback (iframe unmounts).
- [ ] Keyboard navigation: Tab to poster → Enter → dialog opens; Esc
      closes; focus returns to the poster.
- [ ] `pnpm typecheck && pnpm lint` clean.
- [ ] No `www.` YouTube host anywhere — apex `youtube-nocookie.com` for
      the iframe, `i.ytimg.com` for posters. (This isn't AIRA's apex rule,
      but it keeps things consistent with the "no `www.`" hygiene.)
- [ ] Manual mobile check on iPhone Safari + Android Chrome via Expo
      Go tunnel or `pnpm dev` — poster + dialog + playback all work.

## Open questions

For the reviewer (`/mlabs-review`) to resolve before implementation.

- **CSP.** Is there a `frame-src` / `Content-Security-Policy` header set
  on the marketing route that would block `www.youtube-nocookie.com`? If
  so, we need to add the directive. Check `apps/web/next.config.mjs` +
  any `middleware.ts` in the marketing tree.
- **Poster resolution.** Default `hqdefault.jpg` (480×360, 4:3 letterboxed
  → looks slightly compressed on retina). Should we prefer
  `maxresdefault.jpg` (1280×720) with a graceful fallback, or stick with
  `hqdefault` for guaranteed availability?
- **Video captions.** These three explainers likely need captions before
  going in front of pre-launch traffic. In-scope for this ticket, or a
  separate follow-up on the creator side? (YouTube's own captions ship
  inside the iframe if enabled on the videos themselves; the landing
  doesn't need to do anything if they're already captioned.)
- **Analytics.** Should we fire a `posthog.capture("landing_video_open",
  { video_id })` (or whichever analytics we're on) on Dialog open? Not
  wired today, but a one-liner to add.
- **Copy on the poster caption.** The three caption strings in the plan
  are proposals. Reviewer/user to accept or provide replacements before
  `/mlabs-code`.
- **Order of videos 2 & 3.** Membership video first (left) or Verified
  Badge first (left)? Current plan: Membership → Verified Badge
  (left → right), following the perks list order ("Verified badge",
  "Sponsored placement"). Confirm.
