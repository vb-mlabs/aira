# Mockup brief — AIRA marketing landing page

**Date:** 2026-05-25
**Status:** Phase 4 (feedback gate) pending after generation
**Target file (post-implementation):** `apps/web/src/app/page.tsx` + components under `apps/web/src/components/marketing/`

## Feature

Full revamp of the marketing landing page. The existing page is the MLabs template default — generic SaaS structure (`Hero → WhyMstack → ProductMock → LogoStrip → FeatureGrid → Testimonial → CtaBand`) with copy still pitching the *template's* features. Need an AIRA-specific page that reflects what we're actually building.

## Users

Two audiences, one page:

- **End users (60% of attention)** — Atlanta-area Indian community looking for trusted local businesses. Persona spread per PRD: tech-savvy professional (Priya), low-tech older user (Anita), grad student (Sanjay). Primary action: capture their email so we can notify them when the app launches.
- **Business owners (40% of attention)** — Atlanta Indian-community business owners (restaurant, professional services, etc) looking for a curated audience. Persona: Arjun (PRD). Primary action: get in touch about being listed when the platform launches.

## Positioning lock

| Decision | Value | Why |
|---|---|---|
| Launch status | Pre-launch, waitlist | App is not in stores yet (~15 weeks per roadmap). No App Store/Google Play badges — would be a false claim. |
| Audience priority | 60/40 end users | Chicken-and-egg — we need an audience before businesses pay for listings. |
| Visual direction | Hybrid Magazine + App-led | Editorial hero (Cormorant headline, paper texture, tree-of-life at scale, whitespace) + below-the-fold pivot to app mockups, categories grid, business CTA. |
| Imagery | App screen PNGs + logo only | No human photography. Files in `attached_assets/`. |

## Variant axis

**Hierarchy + density.** All three variants use the same design system tokens, the same copy palette, the same imagery. They differ on:

- How much vertical real estate the editorial hero gets (full-viewport, generous, minimal-but-bold).
- Where the email signup lives (inline in hero / mid-page conversion moment / hidden in footer).
- Whether phone mockups appear and how prominently.

The point of v3 is *contrast*, not candidacy — it shows what "all brand, zero conversion focus" would look like, so v1 and v2 can be evaluated against a clear anchor.

## What's in the design system that this mockup must respect

- Cream paper background (`#EAE0CB`) with SVG paper-grain texture (`--texture-paper`)
- Olive primary `#4F653B`, brand cream `#F3EBDD` for text on dark, brass gold `#B8904A` for ornamental accents
- Tier system: green / burnt orange / chocolate brown for category hierarchy
- Cormorant Garamond Bold for headings + wordmark; Lato for body + UI
- Radius base 14px; pills (9999px) for buttons; 24px for drawer-style corners
- Drop shadows: `--shadow-primary-glow`, `--shadow-card`

## What we are NOT showing

- App Store / Google Play badges — false claim, pre-launch
- Fake metrics ("500+ businesses!") — we have zero
- Stock photos of people — would feel generic
- Membership pricing — admin-configurable, still being finalized per roadmap
- Testimonials from real users — we don't have any yet
