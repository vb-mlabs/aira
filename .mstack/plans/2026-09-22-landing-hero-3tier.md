# Plan: Landing hero — 3-tier "Discover. Support. Grow."

**Date:** 2026-09-22
**Slug:** 2026-09-22-landing-hero-3tier
**Status:** reviewed
**Author:** vb-mlabs (Claude Code)

---

## Problem

The current marketing landing hero (`apps/web/src/components/marketing/hero.tsx`)
is a centered, single-audience editorial composition built for **pre-launch
waitlist capture** — it renders the tree-of-life logo, "Roots & Reach"
tagline, "Atlanta's South Asian business directory, curated with care"
headline, and an embedded `<WaitlistCard />` email form.

That posture is behind where AIRA now sits. The client wants the hero to:
1. Address **both audiences at once** — community members (download the app)
   and business owners (list your business) — rather than funneling
   everyone through an email waitlist.
2. Read as a post-launch product marketing hero (QR codes + store badges,
   real "Get Listed" CTA), not "get notified".
3. Match the layout in the client-supplied reference image
   (`attached_assets/image_1790075464581.png`) — a 3-tier grouping with
   For Users left, phone center, For Business Owners right.

We ran `/mlabs-mockup` (variants at
`.mstack/mockups/landing-hero-3tier/`) and locked **v1 (balanced
tri-column)** as the winning direction — see
`.mstack/mockups/landing-hero-3tier/FEEDBACK.md`. This plan converts v1
into an implementation, **gated behind an env-var flag** so the current
hero stays default until we sign off in prod.

## Scope

**In:**
- New `HeroV2` component at `apps/web/src/components/marketing/hero-v2.tsx`
  implementing the v1 mockup with real AIRA design tokens, `lucide-react`
  icons, and `next/image` for the phone + logo assets.
- Env-var flag `NEXT_PUBLIC_LANDING_HERO_V2` added to the `client:` block
  of `apps/web/src/config/env.ts` (t3-env) and to `.env.example`.
- `apps/web/src/app/page.tsx` conditionally renders `<HeroV2 />` when
  `env.NEXT_PUBLIC_LANDING_HERO_V2 === "1"`, otherwise falls back to
  the existing `<Hero />` — zero visual change when the flag is off.
- Refinements from mockup feedback:
  - Icons swapped from in-file Feather SVGs → `lucide-react` set that the
    rest of `apps/web/src/components/marketing/` uses.
  - CTA weighting reconciled to the reference: solid `--primary` fill on
    the "Get Listed on AIRA" primary + cream/`--primary`-outline on the
    secondary. Drop the gradient the mockup used.
  - Brass-gold eyebrow contrast: use `text-muted-foreground` with
    `tracking-[2px] uppercase` instead of `text-brand-gold` for the
    "ROOTS & REACH" eyebrow (avoids the documented gold-on-cream
    AA-Large exemption in `.mstack/design-system/DESIGN.md`).
  - Leaf ornaments flanking the phone toned down (single olive tone at
    lower opacity, or removed — leave the call to code phase).
- Positioning shift to **app-live**: HeroV2 does NOT embed
  `<WaitlistCard />`. Users column shows the QR + store-badge block from
  the mockup. `<WaitlistCard />` remains available for other surfaces
  (footer capture) — not removed, just not in HeroV2.

**Out (deferred):**
- Removing the old `Hero` component and the flag itself — that's the
  follow-up cleanup PR **after** the flag flips to default-on in prod
  and stays clean for a week.
- The other blocks visible in the reference image but not in this hero:
  "How AIRA Works" 3-step strip, the two "AIRA for You / AIRA for
  Business" video cards, and the "Why Businesses Choose AIRA" 4-icon
  grid — separate `/mlabs-mockup` runs.
- Below-hero landing sections (`AboutEditorial`, `PhoneShowcase`,
  `BusinessPanel`, `MarketingFooter`) — unchanged this iteration. A
  later plan will revisit whether the phone showcase becomes redundant
  now that the hero includes a phone.
- Real Play Store / App Store deep-link URLs and QR code assets — the
  plan lands placeholder `href="#"` + decorative CSS QR blocks; a
  follow-up ticket wires real URLs + real QR PNGs once the app store
  listings are approved.
- Cookie / query-param preview override for the flag — captured as an
  open question below; recommend skipping for MVP.
- Copy migration to `brand.homepage.heroV2.*` in `packages/config` —
  decided to keep copy inline in `HeroV2` (matches current `Hero`).

## Approach

**Chosen: env-var-gated side-by-side component swap.**

