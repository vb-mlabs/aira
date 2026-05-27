# Review: End-User App Shell — Home, Listings, Account

**Date:** 2026-05-26
**Slug:** end-user-app-shell
**Plan reviewed:** [2026-05-26-end-user-app-shell.md](../plans/2026-05-26-end-user-app-shell.md)
**Status:** approved
**UI-Significant:** yes
**Reviewer:** mlabs-review

---

## Summary

The plan is sound and ready to implement with adjustments. Three blockers were
resolved during review: (1) mobile nav overflow — hamburger drawer on < md
breakpoint; (2) DB tier/category columns stay as `text` with Zod validation
rather than pgEnum; (3) both login AND signup post-auth redirects updated to
`/home`. Two plan simplifications accepted: `/account` redirect page dropped
(nav link text renamed "Account", href stays `/profile`); `/listings` root
renders a category overview grid rather than redirecting.

---

## Findings

### Blockers (resolved during review)

- **Mobile nav overflow.** Adding Home + Browse to the existing 4-item nav
  gives 6 items — overflows at 375px. **Decision:** hamburger icon on < md
  breakpoint opens a slide-out mobile nav drawer. Desktop keeps full text
  links. New file: `(app)/_components/mobile-nav.tsx`.

- **Untyped tier/category columns.** Plan used free-text with comments but no
  enforcement. **Decision:** keep `text` columns; enforce allowed values via
  Zod constants in the query layer (`VALID_TIERS`, `VALID_CATEGORIES` exported
  from `features/listings/server/queries.ts`). Consistent with the project's
  Zod-at-boundaries convention.

- **Signup redirect missing.** Plan only mentioned `login/page.tsx`.
  **Decision:** update both. (Note: after signup, the user sees the verify-email
  screen before any redirect, so the practical impact is login-only — but
  `/home` is the correct destination in both code paths for consistency.)

### Concerns (raised, decided, recorded)

- **Concern:** `/account` page adds an extra redirect hop with no benefit for
  MVP.
  **Decision:** Drop `apps/web/src/app/(app)/account/page.tsx`. Nav link
  text = "Account", `href="/profile"`. Saves one file, no behaviour change.

- **Concern:** `/listings` root — redirect vs overview.
  **Decision:** Render a category overview grid (same 7 tiles, no featured
  section). Avoids dead/confusing routes; Browse has a proper landing page.

- **Concern:** `image_url` source.
  **Decision:** Store URL as `text`. Admin populates via Drizzle Studio for
  MVP using Replit Object Storage URLs. Upload UI deferred.

- **Concern:** Slug generation.
  **Decision:** Admin-supplied at creation, Zod validates kebab-case format
  (`/^[a-z0-9]+(?:-[a-z0-9]+)*$/`). No auto-derive, no collision logic needed.

- **Concern:** `updated_at` maintenance.
  **Decision:** Drizzle `.$onUpdate(() => new Date())` on the column definition.
  Consistent, no raw SQL trigger.

### Suggestions (deferred)

- Bottom tab nav (Phase 2 mobile enhancement) — noted in plan, stays deferred.
- Admin UI for business CRUD — out of scope; Drizzle Studio for seeding.
- Pagination for large categories — deferred until volume demands it.

---

## Decisions locked

1. Mobile nav: hamburger drawer on `< md`, full text links on `≥ md`.
2. `tier` and `category`: `text` columns, Zod-validated in query layer with
   exported constants (`VALID_TIERS`, `VALID_CATEGORIES`).
3. Post-auth redirects: both `login/page.tsx` and `signup/page.tsx` → `/home`.
4. `/account` page: dropped. Nav "Account" link → `/profile`.
5. `/listings` root: category overview grid (no featured section).
6. `image_url`: text column; Replit Object Storage URLs, admin-populated via
   Drizzle Studio for MVP.
7. Business slug: admin-supplied, Zod validates kebab-case.
8. `updated_at`: Drizzle `.$onUpdate(() => new Date())`.

---

## Implementation plan

### Task 1: DB schema — businesses table

- **Files:**
  - `packages/db/src/schema/businesses.ts` (new)
  - `packages/db/src/schema/index.ts` (edit)
- **What:** Define `businesses` Drizzle table. Columns: `id` text PK
  (`$defaultFn(() => crypto.randomUUID())`), `name` text NOT NULL, `slug`
  text NOT NULL unique, `category` text NOT NULL, `description` text,
  `phone` text, `website` text, `address` text, `image_url` text, `tier`
  text NOT NULL default `'tier3'`, `verified` boolean NOT NULL default
  `false`, `created_at` timestamp NOT NULL `$defaultFn(() => new Date())`,
  `updated_at` timestamp NOT NULL `$defaultFn(() => new Date())
  .$onUpdate(() => new Date())`. Export `* from "./businesses"` in schema
  index. Run `pnpm db:generate` to produce the migration file.
- **Acceptance:** Migration SQL file appears in `packages/db/drizzle/`,
  `pnpm typecheck` passes, schema index exports `businesses`.
- **Pause if:** `pnpm db:generate` errors — likely a Drizzle config or import
  path issue; don't guess at the fix.

### Task 2: Apply DB migration

- **Files:** migration file produced in Task 1 (no edits, apply only)
- **What:** Run `pnpm db:migrate` to apply the businesses table migration.
- **Acceptance:** `businesses` table exists in the DB (verifiable via
  `pnpm db:studio`); migration applies without error.
- **Pause if:** Migration fails — may indicate no `DATABASE_URL` configured
  in this environment. Do not skip or work around.

### Task 3: Listings feature — server queries

