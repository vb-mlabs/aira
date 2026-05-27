# Plan: End-User App Shell — Home, Listings, Account

**Date:** 2026-05-26
**Slug:** end-user-app-shell
**Status:** implemented
**Author:** mlabs-plan

---

## Problem

After sign-in, end users (both community members looking for trusted businesses
and business owners checking their listing) land on `/messages` — a placeholder
with no directory content. There is no home screen, no way to browse business
listings, and no clear navigation. The app has no product surface for the
`end_user` role.

Success looks like: a signed-in user lands on `/home`, sees a category grid and
featured businesses, taps into a category to browse listings, and can tap a
listing to see the detail. My Account is accessible from the nav and reuses the
existing `/profile` page.

---

## Scope

**In:**
- `/home` — category grid (7 hardcoded categories) + featured/sponsored
  businesses section (tier1 → tier2 ordering)
- `/listings/[category]` — all businesses in a category, sorted tier1 → tier2
  → tier3
- `/listings/[category]/[id]` — business detail: name, description, phone,
  website, address, verified badge, tier indicator, back navigation
- `/account` → redirect to existing `/profile` (no rebuild)
- `(app)/layout.tsx` nav updated: Home · Browse · Messages · Account · Sign out
- Post-login redirect changed from `/messages` → `/home`
- `businesses` DB table + Drizzle migration
- `features/listings/` feature module (server queries + UI components)
- Mobile-responsive at 375px+ (mobile-first, top nav collapses gracefully)
- Incremental ship: home first, listings screens second

**Out (deferred):**
- Search / keyword filtering within listings
- Saved / favourites
- Ratings and reviews
- Business owner self-serve listing management (admin manages listings)
- Bottom tab nav (flagged as Phase 2 mobile enhancement)
- Map / location-based proximity sorting
- Pagination (list all within category for now; add if volume demands)

---

## Approach

**Option A — flat route structure + updated top nav** (chosen).

### Routing

`(app)/home/page.tsx` → `/home`. Since the `(app)` route group doesn't add a
URL segment, this is the correct place for the authenticated home without
conflicting with `app/page.tsx` (marketing). Post-login redirect in
`apps/web/src/app/(auth)/login/page.tsx:46` changes `router.push("/messages")`
→ `router.push("/home")`.

`/account` is a simple redirect (Next.js `redirect("/profile")`) so the nav
can link to `/account` without rebuilding the existing profile page. Avoids
duplication per the constraint.

### Nav shell

`(app)/layout.tsx` updated with links: **Home** (`/home`) · **Browse**
(`/listings`) · **Messages** (`/messages`) · **Account** (`/account`) · Sign
out. Logo links to `/home` (not `/`) for authenticated users. `NotificationBell`
stays in the right cluster.

### Data

New `businesses` table. Categories are hardcoded as a TypeScript const (same 7
from the marketing page) — no `categories` table needed at MVP. Businesses
reference the category by slug string. Tier system aligns with the design token
trio (`tier1`/`tier2`/`tier3`) already in `globals.css` and `design.ts`.

### Feature module

`src/features/listings/` follows the existing `src/features/admin/` and
`src/features/profile/` pattern:
- `server/queries.ts` — Drizzle queries, `import "server-only"`
- `components/` — CategoryGrid, BusinessCard, BusinessDetail, EmptyState

Home page (`/home`) is a Server Component that fetches featured businesses
(tier1 + tier2, limit 6) and renders CategoryGrid + FeaturedSection.
Category page fetches all businesses in the category sorted by tier. Detail
page fetches by ID, calls `notFound()` on miss.

### Alternatives considered

- **Option B (bottom tab nav)** — rejected for this plan because it requires
  a significant restructure of `(app)/layout.tsx` and is a bigger UX shift
  than warranted for the first end-user shell. Flagged as Phase 2.
- **Hardcode businesses as static data** — rejected because admin needs to be
  able to add/edit listings via Drizzle Studio or future admin UI. DB-backed
  from day one.

---

## Data model changes

New table: `businesses`

```
id           text  PRIMARY KEY  default gen_random_uuid()
name         text  NOT NULL
slug         text  NOT NULL  UNIQUE
category     text  NOT NULL   -- 'restaurants' | 'education' | 'events-entertainment'
                              -- | 'professional-services' | 'health-wellness'
                              -- | 'real-estate' | 'shopping'
description  text
phone        text
website      text
address      text
image_url    text
tier         text  NOT NULL  DEFAULT 'tier3'  -- 'tier1' | 'tier2' | 'tier3'
verified     bool  NOT NULL  DEFAULT false
created_at   timestamp NOT NULL DEFAULT now()
updated_at   timestamp NOT NULL DEFAULT now()
```

