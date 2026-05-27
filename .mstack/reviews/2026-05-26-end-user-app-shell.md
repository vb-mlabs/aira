# Review: End-User App Shell — Home, Listings, Account

**Date:** 2026-05-26 (revised 2026-05-27 after V4 mockup approval)
**Slug:** end-user-app-shell
**Plan reviewed:** [2026-05-26-end-user-app-shell.md](../plans/2026-05-26-end-user-app-shell.md)
**Mockup reference:** [.mstack/mockups/end-user-app-shell/](../mockups/end-user-app-shell/) — winner **V4 Sidebar Refined** (see `FEEDBACK.md`)
**Status:** approved
**UI-Significant:** yes
**Reviewer:** mlabs-review

---

## Summary

The plan is sound and ready to implement with adjustments. Three blockers were
resolved during initial review: (1) mobile nav overflow; (2) DB tier/category
columns stay as `text` with Zod validation rather than pgEnum; (3) both login
AND signup post-auth redirects updated to `/home`.

**Revised 2026-05-27 after mockup approval.** V4 (Sidebar Refined) replaces
the original top-nav approach with a sidebar-led app shell:

- **Desktop nav** = persistent green-textured left sidebar (~280px wide) with
  avatar + "AIRA / by Nisarga" header, menu rows with leading icon + chevron,
  "Contact Us" footer with 3 icon buttons + "Operated by Nisarga Group LLC".
  Utility actions (notifications, account, sign out) move to a thin top
  utility bar in the main content area.
- **Mobile nav** = 3-tab bottom bar (**Home** · **Categories** · **Account**)
  + hamburger in top bar opens the full green sidebar as a drawer.
- **`/account` decision flips:** Account is now its own full screen (not a
  redirect), so the bottom tab has a real destination. Contains profile
  header + Account group + Support group + Sign-out button.
- **New mobile route `/categories`** — full-screen category list mirroring
  the sidebar contents.
- **Brand assets:** Reuses existing `paper-green.webp` and `paper-cream.webp`
  textures already in `apps/web/public/marketing-images/textures/`. No new
  image assets needed.

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

**Original (still valid):**
1. `tier` and `category`: `text` columns, Zod-validated in query layer with
   exported constants (`VALID_TIERS`, `VALID_CATEGORIES`).
2. Post-auth redirects: both `login/page.tsx` and `signup/page.tsx` → `/home`.
3. `image_url`: text column; Replit Object Storage URLs, admin-populated via
   Drizzle Studio for MVP.
4. Business slug: admin-supplied, Zod validates kebab-case.
5. `updated_at`: Drizzle `.$onUpdate(() => new Date())`.

**Updated 2026-05-27 from V4 mockup:**
6. **App shell on desktop (≥ md)** = persistent left sidebar (~280px) with
   `paper-green.webp` texture background. Replaces the original top nav.
7. **App shell on mobile (< md)** = top bar (hamburger + "AIRA" wordmark +
   notification bell) + 3-tab bottom bar (Home / Categories / Account). The
   hamburger opens the full sidebar as a drawer.
8. **`/account` page (REVERSED from prior decision):** now a full standalone
   page at `apps/web/src/app/(app)/account/page.tsx`. Profile header (avatar
   + name + email), Account group (Edit profile, Notifications, Privacy &
   security), Support group (Contact us, Terms & privacy, About AIRA),
   Sign-out button, "Operated by Nisarga Group LLC" footer. Edit profile +
   notifications + privacy still resolve to existing `/profile` screens or
   "coming soon" placeholders — the page is a real account hub, not a
   redirect.
9. **New mobile route `/categories`** — full-width category list (icon +
   name + count + chevron). Mirrors the desktop sidebar's category section.
10. **Sidebar contents** = Home, then 7 categories in display order
    (Restaurants, Education, Events & Entertainment, Professional Services,
    Health & Wellness, Real Estate, Shopping). Contact Us footer with 3
    icon buttons (`Mail`, `Globe`, `Phone` from lucide-react) plus
    "Operated by Nisarga Group LLC" small text.
