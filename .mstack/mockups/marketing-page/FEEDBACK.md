# Marketing-page mockup — final feedback

**Date:** 2026-05-25
**Status:** ✅ Shipped (winner locked)
**Winner:** **v4** — `.mstack/mockups/marketing-page/v4/index.html`
**Companion docs:** [BRIEF.md](./BRIEF.md) · [v4/NOTES.md](./v4/NOTES.md)

---

## Final structure (what /mlabs-plan should build)

The shipped page, top to bottom:

1. **Sticky nav** — AIRA tree-of-life logo + "AIRA / by Nisarga" wordmark left. Single quiet right-aligned "Get notified at launch" link with a brass-gold underline (not a pill button).
2. **Centered editorial hero** (full viewport minus nav) — tree-of-life logo at 140px, big Cormorant headline `A directory of Atlanta's Indian community, *curated with care.*`, italic tagline `Roots & *Reach*` (REACH in brass-gold).
3. **"Be among the first 100 neighbors" callout card** *(inside the hero, below the tagline)* — boxed cream card with brass-gold border and lifted shadow. Cormorant subhead `Be among the first *100 neighbors* to know`. Sub: `We'll email you exactly once: the day AIRA opens in Atlanta.` Email input + "Notify me" pill button. Fine print: `No spam, no resale. Operated by Nisarga Group LLC.`
4. **About — editorial 2-col, no card frame** — gold ornament + eyebrow "Why we built this" + serif headline "The opposite of an algorithm and a pile of *scraped data*". Left col: drop-cap paragraph (the "Most directory apps..." opener). Right col (muted): 2 paragraphs grounding the Atlanta-first thesis.
5. **Categories — editorial roster (v3 style, no hover)** — eyebrow "What you'll find" + headline "From *dosa* to *doctors*" + lede about hierarchy colors. 7 rows, each: roman numeral in italic gold serif, Cormorant category name with tier-color underline (green/orange/brown), italic subcategory list, static gold › arrow. No hover state — matches v3 exactly.
6. **Phone showcase** — two-phone tilted setup (Home + Listings screens, -7° / +7° rotations). Copy on right: eyebrow "The app" + headline "Built for the way you *actually* look for things" + 3-bullet list with serif primary-green chevrons.
7. **Business panel (olive bg, paper texture)** — full-bleed olive (`oklch(0.42 0.06 130)`) with green paper-grain texture. 2-col grid: copy + 4 checkmark perks (Verified badge, Sponsored placement, Multi-category listing, Broadcast) + cream "Get in touch about being listed →" CTA on left; listing card preview + italic caption on right.
8. **Footer** — 4-col: brand block (logo + name + "Roots & Reach" italic tag) / For users / For businesses / Legal. Bottom bar: © 2026 Nisarga Group LLC + "Operated by Nisarga Group LLC ✦" signature.

## What was deliberately removed during iteration

- **"Launching in Atlanta · 2026" hero eyebrow.** Replaced by the "Be among the first 100" callout, which carries the pre-launch context with more intent.
- **Categories hover state** I added on first pass (background tint + arrow nudge). Removed — the static editorial roster matches v3's stillness better.
- **"Why AIRA" trust 3-col section** (Curated by hand / Verified by community / Operated by Nisarga). Removed entirely. Trust signals are now distributed: "curated with care" in the headline, the About section, the Operated by Nisarga footer signature, and the listing card preview that shows the verified tick.

## What's NOT on this page (intentional, per BRIEF)

- App Store / Google Play badges — false claim, pre-launch
- Fake metrics ("500+ businesses!") — zero claims we can't back up
- Stock photos of people — keep imagery to logo + app screens only
- Membership pricing — admin-configurable, still being finalized per `roadmap.md`
- Testimonials from real users — we don't have any yet
- A separate "How it works" / FAQ / press section — could land in a v2 of the marketing page once we have real customers

## Design system fidelity

All tokens pulled directly from `packages/config/src/design.ts` / `apps/web/src/app/globals.css`. The locked values used:
- `--background` page cream + paper-grain SVG texture
- `--primary` olive green for CTAs and accent
- `--tier1 / --tier2 / --tier3` for category underlines
- `--brand-gold` for ornaments + nav underline
- `--brand-cream-bright / -muted` for text on the olive business panel
- `--info` for the verified blue tick in the listing card preview
- Cormorant Garamond Bold for all serif headlines; Lato Regular/Bold for all sans body and UI
- Radius `0.875rem` base; pills `9999px` for buttons; `24px` for the callout card

Zero new colors, zero new fonts introduced.

## Implementation notes for /mlabs-plan

When this gets turned into code, the natural component split is:

```
apps/web/src/components/marketing/
├── marketing-nav.tsx        (KEEP, restyle from MLabs orange to AIRA quiet-gold)
├── marketing-footer.tsx     (KEEP, restyle to AIRA 4-col + Nisarga signature)
├── hero.tsx                 (REWRITE — centered editorial + WaitlistCard inside)
├── waitlist-card.tsx        (NEW — extracted; reusable as a section or in hero)
├── about-editorial.tsx      (NEW — 2-col editorial with drop cap, no card frame)
├── categories-roster.tsx    (NEW — v3-style numbered list with tier underlines)
├── phone-showcase.tsx       (NEW — two tilted phones + copy)
└── business-panel.tsx       (NEW — olive bg section + listing card preview)
```

Components to **retire** (currently imported in `apps/web/src/app/page.tsx`):
- `WhyMstack` — replaced by editorial About
- `ProductMock` — replaced by PhoneShowcase
- `LogoStrip` — no logos to strip; we have no partners to display
- `FeatureGrid` — replaced by CategoriesRoster (different intent anyway)
- `Testimonial` — no testimonials yet
- `CtaBand` — converted into the BusinessPanel below the fold

The `Hero` and `MarketingNav` and `MarketingFooter` files can be rewritten in place (same file paths).

Brand strings (`AIRA`, `Roots & Reach`, `support@aira.app`, etc.) must come from `packages/config/src/brand.ts` per the `no-brand-string-literal` ESLint rule — except inside marketing copy, which is on the allowlist (`apps/web/src/components/marketing/**`).

Email form needs a backend: simplest is a Postmark template + new `/api/v1/waitlist` route that stores `(email, created_at)` in a `waitlist` Drizzle table. Sprint 0 or 1 work.

## Next step

`/mlabs-plan` — turn v4 into a shippable implementation slice. The plan should:
1. Add a `waitlist` Drizzle schema + `/api/v1/waitlist` POST route.
2. Add a Postmark "Welcome to the AIRA waitlist" email template.
3. Rewrite the marketing components per the file split above.
4. Update `apps/web/src/app/page.tsx` to import the new component tree.
5. Retire `WhyMstack`, `ProductMock`, `LogoStrip`, `FeatureGrid`, `Testimonial`, `CtaBand`.
6. Set page-level metadata (OpenGraph image, title, description) for shareability.
