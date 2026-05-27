# QA report — 2026-05-27 13:28

**Focus:** End-user app shell — sign in → /home → sidebar → category → business detail → account → sign out (desktop 1280px + mobile 375px)
**Env:** localhost:5000
**Status:** clean
**Tester:** /mlabs-qa

## Seed state
- 12 businesses inserted: 6 tier1 · 4 tier2 · 2 tier3 across all 7 categories
- QA test user: qa-tester@mlabs.test (verified, created by qa-global-setup.ts)

## Scenarios run

| # | Scenario | Result |
|---|----------|--------|
| 1 | Unauthenticated /home redirects to /login | ✓ pass |
| 2 | Login with valid credentials → redirects to /home | ✓ pass |
| 3 | /home: brand wordmark (AIRA) + tagline (ROOTS · REACH) | ✓ pass |
| 4 | /home: Featured Businesses section visible with seeded data | ✓ pass |
| 5 | /home: View All → links to /categories | ✓ pass |
| 6 | Desktop sidebar: visible + brand + all category nav links | ✓ pass |
| 7 | Desktop sidebar: Home row marked aria-current=page on /home | ✓ pass |
| 8 | Desktop sidebar: clicking category navigates to /listings/[category] | ✓ pass |
| 9 | Mobile (375px): top bar shows AIRA wordmark + hamburger button | ✓ pass |
| 10 | Mobile: bottom tab bar Home/Categories/Account | ✓ pass |
| 11 | Mobile: Home tab aria-current=page on /home | ✓ pass |
| 12 | Mobile: Categories tab aria-current=page on /categories | ✓ pass |
| 13 | Mobile: Categories tab aria-current=page on /listings/* | ✓ pass |
| 14 | Mobile: hamburger opens drawer; ESC closes it | ✓ pass |
| 15 | /categories: all 7 categories listed | ✓ pass |
| 16 | /categories: restaurant row shows count "3" | ✓ pass |
| 17 | /listings/restaurants: all seeded businesses shown | ✓ pass |
| 18 | /listings/restaurants: tier1 (Spice Garden) listed first | ✓ pass |
| 19 | /listings/not-a-real-category: returns HTTP 404 | ✓ pass |
| 20 | /listings/restaurants/biz-001: detail fields + TIER 1 badge + verified icon | ✓ pass |
| 21 | /listings/restaurants/no-such-business: returns HTTP 404 | ✓ pass |
| 22 | /listings/restaurants/biz-001: back navigation link present | ✓ pass |
| 23 | /account: renders profile hub with user email + Sign out button | ✓ pass |
| 24 | /account: Edit profile → links to /profile | ✓ pass |
| 25 | Sign out: redirects to /login | ✓ pass |
| — | Empty category EmptyState | ⊘ skipped — all categories had data |

## Issues

None. All 25 active scenarios passed. No console errors, no network failures, no visual regressions observed.

## Screenshots

- `assets/home-desktop.png` — Desktop 1280px: green-textured sidebar + branding + Featured Businesses
- `assets/home-mobile.png` — Mobile 375px: hamburger top bar + stat cards + Featured Businesses + bottom tab bar
- `assets/categories-mobile.png` — /categories with live counts (Restaurants 3, Education 2, Events 2, Professional Services 1, Health 1, Real Estate 1, Shopping 2)
- `assets/business-detail-mobile.png` — Spice Garden: TIER 1 pill, verified badge, phone, website, address, CTA buttons
- `assets/account-mobile.png` — Account hub: avatar, name, email, Account/Support groups, Sign out, legal footer

## Infrastructure learnings

- `getByLabel("Email")` fails to fill React controlled inputs when called immediately after `waitUntil: "domcontentloaded"` — React hydration resets the value. Use `waitUntil: "networkidle"` for login form interactions.
- `getByRole("button", { name: /open/i })` matches both the hamburger (`aria-label="Open menu"`) and the Next.js Dev Tools button (`aria-label="Open Next.js Dev Tools"`). Always scope to `getByRole("banner")` or use exact match.
- Desktop sidebar, mobile header, and desktop utility bar all render `<header>` elements — `locator("header")` always needs a scope or explicit role (e.g., `getByRole("banner")`) in this app shell.

## Summary

25 pass · 0 fail · 1 skip · 0 issues

The end-user app shell is working correctly across all tested flows and viewports. Green-textured sidebar renders on desktop; hamburger + drawer + bottom-tab nav work on mobile; tier-sorted listings, verified badges, 404 guards, and the account hub all behave as specified.

**Recommended next step:** Seed real business data via Drizzle Studio (`pnpm db:studio`) and verify the visual states before the first user-facing release.