11. **Featured business card pattern** (used on home + featured grids):
    circular avatar (cream bg, cream border) + name + verified blue tick
    + small body-font category·location subtitle + olive "Call" pill
    button (anchor with `tel:` href).
12. **Stat cards on home** — two side-by-side: "500+ Verified Businesses",
    "10K+ Community Members". Numbers are hardcoded placeholders for MVP
    (no query); display only.
13. **Brand textures** — reuse existing `paper-green.webp` (sidebar) and
    `paper-cream.webp` (main content) from
    `apps/web/public/marketing-images/textures/`. No new assets.
14. **Icons** — use lucide-react throughout (already in deps from Sprint 0).
    Mockup uses emoji as placeholders; production uses lucide.

---

## Implementation plan

> **Revised 2026-05-27** to match V4 mockup. Tasks 1–3 + the final redirect
> task are unchanged from the original review; UI/shell tasks are rebuilt
> around the sidebar architecture. Reference
> [.mstack/mockups/end-user-app-shell/v4/index.html](../mockups/end-user-app-shell/v4/index.html)
> for the visual target.

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
  - `apps/web/src/features/listings/components/BusinessCard.tsx` (new)
  - `apps/web/src/features/listings/components/BusinessDetail.tsx` (new)
  - `apps/web/src/features/listings/components/CategoryRow.tsx` (new)
  - `apps/web/src/features/listings/components/StatCard.tsx` (new)
  - `apps/web/src/features/listings/components/EmptyState.tsx` (new)
  - `apps/web/src/features/listings/components/category-meta.ts` (new) — exports
    the 7 categories with `slug`, `displayName`, `description`, `lucideIcon`
    (e.g. `UtensilsCrossed`, `GraduationCap`, etc.). Single source so the
    sidebar, categories screen, and validators all agree.
  - `apps/web/src/features/listings/index.ts` (edit — add component exports)
- **What:**
  - `BusinessCard` — circular avatar (cream bg, lucide icon based on category)
    + name + verified blue tick (`BadgeCheck` lucide icon, `text-info`) +
    category·location subtitle + olive "Call" pill (anchor with `tel:` href).
    Optional `tier` prop renders a tier pill (`var(--tier1/2/3)`). Clicking
    anywhere except the call button routes to detail page.
  - `BusinessDetail` — full fields (name, tier pill, verified tick, description,
    phone, website, address) + two prominent CTAs at the bottom: filled olive
    "Call Now" + outline olive "Visit Website". Back chevron at top.
  - `CategoryRow` — icon (lucide) + name + count subtitle + chevron right.
    Used in the mobile `/categories` screen and rendered inside the sidebar
    as the menu rows.
  - `StatCard` — display-font number + uppercase caption. Used on home.
  - `EmptyState` — body-font "No listings yet" message + optional icon.
- **Acceptance:** Components render without runtime errors; use `var(--tier1/2/3)`
  / `var(--primary)` / `var(--info)` tokens; no hardcoded hex; no brand string
  literals; lucide-react icons throughout; `pnpm typecheck` passes.

### Task 5: App shell — Sidebar component

- **Files:**
  - `apps/web/src/app/(app)/_components/app-sidebar.tsx` (new)
  - `apps/web/src/app/(app)/_components/app-sidebar-drawer.tsx` (new)
- **What:**
  - `AppSidebar` — Server Component, renders the persistent sidebar:
    - 280px wide; background `url('/marketing-images/textures/paper-green.webp')`
      with `--primary` as fallback colour
    - Header: 48px circular avatar (cream bg, "A" in display font, primary
      colour) + stacked "AIRA" (display) and "by Nisarga" (italic body-sm,
      cream/70) — pull text from `brand` import in `@aira/config`
    - Menu: one row per item via shared row primitive — leading lucide icon
      + label + trailing `ChevronRight`. Items: Home (`Home`), then 7
      categories from `category-meta.ts`. Active state = subtle
      `bg-cream/10` + `font-bold`. Use `usePathname` (Client Component variant
      or pass `currentPath` as prop) to set active.
    - Footer: "Contact Us" small display heading + 3 round icon buttons
      (`Mail` → `mailto:`, `Globe` → website, `Phone` → `tel:`) sourced from
      `brand.supportEmail` / `brand.url` (no hardcoded URLs) + small
      body-text "Operated by `{brand.legalEntity}`"
  - `AppSidebarDrawer` — Client Component wrapping `AppSidebar` in a slide-in
    overlay for mobile. Local `useState` for open/close; close X in header.
    Listens to route changes via `usePathname` and auto-closes on navigation.
