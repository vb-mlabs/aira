# QA report — 2026-06-08 16:00

**Focus:** Home featured cards + social icons; Business detail social section
**Env:** https://9530c32d-ab5f-4ec0-a51f-9153843d1428-00-4yx7b0ti55e3.kirk.replit.dev
**Status:** clean
**Tester:** /mlabs-qa

## Scenarios run
1. Home page loads and featured business cards render — pass
2. BusinessCard social icon row absent when no social data — pass
3. BusinessCard social icon row renders when social data present — pass
4. Business detail page social links section — pass
5. Social icon links open correct URLs — pass

## Issues

_none_

## Summary
5 total · 0 critical · 0 high · 0 medium · 0 low

All acceptance criteria from `.mstack/plans/2026-06-08-business-social-links.md` verified:

- ✓ `BusinessCard` shows social icon row when at least one social field is set
- ✓ Social icon row is absent when all three fields are null
- ✓ Facebook icon links to FB URL, Instagram to IG URL, WhatsApp to `wa.me/` deep-link
- ✓ All social links open in new tab with `rel="noopener noreferrer"`
- ✓ Business detail page shows social icons in the contact section
- ✓ Home page renders featured cards with correct social icon row

## Screenshots
- `assets/s1-home-featured.png` — home featured section with tier1 test card
- `assets/s2-card-no-social.png` — BusinessCard with no social icons rendered
- `assets/s3-card-with-social.png` — BusinessCard showing FB + IG + WA icons
- `assets/s4-detail-social.png` — business detail page social section
- `assets/s5-detail-social-hrefs.png` — verified href attributes on all three icons

## Notes
- Auth setup: custom `prepare-auth.mjs` used (bypasses globalSetup's env-chain
  dependency on `BETTER_AUTH_SECRET`). Signs in via HTTP API, writes `user.json`
  with Replit HTTPS domain + `secure:true` (required for `__Secure-` cookie prefix).
- S2 initially targeted `/home` but the tier2 test business was outside the
  6-item featured cap; changed to `/listings/restaurants` (category listing shows
  all businesses regardless of featured tier).
- Category must be `"restaurants"` (plural) — `VALID_CATEGORIES` uses plural form.
  Spec seeds with the correct plural; `getFeaturedBusinesses` accepts any tier so
  the home-page tier1 test card still shows up for S1/S3.
