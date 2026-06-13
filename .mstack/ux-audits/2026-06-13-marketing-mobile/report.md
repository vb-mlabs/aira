# UX audit — 2026-06-13 marketing landing (mobile focus)

**Scope:** `/` (marketing landing) — Hero, About-Editorial, Phone Showcase, Business Panel
**Env:** http://localhost:5000 (dev)
**Status:** fixed (all 4 issues addressed, awaiting commit)
**Reviewer:** /mlabs-ux-audit
**Viewports:** mobile 390×844 (primary), desktop 1440×900 (sanity)

## Screens captured

| Section | Mobile | Desktop |
|---|---|---|
| Full page | `assets/marketing-mobile-full.png` | `assets/marketing-desktop-full.png` |
| Hero | `assets/marketing-mobile-section-hero.png` | `assets/marketing-desktop-section-hero.png` |
| About / Why we built this | `assets/marketing-mobile-section-about.png` | `assets/marketing-desktop-section-about.png` |
| Phone Showcase | `assets/marketing-mobile-section-phone-showcase.png` | `assets/marketing-desktop-section-phone-showcase.png` |
| Business Panel | `assets/marketing-mobile-section-business-panel.png` | `assets/marketing-desktop-section-business-panel.png` |

Computed styles snapshot: `assets/computed-mobile.json`, `assets/computed-desktop.json`.

## Verdict

Marketing page is **structurally aligned** on mobile — no horizontal scroll, no
overflow, no broken layout. All sections center properly, textures render, the
sticky nav sits cleanly. The recent hero/about/phone/business-panel polish
landed.

There are **4 issues** worth fixing before sign-off, all mobile-specific.

## Issues

### Issue 1: Hero headline too modest on mobile (26px reads as body, not a hero)
- **Severity:** high
- **Screen:** `/` hero
- **Dimension:** typography / hierarchy
- **Where:** `apps/web/src/components/marketing/hero.tsx:23`
- **Observation:** Last edit set the headline to `text-[26px]` at mobile.
  Above-the-fold hero copy at 390px viewport now reads at ~26px / 30px line —
  visually it sits between body text (18px) and the WaitlistCard's input label
  (16px). The "anchored / easier to absorb" goal landed, but it overshot —
  the headline no longer carries the section. Compare: "Roots & Reach"
  italic above is 20px — only 6px smaller than the headline.
- **Fix:** bump mobile to `text-[30px]` (keep desktop `clamp(28px,3.6vw,44px)`
  unchanged — desktop reads great). 30px still feels editorial and "intentional
  smaller" without ceding the hero to the WaitlistCard. Suggested diff:
  ```
  - text-[26px] font-semibold leading-[1.15] tracking-tight
  + text-[30px] font-semibold leading-[1.2] tracking-tight
  ```
- **Status:** ✓ fixed (uncommitted)

### Issue 2: Sticky nav hides section headers when jumping via anchor link
- **Severity:** medium
- **Screen:** `/` (about, phone-showcase, business-panel)
- **Dimension:** flow / responsive
- **Where:** `apps/web/src/app/page.tsx:46-48`; affects `#about`, `#businesses`
- **Observation:** `MarketingNav` is sticky/fixed and ~64–80px tall. Sections
  with `id` (`#about`, `#businesses`) don't have `scroll-margin-top`, so any
  in-page anchor (or page-load with hash) lands with the eyebrow + ornament
  hidden under the nav. Visible in the section-screenshot artifacts where
  the nav overlays the top of `#about` and `#businesses`.
- **Fix:** add `scroll-mt-20` (80px) to the two sections that have `id`s.
  Pure CSS, zero JS, fixes both anchor-click and hash-on-load.
- **Status:** ✓ fixed (uncommitted)

### Issue 3: "FOR BUSINESS OWNERS" eyebrow blends into olive paper bg
- **Severity:** medium
- **Screen:** `/` business panel
- **Dimension:** contrast / hierarchy
- **Where:** `apps/web/src/components/marketing/business-panel.tsx:42`
- **Observation:** Eyebrow uses `text-brand-gold` (#B8904A) on the olive paper
  texture (~#4F653B). Calculated contrast is ~3.0–3.2:1 — passes WCAG AA Large
  at 15px bold but barely. Visually the eyebrow recedes into the bg rather than
  acting as a stamp/anchor — opposite of what we just achieved in the
  about-editorial eyebrow (deep-brown ink on ochre, ~10:1).
- **Fix:** swap eyebrow color from `text-brand-gold` → `text-brand-cream-bright`
  (#F3EBDD). Cream-on-olive is ~8:1 — same hierarchy, far more legible, and
  matches the headline/perks colorway in this section.
- **Status:** ✓ fixed (uncommitted)

### Issue 4: Phone-showcase phones cropped at top by sticky nav on mobile only
- **Severity:** low
- **Screen:** `/` phone showcase
- **Dimension:** responsive
- **Where:** `apps/web/src/components/marketing/phone-showcase.tsx:17`
- **Observation:** On mobile the phones-container is `h-[510px]` and sits at
  the top of the section. When the user scrolls naturally, the phones'
  status bars get clipped under the sticky nav for a moment as the section
  enters. Not broken, but a small "this section feels too tight" tell. On
  desktop the side-by-side layout makes this a non-issue.
- **Fix (optional):** add `pt-6` to the section on mobile (`pt-[40px]` already
  exists; bump to `pt-[64px]` on mobile only). Small tweak, low priority.
- **Status:** ✓ fixed (uncommitted)

## After-screenshots

| Section | After |
|---|---|
| Full page | `assets/marketing-mobile-full-after.png` |
| Hero | `assets/marketing-mobile-section-hero-after.png` |
| About | `assets/marketing-mobile-section-about-after.png` |
| Phone Showcase | `assets/marketing-mobile-section-phone-showcase-after.png` |
| Business Panel | `assets/marketing-mobile-section-business-panel-after.png` |

**Anchor-scroll verification:** after the `scroll-mt-20` fix, navigating to
`/#about` and `/#businesses` lands the section ~79.5px from the viewport top
— clears the ~64px sticky nav with breathing room. Confirmed via Playwright.

## Non-issues / positive notes

- **Hero — logo + Roots & Reach + WaitlistCard alignment** lands well on mobile.
  Logo 180px feels anchored, "Roots & Reach" sits 20px below it, breathing
  room between sections is right.
- **About-editorial** eyebrow (deep brown ink on ochre) reads beautifully.
  Drop-cap "M" renders correctly at mobile size. Headline wraps over 3 lines
  with intentional breaks.
- **Business-panel body copy** at 21px font-medium on bright cream reads
  strong — the requested "feel stronger" landed.
- **Phone-showcase WhatsApp removal** ✓ — copy now says "Call or open
  directions" and the third bullet says "Save listings, call, and get
  directions in one tap".
- **No horizontal scroll on mobile** at 390px.
- **Console**: no errors recorded during reload at either viewport.

## Summary
4 total · 0 critical · 1 high · 2 medium · 1 low

Recommended fix batch: Issues 1 + 2 + 3 in one commit (all small, all visual,
all on-brand). Issue 4 can defer.