- **Acceptance:** Sidebar renders with green texture and cream text; brand
  text is pulled from `@aira/config` (no string literals); active row
  highlights on the current route; drawer opens/closes smoothly on mobile;
  `pnpm lint` (including `no-brand-string-literal`) passes.

### Task 6: App shell — Bottom tab bar

- **Files:**
  - `apps/web/src/app/(app)/_components/bottom-tab-bar.tsx` (new)
- **What:** Client Component, mobile-only (`md:hidden`). 3 tabs equal-width:
  Home (`/home`, `Home` icon), Categories (`/categories`, `LayoutGrid` icon),
  Account (`/account`, `User` icon). Each tab is a `Link` with vertical
  layout (icon above label). Active state via `usePathname` — active tab
  gets `text-primary` + `font-bold`; inactive `text-muted-foreground`.
  Fixed to viewport bottom with `border-t border-border bg-card`. Safe-area
  inset padding (`pb-[env(safe-area-inset-bottom)]`) for notched devices.
- **Acceptance:** Bar appears only at `< md`; active tab highlights based on
  route; navigating between tabs works; respects iOS safe area; `pnpm
  typecheck` passes.

### Task 7: App shell — Layout restructure

- **Files:**
  - `apps/web/src/app/(app)/layout.tsx` (edit — rewrite)
  - `apps/web/src/app/(app)/_components/top-utility-bar.tsx` (new — small
    thin bar in main content area: `NotificationBell` + `Account` link
    + `SignOutButton`)
- **What:** Replace the existing nav shell. New layout structure:
  - `requireUser()` at the top (unchanged)
  - Desktop (`≥ md`) grid: sidebar (`AppSidebar`, 280px fixed) +
    main column (flex-1, `paper-cream.webp` background). Main column has
    `TopUtilityBar` then `{children}` then no bottom bar.
  - Mobile (`< md`): top header (hamburger button opening
    `AppSidebarDrawer` + AIRA wordmark + `NotificationBell`), then
    `{children}` (with bottom padding to clear the tab bar), then
    `BottomTabBar` at the viewport bottom.
  - Use Tailwind responsive classes to switch — no separate layouts. Account
    link in top utility bar → `/account`. Sign-out continues to use the
    existing `SignOutButton`.
- **Acceptance:** Desktop shows persistent sidebar + main area; mobile shows
  hamburger + bottom tab bar; resizing the browser switches between modes
  without page reload; no overflow at 375px; `pnpm typecheck` passes.
- **Pause if:** The existing `NotificationBell` component has a baked-in
  layout assumption that doesn't fit the new utility bar — flag for
  refactor rather than rewriting in place.

### Task 8: App route — /home

- **Files:**
  - `apps/web/src/app/(app)/home/page.tsx` (new)
- **What:** Server Component. `export const metadata = { title: "Home" }`.
  Calls `getFeaturedBusinesses()`. Renders, in order:
  1. Centred AIRA logo mark (olive circle with cream "A" in display font —
     reuse the welcome-hero tree-of-life mark if it exists; otherwise inline
     a simple SVG circle)
  2. "AIRA" display-font heading + "ROOTS · REACH" caps body-xs caption.
     Pull tagline from `brand.tagline` and dot-separate the words
     programmatically (`brand.tagline.split(" & ").join(" · ")`).
  3. "About AIRA" h2 + 2–3 sentence paragraph from a constant in this file
     (description is brand copy; OK to inline)
  4. Two `StatCard`s in a 2-column grid: "500+ Verified Businesses" and
     "10K+ Community Members" (hardcoded numbers for MVP — flag inline as
     `// TODO(post-MVP): replace with real counts`)
  5. "Featured Businesses" section with "View All →" link to `/listings`
     and a vertical list of `BusinessCard`s (max 6). Section hidden if no
     results.
