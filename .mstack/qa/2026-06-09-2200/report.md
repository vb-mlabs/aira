# QA report — 2026-06-09 22:00

**Focus:** Full smoke pass — S3 features + S2 regressions
**Env:** https://9530c32d-ab5f-4ec0-a51f-9153843d1428-00-4yx7b0ti55e3.kirk.replit.dev
**Status:** clean
**Tester:** /mlabs-qa

## Scenarios run
1. Homepage loads, stat counts render — ✓ pass
2. Public listings page — category sidebar + listing cards — ✓ pass
3. Public business detail page — hero, contact info — ✓ pass
4. Auth gate: unauthenticated redirects to /login — ✓ pass
5. Admin business list loads — ✓ pass
6. Admin business edit — gallery section + drop zone — ✓ pass
7. Admin business edit — multi-category checkboxes render + toggle — ✓ pass
8. Admin business edit — categories save via PATCH + "Saved." feedback — ✓ pass
9. Multi-category — business appears in second category listing — ✓ pass (after fix)
10. Public detail page — no carousel when images = 0 — ✓ pass
11. Admin categories CMS page loads — ✓ pass
12. Admin settings homepage page loads — ✓ pass
13. Unauthenticated /home redirects to /login — ✓ pass

## Issues

### Issue 1: ListingView crashes for DB-defined categories not in CATEGORY_META
- **Severity:** high
- **Repro:**
  1. Create a category in the DB that is NOT in the 7 hardcoded CATEGORY_META slugs
  2. Assign a business to that category as an extra category
  3. Navigate to `/listings/<that-category-slug>`
- **Expected:** Listing page renders with business cards
- **Actual:** Next.js error page (`__next_error__`) — `Cannot read properties of undefined (reading 'displayName')`
- **Screenshot:** assets/s3-multi-category-listing.png (after fix)
- **Console errors:** `Cannot read properties of undefined (reading 'displayName')`
- **Suspected cause:** `listing-view.tsx:122` — `CATEGORY_META[currentCategory].displayName` accesses without optional chaining; `currentCategory` is `Record<BusinessCategory, CategoryMeta>` typed as `string`, so TypeScript doesn't catch missing keys
- **Fix plan:** Add optional chaining + fallback: `CATEGORY_META[currentCategory as keyof typeof CATEGORY_META]?.displayName ?? currentCategory`
- **Status:** ✓ fixed (commit e22f9d7)

## Summary
1 total · 0 critical · 1 high · 0 medium · 0 low

**All 17 tests pass (13 authed + 4 public) after the fix.**

## Test run details

### Public (4/4)
- `/home` redirects to `/login` when unauthenticated ✓
- `/listings/restaurants` redirects to `/login` when unauthenticated ✓
- `/admin/businesses` redirects to `/login` when unauthenticated ✓
- Login page renders correctly ✓

### Authed (13/13)
- S1: Admin business list loads ✓
- S2: Admin business edit — Gallery + Categories headings + address input ✓
- S3: Gallery section shows drop zone when no images ✓
- S4: Extra categories checkboxes render and are toggleable ✓
- S5: Categories PATCH succeeds, shows "Saved." ✓
- S6: Business appears in second category listing (Education) ✓
- S7: No carousel on public detail page when images = 0 ✓
- S8: Admin categories page loads ✓
- S9: Admin settings homepage page loads ✓
- Homepage loads + stat counts visible ✓
- Restaurants listing renders business cards ✓
- Business detail (Spice Garden) loads without login redirect ✓
- Unauthenticated /home redirects to /login ✓

## Notes on test infrastructure
- Session `user.json` storageState must be regenerated when the Better Auth session expires (7 days) or after signing out. The session is scoped to the Replit dev domain.
- The `psql` + `execSync` pattern (not `@neondatabase/serverless`) is required in QA spec files — the serverless driver's WebSocket connection mode doesn't work reliably with the local Postgres instance. Pattern established in `qa-global-setup.ts`.
- `beforeAll` in s3-features must bump `last_activity_at` via `psql` to keep the admin session fresh during the run.