Both `Hero` and `HeroV2` live in `apps/web/src/components/marketing/`
concurrently. `apps/web/src/app/page.tsx` becomes:

```tsx
import { env } from "@/config/env"
import { Hero } from "@/components/marketing/hero"
import { HeroV2 } from "@/components/marketing/hero-v2"
// …
const HeroComponent = env.NEXT_PUBLIC_LANDING_HERO_V2 === "1" ? HeroV2 : Hero
```

Rendered in the JSX where `<Hero />` currently sits. The chosen component
is fixed at build time (public env vars inline into the bundle), which
is fine because the flag is a per-deploy toggle, not per-request
personalization. Flip the flag by setting the env in the deploy target
and redeploying.

Add the flag to the t3-env `client:` block in
`apps/web/src/config/env.ts` (the file's `client:` block is currently
empty — this is the first `NEXT_PUBLIC_` variable). Schema:
`z.enum(["0", "1"]).optional().default("0")` so the app treats it as a
strict on/off boolean and the default matches "old hero renders". Also
add to `runtimeEnv` — t3-env requires public keys to be spelled
literally in `runtimeEnv` because Next inlines `process.env.NEXT_PUBLIC_*`
at build time from the source text, not runtime access.

Component structure (`HeroV2`):
- Root `<section>` mirroring the existing paper-cream texture background
  used by the current `Hero` (`bg-[url('/marketing-images/textures/paper-cream.webp')]`).
- Centered eyebrow + `<h1>` (Cormorant, `font-display`) + lede + sub.
- 3-column grid `grid grid-cols-1 md:grid-cols-[1fr_minmax(280px,360px)_1fr]`
  with 48px gap desktop / 56px gap mobile-stacked, phone column ordered
  first on mobile (matches the mockup responsive breakpoint).
- Left col: `Users` icon (`lucide-react`'s `Users` or `UserRound` — pick
  in code), 4 `<li>` with `Check` icons, QR block, store-badge pair.
- Center col: `<Image>` in a rounded phone frame (existing home-screen.png),
  optional single-tone SVG leaves as decorative elements.
- Right col: `Store` icon (`lucide-react`'s `Store`), 2 CTAs, 3
  `<li class="benefit">` rows with `ShieldCheck` / `Star` / `TrendingUp`
  icons.
- Primary CTA "Get Listed on AIRA" → `<a href="#businesses">` (anchors
  to `<BusinessPanel id="businesses">`). Secondary CTA "View Pricing &
  Add-Ons" → same `<a href="#businesses">` per user decision (no public
  pricing page yet). Matches the existing `MarketingNav` "Get Listed
  Early" pattern which also anchors to `#businesses`.
- No `WaitlistCard` inside `HeroV2` (positioning decision: app-live).

Copy sits inline in `HeroV2` — matches how the current `Hero` handles
marketing copy, and marketing components are on the
`no-brand-string-literal` allowlist. If the client later wants
fork-friendly copy, promote to `brand.homepage.heroV2.*` in a follow-up.

**Alternatives considered:**

- **Route-based preview (`/landing-v2`)** — rejected because it splits
  URL state (stakeholders review at `/landing-v2` but prod stays on
  `/`), and a cutover still requires a code change. Env-var gate keeps
  the same URL through the flip.
- **Runtime feature-flag service (GrowthBook / PostHog)** — rejected as
  over-engineered. This is a one-time swap, not an experiment, and AIRA
  has no flag infra today. Adding one for a single hero swap is a
  yak-shave.
- **In-place edit of `Hero`** — rejected because it loses the "old works
  fine as fallback" safety valve. Every current visitor sees the same
  hero until we ship the flag flip; if HeroV2 has a bug in prod, one
  env-var toggle rolls back with no code change.
- **Move copy to `brand.homepage.heroV2.*`** — rejected for MVP because
  no other marketing component pulls copy from `brand.homepage` beyond
  the app's `/home` screen; adding a second consumer with a mockup-fresh
  schema is premature. Revisit if the client rebrands.
- **Add a `?heroV2=1` query preview override** — captured as open
  question. Nice-to-have for stakeholder review without a redeploy;
  the plumbing (read `searchParams` in the RSC page) is 5 lines but adds
  a code path we'd have to strip alongside the flag.

## Data model changes

None. This is a marketing-only, presentational change; no server actions,
no `/api/v1/*` calls, no database access.

## Files to touch

**New:**
- `apps/web/src/components/marketing/hero-v2.tsx` — the 3-tier hero
  component. Server Component (no client interactivity beyond `<a>`).
