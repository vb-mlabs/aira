# UX audit — 2026-05-25 11:40

**Scope:** `/` (marketing landing — single-screen deep dive)
**Env:** localhost:5000 via Replit tunnel (post-QA fixes 4fdfb21..57c1599)
**Status:** fixes_applied · 6 fixed · 1 deferred (documented) · 1 info-only
**Reviewer:** /mlabs-ux-audit
**Capture spec:** [specs/capture.mjs](./specs/capture.mjs) · re-verify: [specs/capture-after.mjs](./specs/capture-after.mjs)
**Assets:** [assets/](./assets/) — 16 before + 16 after screenshots

---

## Screens

| Screen | Desktop (1440×900) | Mobile (390×844) |
|---|---|---|
| / (full page) | assets/landing-desktop-full.png | assets/landing-mobile-full.png |
| Nav | assets/01-nav-desktop.png | assets/01-nav-mobile.png |
| Hero | assets/02-hero-desktop.png | assets/02-hero-mobile.png |
| About | assets/03-about-desktop.png | assets/03-about-mobile.png |
| Categories | assets/04-categories-desktop.png | assets/04-categories-mobile.png |
| Phone showcase | assets/05-phone-desktop.png | assets/05-phone-mobile.png |
| Business panel | assets/06-businesses-desktop.png | assets/06-businesses-mobile.png |
| Footer | assets/07-footer-desktop.png | assets/07-footer-mobile.png |

## What's working well (intentional, don't change)

- **Cormorant + Lato pairing reads beautifully now** (post Cormorant fix). Hero "A directory of Atlanta's Indian community, *curated with care.*" is the page-defining moment and lands.
- **Categories editorial roster** with roman numerals + tier-color underlines + italic Cormorant subcategory examples is genuinely distinctive. Most directory marketing sites cop out with a tiles grid — AIRA's roster reads like a quarterly journal's "Sections" page.
- **About section's drop-cap "M"** + 2-col layout with left = lead paragraph and right = supporting copy in muted tone — exactly the editorial register the brand wants.
- **Anti-slop discipline holds.** Zero stock illustrations. Zero generic emoji. Zero "trust badges" or fake testimonials. Brass-gold `✦` ornament appears exactly twice (above About, above Categories) — restrained.
- **No App Store badges and no fake metrics** — the brief's discipline survives in code. The honest pre-launch framing of "Be among the first 100 neighbors to know" is more interesting than a generic "Coming Soon" anyway.

## Issues

### Issue 1: Footer "About AIRA" link is broken — anchor doesn't exist

- **Screen:** / (footer)
- **Dimension:** flow friction
- **Severity:** HIGH
- **Where:** `apps/web/src/components/marketing/marketing-footer.tsx:15` links to `#about`, but `apps/web/src/components/marketing/about-editorial.tsx:13` has `<section className="px-6 py-[120px] md:py-[120px]">` — no `id="about"`.
- **Observation:** Clicking the footer's "About AIRA" link scrolls to the top of the page (no matching anchor target). The other anchor links work: `#categories` resolves (CategoriesRoster has `id="categories"`), `#businesses` resolves (BusinessPanel has `id="businesses"`), `#notify` resolves (WaitlistCard has `id="notify"`). About is the only broken one.
- **Fix:** Add `id="about"` to the `<section>` in `about-editorial.tsx`. One line.
- **Status:** ✓ fixed (commit `748e631`, after: `assets/07-footer-desktop-after.png` — footer link now resolves; `id="about"` confirmed in rendered DOM via curl)

### Issue 2: Brand tokens hardcoded as OKLCH literals across components

- **Screen:** / (about ornament, categories ornament + row borders)
- **Dimension:** tokens (design-system discipline)
- **Severity:** MEDIUM (works visually; future maintenance pain; bypasses the rebrand layer)
- **Where:**
  - `about-editorial.tsx:57,61` — hr `bg-[color:oklch(0.66_0.10_80_/_50%)]`
  - `categories-roster.tsx:95,97` — `border-[color:oklch(0.50_0.07_80_/_25%)]` (row dividers)
  - `categories-roster.tsx:142,146` — same brand-gold ornament hardcodes as above
  - Likely more in `business-panel.tsx` and `phone-showcase.tsx` (the cream-tinted overlays)