- **Files:**
  - `apps/web/src/features/listings/server/queries.ts` (new)
  - `apps/web/src/features/listings/index.ts` (new)
- **What:** Add `import "server-only"` at top. Export `VALID_TIERS` and
  `VALID_CATEGORIES` string-literal arrays. Implement three functions:
  `getFeaturedBusinesses()` — tier1 + tier2 rows, limit 6, ordered tier1
  first then tier2; `getBusinessesByCategory(category: string)` — validate
  category against `VALID_CATEGORIES`, return all matching rows ordered tier1
  → tier2 → tier3; `getBusinessById(id: string)` — single row or null.
  All queries use `db` from `@/lib/db` and the `businesses` table from
  `@aira/db/schema`. Barrel-export all three functions from `index.ts`.
- **Acceptance:** Functions are typed, `import "server-only"` present, no
  `process.env` direct access, `pnpm typecheck` passes.

### Task 4: Listings feature — UI components

- **Files:**
  - `apps/web/src/features/listings/components/CategoryGrid.tsx` (new)
  - `apps/web/src/features/listings/components/BusinessCard.tsx` (new)
  - `apps/web/src/features/listings/components/BusinessDetail.tsx` (new)
  - `apps/web/src/features/listings/components/EmptyState.tsx` (new)
  - `apps/web/src/features/listings/index.ts` (edit — add component exports)
- **What:** `CategoryGrid` — renders 7 hardcoded category tiles using
  tier-colour design tokens from `globals.css` (`var(--tier1)` etc); each
  tile links to `/listings/[category-slug]`. `BusinessCard` — name, tier
  indicator pill, verified badge (olive tick); links to
  `/listings/[category]/[id]`. `BusinessDetail` — full fields: name,
  description, phone (tel: link), website (external link), address, verified
  badge, tier indicator, back chevron. `EmptyState` — generic "No listings
  yet" message. All components: no brand string literals (import from
  `@aira/config` if needed), design tokens only, mobile-responsive.
- **Acceptance:** Components render without runtime errors, use
  `var(--tier1/2/3)` tokens for colour, no hardcoded "#hexes" or brand
  strings, `pnpm typecheck` passes.

### Task 5: App routes — /home

- **Files:** `apps/web/src/app/(app)/home/page.tsx` (new)
- **What:** Server Component. `export const metadata = { title: "Home" }`.
  Calls `getFeaturedBusinesses()`. Renders `CategoryGrid` always. Renders a
  "Featured" section only when the query returns ≥ 1 result (hidden otherwise,
  no empty block). Layout: category grid below page title, featured cards in a
  responsive grid beneath.
- **Acceptance:** `/home` renders at 375px without overflow; featured section
  absent when no businesses; category grid always present; page title "Home"
  in `<head>`.

### Task 6: App routes — /listings

- **Files:**
  - `apps/web/src/app/(app)/listings/page.tsx` (new)
  - `apps/web/src/app/(app)/listings/[category]/page.tsx` (new)
  - `apps/web/src/app/(app)/listings/[category]/[id]/page.tsx` (new)
- **What:**
  - `listings/page.tsx` — Server Component; renders same `CategoryGrid` (no
    featured section). Title: "Browse".
  - `listings/[category]/page.tsx` — validates `params.category` against
    `VALID_CATEGORIES`; calls `notFound()` if invalid. Calls
    `getBusinessesByCategory()`. Renders list of `BusinessCard` components or
    `EmptyState`. Title: category display name.
  - `listings/[category]/[id]/page.tsx` — calls `getBusinessById(params.id)`;
    calls `notFound()` if null. Renders `BusinessDetail`. Back link →
    `/listings/[category]`. Title: business name.
- **Acceptance:** `/listings` renders category grid; invalid category slug →
  404; valid category with no businesses → EmptyState; valid business →
  detail renders; unknown id → 404; back link works; `pnpm typecheck` passes.

### Task 7: Nav shell — desktop + mobile hamburger

- **Files:**
  - `apps/web/src/app/(app)/layout.tsx` (edit)
  - `apps/web/src/app/(app)/_components/mobile-nav.tsx` (new)
- **What:** Update `(app)/layout.tsx` nav links: add **Home** (`/home`), add
  **Browse** (`/listings`), rename "Profile" label → **Account** (href stays
  `/profile`), keep **Messages** and **NotificationBell** and **SignOutButton**.
  Logo `href` changes from `/` → `/home`. On `< md` breakpoint, show a
  hamburger icon button (lucide-react `Menu` icon, already available) that
  opens `MobileNav` — a slide-out drawer listing all nav links. On `≥ md`,
  show the full inline text-link row as now. `MobileNav` is a Client Component
  with local `useState` for open/close.
- **Acceptance:** Desktop nav (≥ md) shows all links inline without overflow;
  mobile (375px) shows hamburger only; tapping hamburger opens drawer with all
  links; all links navigate correctly; `pnpm typecheck` passes.

### Task 8: Post-auth redirects → /home

- **Files:**
  - `apps/web/src/app/(auth)/login/page.tsx` (edit)
  - `apps/web/src/app/(auth)/signup/page.tsx` (edit)
- **What:** In `login/page.tsx` change `router.push("/messages")` →
  `router.push("/home")`. In `signup/page.tsx` find any `router.push` or
  `redirect` that targets `/messages` and update to `/home`. If signup has
  no such redirect (user sees verify-email screen instead), confirm via code
  read and leave a comment noting the intentional no-op.
- **Acceptance:** After successful login, browser lands on `/home`. Signup
  still shows verify-email screen. `pnpm typecheck` passes.

---

## Open questions

None remaining — all open questions from the plan were resolved during review.
