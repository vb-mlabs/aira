# Brief — landing 3-tier hero

**Slug:** `landing-hero-3tier`
**Date:** 2026-09-22
**Invocation:** standalone (not `--from-review`)

## Feature / screen
Marketing landing **hero block only** — the section that sits directly below
`MarketingNav` on `/`. Scope is deliberately narrow: hero only, not the full
page. Sections below the hero (`AboutEditorial`, `PhoneShowcase`,
`BusinessPanel`, `MarketingFooter`) are unchanged for this exploration.

## Users
Two audiences reach the landing page simultaneously; the hero has to
address both without collapsing either:
- **Community members** — mostly older South Asian residents in
  metro Atlanta. Primary action: **download the app**.
- **South Asian business owners** — small operators evaluating whether
  to list. Primary action: **get listed / view pricing**.

## Reference
`attached_assets/image_1790075464581.png` — a client-supplied composition
showing a 3-column arrangement: For Users (left) · Phone (center) · For
Business Owners (right), with a centered headline "Discover. Support.
Grow." over the phone.

## Header decision
The existing `MarketingNav` (cream sticky bar, tree-of-life logo + wordmark
left, "Get Listed Early" pill right) is treated as fixed. Every variant
renders the same nav markup verbatim above the hero so the mockup reads
in-context, not floating.

## Variant axis
**Mixed** — each variant differs on a different axis, so the winner tells
us both which structure and which posture the landing should adopt.
- **v1 — Hierarchy:** balanced tri-column (closest to the reference)
- **v2 — Density:** airy hero-stacked (less-above-the-fold, two-card row)
- **v3 — Visual style:** editorial magazine spread

## Count
3 variants (default).

## Out of scope
- Below-hero sections (About, PhoneShowcase, BusinessPanel, Footer)
- Header re-work
- Actual QR codes (rendered as decorative placeholders in every variant —
  real ones plug in at code phase)
- Real phone mockup image variants — every variant uses the existing
  `/marketing-images/home-screen.png` asset

## Next
After feedback, run `/mlabs-plan` with the winning variant as reference —
the plan should replace the current `Hero` component in
`apps/web/src/components/marketing/hero.tsx`.
