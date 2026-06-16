# UX audit — 2026-06-15 14:00

**Scope:** `/listings/health-wellness/biz-009` (BusinessDetail page)
**Env:** https://9530c32d-ab5f-4ec0-a51f-9153843d1428-00-4yx7b0ti55e3.kirk.replit.dev
**Status:** issues_found
**Reviewer:** /mlabs-ux-audit

## Screens

| Screen | Desktop | Mobile |
|---|---|---|
| /listings/health-wellness/biz-009 | assets/listing-desktop.png | assets/listing-mobile.png |

---

## Issues

### Issue 1: Content column too narrow on desktop
- **Screen:** desktop
- **Dimension:** responsive
- **Severity:** high
- **Where:** `apps/web/src/app/(app)/listings/[category]/[id]/page.tsx:39`
- **Observation:** Content is capped at `max-w-3xl` (768px). On a 1440px viewport with 280px sidebar, this leaves ~196px of empty cream on each side of the cards. The page feels like a mobile layout dropped onto a wide screen.
- **Fix:** Bump to `max-w-4xl` (896px). Gives each card noticeably more breathing room without going so wide the text line-length becomes unreadable.
- **Status:** ✓ fixed (commit ee933c0, after: assets/listing-desktop-after.png)

### Issue 2: Hero image doesn't scale up on desktop
- **Screen:** desktop
- **Dimension:** responsive / hierarchy
- **Severity:** high
- **Where:** `apps/web/src/features/listings/components/business-detail.tsx:38`
- **Observation:** Hero is fixed at `h-72` (288px) at all breakpoints. On desktop at 896px wide, this gives a very wide-and-short banner that feels like a letterbox slit. The image needs more vertical presence on larger screens.
- **Fix:** Add `md:h-96` (384px) so the hero expands on desktop — same pattern used in most listing platforms (Airbnb, Yelp, Google Maps all taller-hero on wide viewports).
- **Status:** ✓ fixed (commit ee933c0, after: assets/listing-desktop-after.png)

### Issue 3: Business name doesn't scale for desktop
- **Screen:** desktop
- **Dimension:** typography / hierarchy
- **Severity:** medium
- **Where:** `apps/web/src/features/listings/components/business-detail.tsx:52`
- **Observation:** Business name is `text-2xl` at all breakpoints. On desktop that reads as a modest label rather than a confident heading. With the Cormorant Garamond display font, larger sizes look especially strong.
- **Fix:** Add `md:text-3xl` so the name scales up on desktop.
- **Status:** ✓ fixed (commit ee933c0)

### Issue 4: Social icon circles too small on desktop
- **Screen:** desktop
- **Dimension:** responsive / spacing
- **Severity:** low
- **Where:** `apps/web/src/features/listings/components/social-icons.tsx:19`
- **Observation:** Icons are `size-8` (32px) circles at all breakpoints. On desktop with more space, 32px circles feel small and hard to target accurately. AIRA's design system calls for ≥44px tap targets; the icons are below that.
- **Fix:** Add `md:size-10` (40px) to the icon base class so they scale up slightly on desktop. Still under the 44px target but closer and more visually balanced.
- **Status:** ✓ fixed (commit ee933c0)

### Issue 5: Two-column desktop layout missing (structural)
- **Screen:** desktop
- **Dimension:** responsive / flow
- **Severity:** high
- **Where:** `apps/web/src/app/(app)/listings/[category]/[id]/page.tsx` + `business-detail.tsx`
- **Observation:** The entire page is one narrow column at all breakpoints. On a 1440px viewport (post-sidebar: ~1160px) this wastes a massive amount of horizontal real estate. Industry standard (Google Maps, Yelp, Airbnb) splits listing detail into: LEFT col (hero + gallery + about) | RIGHT col (identity card with name/rating/socials + contact + CTA). This fundamentally changes how rich and trustworthy the page feels on desktop.
- **Fix:** Requires layout restructure — beyond a style tweak. **Defer to `/mlabs-plan`.**
- **Status:** ⊘ deferred (structural — needs /mlabs-plan)

### Issue 6: Verified badge size inconsistency with name at desktop scale
- **Screen:** desktop
- **Dimension:** hierarchy / spacing
- **Severity:** low
- **Where:** `apps/web/src/features/listings/components/business-detail.tsx:55`
- **Observation:** Badge is `size-5` fixed. At `md:text-3xl` name (Issue 3 fix), a `size-5` badge will look slightly undersized relative to the heading. Should scale with the name.
- **Fix:** Add `md:size-6` alongside the name size bump.
- **Status:** ✓ fixed (commit ee933c0)

---

## Summary

6 total · 0 critical · 3 high · 1 medium · 2 low

**Immediately fixable (5 issues):** max-w bump, hero height scaling, name scaling, badge scaling, icon size — all single-line Tailwind class additions in 2 files.

**Structural (1 issue — Issue 5):** Two-column desktop layout is the biggest visual upgrade available but requires a layout plan, not a style fix. Recommend `/mlabs-plan` as the next step after this audit.