- **Observation:** `globals.css` already registers `--color-brand-gold` and `--color-border` via the `@theme inline` block. The components use raw `oklch(...)` literals instead. If anyone later darkens `--brand-gold` (or a fork rebrands), these literals don't move and the design drifts.
- **Fix:** Sweep `bg-[color:oklch(0.66_0.10_80_/_50%)]` → `bg-brand-gold/50` and `border-[color:oklch(0.50_0.07_80_/_25%)]` → `border-border/25`. Tailwind's opacity-modifier syntax (`/50`, `/25`) works on registered color utilities. Also sweep `text-[color:var(--brand-gold)]` → `text-brand-gold` for consistency.
- **Status:** ✓ fixed (commit `c089bd1`, after: `assets/04-categories-desktop-after.png`, `assets/03-about-desktop-after.png`, `assets/06-businesses-desktop-after.png`). Sweep covered: `bg-brand-gold/50`, `border-border/25` (incl. footer bottom-bar border), `text-brand-gold`, and the cream-overlay siblings `text-brand-cream-bright` / `bg-brand-cream-bright` / `text-brand-cream-muted` in business-panel.tsx. Out-of-scope follow-ups: footer top `border-[color:oklch(0.50_0.07_80_/_30%)]`, nav underline `border-[color:oklch(0.66_0.10_80_/_60%)]`, waitlist border `oklch(0.66_0.10_80_/_45%)` — same anti-pattern, different alphas; left for a follow-up sweep. Brand-green `bg-[color:oklch(0.42_0.06_130)]` has no registered token, would need `/mlabs-plan` to add one.

### Issue 3: Footer bottom bar redundantly mentions Nisarga Group LLC twice

- **Screen:** / (footer)
- **Dimension:** copy clarity / brand fidelity
- **Severity:** MEDIUM
- **Where:** `marketing-footer.tsx:58-63`
- **Observation:** The bottom bar renders:
  - Left: `© 2026 Nisarga Group LLC. All rights reserved.`
  - Right: `Operated by Nisarga Group LLC ✦`
  
  "Nisarga Group LLC" appears twice in 60px of vertical space. Reads as boilerplate copy-paste, not editorial-brand voice. "All rights reserved" is also legally unnecessary in 2026 — implied by default.
- **Fix:** Consolidate to:
  - Left: `© 2026 AIRA` (use brand.name)
  - Right: `Operated by Nisarga Group LLC ✦` (keep the signature)
  
  Single LLC mention, brand name on copyright line, signature preserved.
- **Status:** ✓ fixed (commit `1b443c5`, after: `assets/07-footer-desktop-after.png` — confirms `© 2026 AIRA` left / `Operated by Nisarga Group LLC ✦` right)

### Issue 4: Ornament component duplicated across files (DRY)

- **Screen:** / (about + categories)
- **Dimension:** tokens / code health
- **Severity:** LOW
- **Where:** `about-editorial.tsx:54-64` and `categories-roster.tsx:139-149` define identical `Ornament` functions.
- **Observation:** Same ✦ + double-hairline ornament defined twice. If the design changes (different glyph, longer hairlines, smaller padding), we'd update two files.
- **Fix:** Extract to `apps/web/src/components/marketing/_ornament.tsx` (underscore prefix marks it as internal-only) and import in both. Bundle with Issue 2's token sweep since they touch the same lines.
- **Status:** ✓ fixed (commit `c089bd1`, bundled with Issue 2). `_ornament.tsx` is the new single source; about-editorial + categories-roster import it.

### Issue 5: brand-gold tagline "Reach" is borderline contrast on cream bg

- **Screen:** / (hero tagline)
- **Dimension:** contrast (informational text below the AA-Large threshold)
- **Severity:** LOW (ornamental positioning, not body copy)
- **Where:** `hero.tsx` — `<em className="font-bold not-italic text-[color:var(--brand-gold)]">Reach</em>` against `background` cream
- **Observation:** `--brand-gold` (`oklch(0.66 0.10 80)`) on `--background` (`oklch(0.90 0.04 85)`) is ~2.5:1. Below AA Large's 3:1 bar. The "Reach" word carries meaning (it's part of "Roots & Reach" — the brand tagline), so it's arguably not purely decorative.
- **Fix proposals (pick one):**
  - **Accept + document.** Tagline is ornamental italic small text; same pattern as the tier2 AA-Large exemption in `scripts/check-contrast.ts`. Add a brief note to `DESIGN.md` § Contrast notes.
  - **Darken `--brand-gold` to ~`oklch(0.58 0.10 80)`** for ≥3:1. Affects ornaments, footer divider, nav underline — minor visual shift everywhere brass-gold is used.