- Optional but recommended: `apps/web/src/components/marketing/hero-v2.constants.ts`
  or an inline `const BENEFITS = [...]` array so the 3 benefit rows and
  4 user bullets aren't inlined-with-JSX (readability).

**Edit:**
- `apps/web/src/app/page.tsx` — import both `Hero` and `HeroV2`, add the
  ternary swap. **No other change.** Section order stays locked.
- `apps/web/src/config/env.ts` — add `NEXT_PUBLIC_LANDING_HERO_V2` to
  the (currently empty) `client:` block with
  `z.enum(["0", "1"]).default("0")`, and to `runtimeEnv` as
  `NEXT_PUBLIC_LANDING_HERO_V2: process.env.NEXT_PUBLIC_LANDING_HERO_V2`.
- `apps/web/.env.example` — add a documented entry:
  `# NEXT_PUBLIC_LANDING_HERO_V2=1  # Set to "1" to render the 3-tier
  landing hero. Default off — the current single-audience Hero
  renders.`

**Do NOT edit:**
- `apps/web/src/components/marketing/hero.tsx` — stays untouched as the
  fallback until the flag flips permanently.
- `apps/web/src/components/marketing/marketing-nav.tsx` — header stays as-is.
- `apps/web/src/components/marketing/{about-editorial,phone-showcase,business-panel,marketing-footer}.tsx`
  — below-hero sections unchanged this iteration.
- `apps/web/src/components/marketing/waitlist-card.tsx` — still used by
  the fallback `Hero`; remove-consideration deferred.

## Edge cases

- **Flag misconfigured to something other than "0"/"1"** — t3-env
  `z.enum(["0","1"])` throws at boot with a clear error. Default `"0"`
  ensures the app still renders even with the var completely unset.
- **SSR / RSC render** — `page.tsx` is a Server Component; `env` from
  `@/config/env` is safe to read there. No hydration mismatch because
  the chosen component is fixed at build time (`NEXT_PUBLIC_*` inlines
  into the bundle).
- **Prod build without the env var** — defaults to `"0"`, old hero
  renders. Zero-config safe.
- **Phone image `/marketing-images/home-screen.png` missing on a fork
  that hasn't uploaded it** — `next/image` throws a 404 at request.
  Mitigation: add a `sizes` prop and a placeholder `blurDataURL`; a
  broken landing hero image is loud enough to catch.
- **QR code + store-badge placeholders shipping to prod** — the plan
  ships placeholder `href="#"` links and CSS-drawn QR blocks. If the
  flag is flipped on in prod before real URLs land, users see dead
  links. **Reviewer must gate flag-flip on real URLs being wired** — see
  Acceptance criteria + Open questions.
- **Mobile layout stacking order** — the mockup places the phone
  first on mobile (via `order: -1` on the phone column). Reproduce that
  with Tailwind `order-*` utilities on the grid children so mobile
  users see the phone visual first, then user column, then owner column.
- **Anchor scroll to `#businesses`** — the target already exists on
  `<BusinessPanel id="businesses" className="scroll-mt-20">`. Verify
  smooth-scroll behavior is inherited from `html { scroll-behavior:
  smooth }` in `globals.css` (yes — line 309).
- **Sticky nav overlap on scroll-into-view** — `scroll-mt-20` on
  `BusinessPanel` already accounts for the 80px sticky nav; no change
  needed.
- **Icon-lib bundle size** — `lucide-react` is already imported by
  other marketing components (`marketing-footer`, `business-cta-pair`).
  Adding ~5 more icon imports is a no-op for bundle size (tree-shaken).
- **`brand.name` literal usage** — the eyebrow "ROOTS & REACH" is
  brand-tagline text and matches `brand.tagline` exactly; import
  `brand.tagline` from `@aira/config` so the string isn't duplicated. The
  benefit copy uses "AIRA Review" — that's a proper-noun product name;
  import `brand.name` and template as `` `${brand.name} Review` `` to
  satisfy the no-brand-string-literal ESLint rule.
- **Both `Hero` and `HeroV2` being tree-shaken correctly** — because the
  `ternary` in `page.tsx` is a runtime expression (even though its
  boolean is build-time constant), Next may include both components in
  the bundle. Acceptable trade-off for the safety valve; the second
  component is small (~a few KB gzipped). Alternative: use `dynamic()`
  imports gated on the flag, but the added complexity isn't worth it.

## Acceptance criteria

- [ ] `NEXT_PUBLIC_LANDING_HERO_V2` unset or `"0"`: `/` renders exactly
      as it does today — same `Hero`, same waitlist form, same OG
      metadata. Visual regression = zero.