Migration: `pnpm db:generate` after schema file added, `pnpm db:migrate` to
apply.

No changes to `user` table or auth schema.

---

## Files to touch

**New:**
- `packages/db/src/schema/businesses.ts` — Drizzle table definition
- `apps/web/src/features/listings/server/queries.ts` — getFeaturedBusinesses,
  getBusinessesByCategory, getBusinessById
- `apps/web/src/features/listings/components/CategoryGrid.tsx`
- `apps/web/src/features/listings/components/BusinessCard.tsx`
- `apps/web/src/features/listings/components/BusinessDetail.tsx`
- `apps/web/src/features/listings/components/EmptyState.tsx`
- `apps/web/src/features/listings/index.ts` — barrel export
- `apps/web/src/app/(app)/home/page.tsx`
- `apps/web/src/app/(app)/listings/page.tsx` — category overview or redirect
  to first category
- `apps/web/src/app/(app)/listings/[category]/page.tsx`
- `apps/web/src/app/(app)/listings/[category]/[id]/page.tsx`
- `apps/web/src/app/(app)/account/page.tsx` — thin redirect to `/profile`
- Migration file (auto-generated by `pnpm db:generate`)

**Edit:**
- `packages/db/src/schema/index.ts` — export new businesses table
- `apps/web/src/app/(app)/layout.tsx` — update nav links
- `apps/web/src/app/(auth)/login/page.tsx` — change redirect target to `/home`

---

## Edge cases

- **Empty category** — category page shows `EmptyState` component ("No listings
  in this category yet. Check back soon.") instead of an empty list.
- **No featured businesses yet** — home page gracefully omits the featured
  section rather than rendering an empty block. Category grid always renders.
- **Invalid category slug** — `[category]` page calls `notFound()` if the slug
  isn't in the hardcoded categories list.
- **Non-existent business ID** — `[id]` page calls `notFound()`.
- **User lands on `/account`** — redirect fires server-side via Next.js
  `redirect("/profile")`, no flash.
- **Admin visiting `/home`** — `requireUser()` passes (admin is a user);
  home renders normally. Admin nav is separate at `/admin/*`.
- **Mobile nav overflow** — at narrow viewports, the right-side nav items
  (Home · Browse · Messages · Account) may not all fit. Plan: condense to
  icons-only on < sm, or hide Messages from top nav (accessible via
  notifications). Reviewer to decide.

---

## Acceptance criteria

- [ ] POST-login redirects to `/home` (not `/messages`)
- [ ] `/home` renders 7 category tiles with tier-matched colours from design
  tokens
- [ ] `/home` featured section shows tier1 businesses first, then tier2, max 6
  cards; section is hidden when no businesses exist
- [ ] `/listings/[category]` renders all businesses in that category sorted
  tier1 → tier2 → tier3
- [ ] `/listings/[category]` shows `EmptyState` when no businesses in category
- [ ] `/listings/[category]/[id]` renders business name, description, phone,
  website, address, verified badge, tier indicator
- [ ] `/listings/[category]/[id]` returns 404 for unknown ID
- [ ] `/account` silently redirects to `/profile`
- [ ] `(app)/layout.tsx` nav contains: Home, Browse, Messages, Account, Sign
  out (+ NotificationBell)
- [ ] All screens are functional and not broken at 375px viewport width
- [ ] `businesses` DB table migration applies cleanly via `pnpm db:migrate`
- [ ] Drizzle Studio can be used to seed test businesses
- [ ] TypeScript strict-mode passes (`pnpm typecheck`)

---

## Open questions

1. **`/listings` root** — should it show a category overview page (grid of all
   7 categories, same as home but without featured) or redirect to the first
   category? A category overview avoids a dead route but duplicates the home
   grid.
2. **Mobile nav at narrow widths** — icons-only, or hide Browse/Messages and
   rely on the home category grid as the entry point? Reviewer to decide before
   implementation.
3. **Business image** — `image_url` stored as text; served from where? Replit
   Object Storage (already wired) or just allow external URLs for MVP?
4. **Slug generation** — auto-derive from name on insert (e.g.
   `"South Indian Kitchen"` → `"south-indian-kitchen"`) or admin-supplied?
5. **`updated_at` trigger** — maintain via Drizzle's `$onUpdate` or a Postgres
   trigger? Existing schema uses neither pattern; reviewer to align.