- **Recommendation:** ACCEPT + document. The darker gold would feel less ornamental, and the tagline's communicative weight is carried by "Roots" (in foreground brown). Defer change.
- **Status:** ⊘ deferred + documented (commit `02644d8`, `.mstack/design-system/DESIGN.md` Contrast notes entry #3)

### Issue 6: Mobile hero is full-viewport-tall — section 2 needs significant scroll to discover

- **Screen:** / (mobile hero)
- **Dimension:** flow friction / responsive
- **Severity:** NIT (intentional editorial choice; users CAN scroll)
- **Where:** `hero.tsx:13` — `min-h-[calc(100vh-80px)]`
- **Observation:** On 390×844 viewport, the hero (logo + headline + tagline + callout) consumes ~760px of vertical space. Combined with the 80px sticky nav, the hero fills the viewport. Mobile users have to scroll a full screen to discover the About section. Also: iOS Safari's `100vh` includes the address bar so the hero is *taller* than viewport, causing the WaitlistCard to be partially clipped until the browser chrome retracts.
- **Fix:** Change `min-h-[calc(100vh-80px)]` → `min-h-[calc(100svh-80px)]`. `svh` (small viewport height) uses the dimension *with* browser chrome present, so the hero never exceeds the visible viewport. iOS Safari & Chrome both support it.
- **Status:** ✓ fixed (commit `c2d06ae`, after: `assets/02-hero-mobile-after.png` — WaitlistCard fully visible at 390×844 with sticky nav present)

### Issue 7: Footer link group titles are SaaS-generic ("For users" / "For businesses" / "Legal")

- **Screen:** / (footer)
- **Dimension:** copy clarity
- **Severity:** NIT
- **Where:** `marketing-footer.tsx:53-55`
- **Observation:** The labels are accurate but feel templated against the surrounding editorial voice ("Roots & Reach", "Operated by Nisarga Group LLC ✦"). The brand has more character than the footer chrome shows.
- **Fix proposals:**
  - **Verb-led:** `Browse` / `Get listed` / `About`
  - **Persona-led (more on-brand):** `If you're here to find` / `If you're here to be found` / `About`
  - **Keep current** — accurate, just neutral.
- **Recommendation:** verb-led pass (`Browse` / `Get listed` / `About`). Drops the SaaS register without overcommitting to a long persona-led label.
- **Status:** ✓ fixed (commit `549ece7`, after: `assets/07-footer-desktop-after.png` — columns read `BROWSE / GET LISTED / ABOUT`)

### Issue 8 (INFO, not a bug): Next.js dev `N` indicator overlaps content in mobile screenshots

- **Screen:** / (mobile, anywhere — overlaps phone-showcase bullets, business-panel perks)
- **Why this is fine:** Dev-only affordance. `next build` removes it. Already documented in QA run `2026-05-25-1120`.
- **Status:** documented, no action

---

## Summary

**8 findings · 0 critical · 1 high · 2 medium · 2 low · 2 nit · 1 info-only**

**Resolution:** 6 fixed (Issues 1, 2, 3, 4, 6, 7) · 1 deferred + documented (Issue 5) · 1 info-only (Issue 8).

Commits: `748e631`, `c089bd1`, `1b443c5`, `c2d06ae`, `549ece7`, `02644d8`.

- **Issue 1** is a real bug — a broken anchor link. Must fix.
- **Issues 2 + 4** are the design-system discipline + DRY pass — one logical commit cleans both.
- **Issue 3** is copy polish; high visibility (footer is on every page) low risk.
- **Issue 6** is a one-character mobile UX win (`vh` → `svh`) that fixes iOS Safari clipping.
- **Issue 7** is taste. Worth doing while we're here.
- **Issue 5** I recommend documenting + deferring (same pattern as the existing AA-Large exemptions).
- **Issue 8** is dev-only chrome; ignore.

## Permanent test suggestions (future work, not this run)

- Lint rule or unit test: assert every `href` in `marketing-nav.tsx` + `marketing-footer.tsx` that starts with `#` has a matching `id="..."` somewhere in the page tree. Catches Issue 1 mechanically.
- Codemod or grep-CI: flag any `[color:oklch(...)]` or `[color:var(--...)]` arbitrary-value Tailwind class with a suggestion to use the registered color utility instead.
