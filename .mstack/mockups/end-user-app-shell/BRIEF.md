# Mockup Brief — End-User App Shell

**Feature/screen:** Home, Listings (category browse), Business Detail, and Nav shell for authenticated end-users  
**Generated from review:** `.mstack/reviews/2026-05-26-end-user-app-shell.md`  
**Date:** 2026-05-26

## Users
Authenticated community members (Indian-American community in Atlanta area) looking for trusted businesses and services. Primary action: browse a category → scan business cards → tap into a listing for contact details.

## Variant axis
Layout structure — how the category navigation and business listings are spatially arranged.

## Variants

| Variant | Layout concept |
|---|---|
| V1 | Grid-led — large 3-column category tile grid, featured businesses below |
| V2 | Editorial sidebar split — left category sidebar, right content area |
| V3 | List-led — horizontal pill categories, full-width business list immediately below |

## Screens shown in each variant
Each mockup shows all four screens at desktop (1280px) and mobile (375px):
1. `/home` — Home / Dashboard
2. `/listings/[category]` — Category listing page
3. `/listings/[category]/[id]` — Business detail page
4. Nav shell across all screens

## Brand tokens used
- Background: `oklch(0.90 0.04 85)` cream
- Card: `oklch(0.95 0.02 85)`
- Primary (olive): `oklch(0.46 0.07 132)` / `#4F653B`
- Foreground (dark brown): `oklch(0.25 0.04 60)` / `#3D2814`
- Tier1: olive `#4F653B`, Tier2: burnt orange `#C97A2A`, Tier3: chocolate `#7A4A26`
- Info (verified): `#1A7AC7`
- Brand gold: `#B8904A`
- Fonts: Cormorant Garamond (headings), Lato (body)