- **Acceptance:** `/home` renders at 375px without overflow; featured section
  hidden when no businesses; tagline pulls from `brand.tagline`; AIRA name
  pulls from `brand.name`; `pnpm lint` passes (no brand-string-literal
  violations).

### Task 9: App route — /categories

- **Files:**
  - `apps/web/src/app/(app)/categories/page.tsx` (new)
- **What:** Server Component. `export const metadata = { title: "Categories" }`.
  Imports `category-meta.ts` and renders a vertical list of `CategoryRow`s,
  one per category, linking to `/listings/[slug]`. Optionally calls a new
  `getBusinessCountByCategory()` query to populate the count subtitle (or
  inline a placeholder "View all →" if adding the query expands scope —
  reviewer's call below). Page is mobile-prominent but renders the same on
  desktop.
- **Acceptance:** All 7 categories appear; each row links to the correct
  category slug; renders cleanly at 375px and on desktop; `pnpm typecheck`
  passes.
- **Pause if:** Adding `getBusinessCountByCategory()` requires a more
  complex GROUP BY query than 4 lines — skip the count subtitle for MVP
  and render "View all →" placeholder instead.

### Task 10: App routes — /listings/[category] and /listings/[category]/[id]

- **Files:**
  - `apps/web/src/app/(app)/listings/[category]/page.tsx` (new)
  - `apps/web/src/app/(app)/listings/[category]/[id]/page.tsx` (new)
- **What:**
  - `[category]/page.tsx` — validates `params.category` against
    `VALID_CATEGORIES`; `notFound()` on miss. Calls
    `getBusinessesByCategory()`. Renders heading (category display name + N
    listings) + vertical list of `BusinessCard`s (with tier pill) or
    `EmptyState`. Title: category display name.
  - `[category]/[id]/page.tsx` — calls `getBusinessById(params.id)`;
    `notFound()` if null. Renders `BusinessDetail` with back chevron →
    `/listings/[category]`. Title: business name.
  - Note: the original `/listings` root is **not** built in this revision —
    `/categories` covers that role for mobile, and desktop users navigate
    via the sidebar.
- **Acceptance:** Invalid category slug → 404; valid category with no
  businesses → EmptyState; valid business → detail renders; unknown id →
  404; back link works; phone link has `tel:` href; `pnpm typecheck` passes.

### Task 11: App route — /account

- **Files:**
  - `apps/web/src/app/(app)/account/page.tsx` (new)
- **What:** Server Component. `requireUser()` (provides current user for
  profile header). `export const metadata = { title: "My Account" }`.
  Layout (vertical):
  1. Profile header: 64px circular avatar with initial of user's name
     (fallback: email's first char), display-font name, body-font email.
  2. "Account" group (label + card with 3 rows): Edit profile (→ `/profile`),
     Notifications (→ `#`, placeholder), Privacy & security (→ `#`,
     placeholder). Each row: lucide icon + label + chevron.
  3. "Support" group (3 rows): Contact us (→ `mailto:${brand.supportEmail}`),
     Terms & privacy (→ `/legal/terms`, if exists; else `#` placeholder),
     About AIRA (→ `/about`, if exists; else `#` placeholder).
  4. "Sign out" — outline olive button using existing `SignOutButton`
     component (style override if needed via wrapper).
  5. "Operated by `{brand.legalEntity}`" small footer text.
- **Acceptance:** `/account` renders for any signed-in user; placeholders
  use `#` href and are visually distinguished (e.g. slightly dimmer); brand
  text pulled from `@aira/config`; `pnpm lint` passes
  (`no-brand-string-literal`).
- **Pause if:** `SignOutButton` can't be visually adjusted to the outline
  style without prop changes — flag for a small component prop addition.

### Task 12: Post-auth redirects → /home

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

None remaining — V4 mockup resolved the nav-architecture questions from the
prior review revision.