- [ ] `NEXT_PUBLIC_LANDING_HERO_V2="1"`: `/` renders the 3-tier hero
      with MarketingNav above it and AboutEditorial / PhoneShowcase /
      BusinessPanel / MarketingFooter below, in that order.
- [ ] The 3-tier hero shows: centered eyebrow + Cormorant headline +
      lede + sub above a 3-column grid — For Users (icon + title + blurb
      + 4 checkmarks + QR block + store badges), Phone (home-screen
      image), For Business Owners (icon + title + blurb + primary CTA +
      outline CTA + 3 benefit rows).
- [ ] Both CTAs in the Owner column resolve to `#businesses` and
      smooth-scroll to `<BusinessPanel>`.
- [ ] All icons come from `lucide-react` (no in-file SVGs in `HeroV2`
      apart from optional decorative leaves).
- [ ] Copy strings that reference the brand pull from
      `@aira/config`'s `brand.name` / `brand.tagline`; no bare
      "AIRA" / "ROOTS & REACH" literals in `hero-v2.tsx`.
- [ ] Mobile viewport (≤ 480px): the phone column renders first,
      followed by user column, then owner column. All tap targets ≥
      44px per DESIGN.md persona rule.
- [ ] `pnpm typecheck` passes.
- [ ] `pnpm lint` passes (including `no-brand-string-literal`).
- [ ] `pnpm build` passes with the flag both set and unset.
- [ ] `pnpm test` passes (no new tests required for a presentational
      component with no interactivity, but existing tests must not
      regress).
- [ ] `.env.example` documents the new variable with a one-line comment.
- [ ] The eyebrow uses `text-muted-foreground` (not `text-brand-gold`)
      to avoid the DESIGN.md AA-Large exemption.

## Open questions

For `/mlabs-review` to resolve before implementation.

1. **Real Play Store / App Store URLs** — the plan ships `href="#"`
   placeholders. Are those URLs available now, or do we agree to gate
   the flag-flip in prod on them being wired first? (Strong recommend
   the latter — the flag exists precisely for this.)
2. **QR code assets** — real PNG QR codes for the two store URLs need
   to be produced (e.g. via `qrcode` CLI or an online generator).
   Where do they live in `public/` — `marketing-images/qr-play.png`
   and `marketing-images/qr-appstore.png`?
3. **Leaf ornaments** — keep both (olive + burnt-orange), keep one
   (olive), or remove entirely? Code phase should stub with a single
   `text-primary` opacity-40 SVG and get a taste review during the
   `/mlabs-code` open PR.
4. **Query / cookie preview override** — should we add `?heroV2=1` or
   an `aira-hero-v2=1` cookie so stakeholders can preview without a
   redeploy? Recommend: no for MVP (adds a code path we'd have to
   strip); revisit if reviewers complain.
5. **Waitlist implications** — with the flag flipped on and
   `WaitlistCard` gone from the hero, the landing has no email capture
   at all until the (unrelated) marketing-footer capture ships. Is that
   acceptable, or should HeroV2 keep a compact "get notified" tail
   somewhere? (Blocking: this changes the pitch.)
6. **`WaitlistCard`'s `source` prop typing** — currently
   `"marketing-hero" | "marketing-footer" | "business-mailto"`. If
   we're dropping the hero usage but keeping the type in place for the
   fallback `Hero`, that's fine. When the fallback is eventually
   deleted, remove `"marketing-hero"` from the union.
7. **OG image + metadata** — the current `page.tsx` metadata still
   references "Launching soon — get notified." Does the new
   positioning (app-live) require updating the OG description too? If
   so, that's a small addition to this plan; if not, defer.

## References

- **Winning mockup:** `.mstack/mockups/landing-hero-3tier/v1/index.html`
- **Mockup feedback:** `.mstack/mockups/landing-hero-3tier/FEEDBACK.md`
- **Client reference image:** `attached_assets/image_1790075464581.png`
- **Current hero (fallback):** `apps/web/src/components/marketing/hero.tsx`
- **Landing entry:** `apps/web/src/app/page.tsx`
- **Env pattern:** `apps/web/src/config/env.ts` (t3-env `client:` block)
- **Design tokens:** `packages/config/src/design.ts`,
  `apps/web/src/app/globals.css`, `.mstack/design-system/DESIGN.md`
- **Icon lib in use:** `lucide-react` (see
  `apps/web/src/components/marketing/marketing-footer.tsx` and
  `business-cta-pair.tsx`)
- **Reused CTA target:** `<BusinessPanel id="businesses">` in
  `apps/web/src/components/marketing/business-panel.tsx`
