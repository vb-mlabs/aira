# Plan: Admin sidebar consolidation + Setup hub gated behind super_admin

**Date:** 2026-06-15
**Slug:** 2026-06-15-admin-setup-hub-super-admin-gate
**Status:** implemented
**Author:** framer@millionlabs.co.uk

---

## Problem

The admin sidebar carries 12 flat rows that mix three very different kinds of
work — day-to-day operations (Businesses, Renewals, Community, Users), platform
configuration (Categories, Cities, Membership plans, Sponsorship tiers,
Settings), and system internals (Audit log, Cron). Every admin sees every row,
so any admin can rename a category, change membership pricing, or fire a cron
job manually. There is no current way to delegate "approve listings" without
also delegating "rewrite the platform's taxonomy."

The auth layer already anticipates this: the DB `user_role` enum carries three
values (`end_user`, `admin`, `super_admin`) and `requireSuperAdmin()` exists at
`apps/web/src/lib/auth/server.ts:272`, but it has zero callers. The
`@aira/api` `Permission` union was deliberately narrowed to `"user" | "admin"`
in `packages/api/src/permission.ts:9` with a note to expand "when the second
axis appears." The second axis has now appeared.

**Beneficiaries:** the project owner (can hand the `admin` role to operators
without giving up control over platform shape), operators (less visual noise
in the sidebar, fewer destructive levers in reach), and future MVP forks (a
reusable pattern for two-tier admin separation).

## Scope

**In:**
- Widen `@aira/api`'s `Permission` union to `"user" | "admin" | "super_admin"`
  and teach `defineOperation` that `super_admin ≥ admin ≥ user`.
- Stop the role-collapse in `apps/web/src/server/operations/index.ts:33` so the
  operation layer can see the difference between `admin` and `super_admin`.
- Add `requireSuperAdminJSON()` in `apps/web/src/lib/auth/server.ts` mirroring
  the existing `requireAdminJSON()` so non-`defineOperation` route handlers
  (multipart, CSV) can enforce the same gate.
- Move pages: `/admin/{categories,cities,membership-plans,sponsorship-tiers}`
  → `/admin/settings/{categories,cities,membership-plans,sponsorship-tiers}`.
  Today's `/admin/settings` landing becomes `/admin/settings/app` and its
  existing nested pages (`homepage`, `renewal-schedule`) move with it to
  `/admin/settings/app/{homepage,renewal-schedule}`.
- Build `/admin/settings` as a tabbed hub with five tabs (one route per tab).
  `/admin/settings` redirects to `/admin/settings/categories` (first tab).
- `app/admin/settings/layout.tsx` calls `requireSuperAdmin()` so the entire
  hub returns `notFound()` for plain admins.
- Page-level `requireSuperAdmin()` gates: `/admin/audit`, `/admin/cron`, and
  the Users role-change UI surface (the Users *listing* page stays
  `requireAdmin()` — it's read-only browsing; the role-change action is
  what gets restricted).
- Operation-level `permission: "super_admin"` on every op behind the
  super_admin surfaces: categories, cities, membership-plans,
  sponsorship-tiers, app-settings, audit, cron, and `changeUserRoleOp`.
- The sidebar is rendered with `userRole` passed from the server layout; the
  nav definition tags each row with `requires: "admin" | "super_admin"` and
  filters rows the caller can't access. Sidebar visually groups into
  **Operate** (Dashboard, Businesses, Renewals, Community, Users) →
  **Setup** (single row, super_admin only) → **System** (Audit log, Cron;
  super_admin only).
- Old routes (`/admin/categories`, `/admin/cities`,
  `/admin/membership-plans`, `/admin/sponsorship-tiers`) are deleted — they
  return Next.js 404. Locked decision: clean break, no redirects.

**Out (deferred):**
- No redirects from old to new routes (locked: "break links (move only)").
- No restructure of `/api/v1/admin/*` paths — only the web pages move; the
  REST surface that mobile consumes is unchanged.
- No new permission levels beyond `super_admin` (no per-tenant scopes, no
  feature flags axis — the `permission.ts` comment about not pre-building
  still applies).
- No change to the DB `user_role` enum, the super_admin bootstrap hook
  (`packages/auth/src/hooks/super-admin-bootstrap.ts`), or the JWT payload
  shape — they already carry the right role string.
- No change to the `/api/v1/admin/users/[id]/role` route's existing rule that
  rejects `super_admin` *targets*; that rule stays, and we additionally
  require the *caller* be super_admin.
- No collapsible sidebar groups — Setup is a single row, Operate and System
  are just visual grouping (a separator between sections), not interactive
  groups.
- No mobile admin shell changes beyond the same sidebar source-of-truth (the
  admin shell is desktop-first; the drawer renders the same component).

## Approach

The chosen path treats the `Permission` union widening as the lever
everything else hangs off. Today the system already has the right shape: a
single declarative `permission:` field on each operation, a single
`requireAdmin()`/`requireSuperAdmin()` helper pair at the page boundary, and
a sidebar that's already a server component (`apps/web/src/app/admin/layout.tsx:28`
calls `requireAdmin()` and the sidebar component is a client component
imported underneath). We add one more level to the existing axis instead of
inventing a new mechanism.

**API layer (the lever).** `Permission` becomes `"user" | "admin" | "super_admin"`
with a documented ordering. `defineOperation`'s gate compares numeric levels
(`{ user: 0, admin: 1, super_admin: 2 }`) so `permission: "admin"` continues
to accept super_admin callers (no behavior change for existing ops) but
`permission: "super_admin"` rejects plain admin. The role-collapse in
`apps/web/src/server/operations/index.ts:33` is removed; the
`OperationSession.user.role` becomes the full union so ops can see the real
role. `apiServerFetch` (same in-process invoker for RSCs) inherits the new
union for free.

**Page layer.** `app/admin/settings/layout.tsx` calls `requireSuperAdmin()`.
`app/admin/audit/page.tsx` and `app/admin/cron/page.tsx` swap
`requireAdmin()` → `requireSuperAdmin()`. The Users role-change *UI* (the
button/row in the user detail page) is conditionally rendered based on the
caller's role; the API-level `changeUserRoleOp` is the source of truth and
returns 403 if a plain admin POSTs directly. `notFound()` semantics stay
(no 403/404 leakage) — locked in W8.

**Sidebar.** The admin layout already awaits `requireAdmin()` and gets the
user back. We pass `userRole` to the sidebar component. The nav list grows a
`requires: Permission` field per row and a `groupAfter?: "operate" | "setup"`
marker for the visual separators. The sidebar filters rows by
`hasPermission(userRole, row.requires)` and renders a thin divider between
groups. Plain admins see Operate + nothing in Setup + nothing in System
(no empty group headers). For desktop and mobile the same component drives
both because the desktop sidebar and the mobile drawer already import the
same `AdminSidebar`.

**Setup hub UX.** `/admin/settings` is a server-component layout that renders
a tab strip + `{children}`. Each tab is a real route (`/admin/settings/categories`
etc.) — keeps server-side data fetching per tab, matches the existing
`/admin/*` pattern, makes deep-linking and audit-log breadcrumbs natural,
and avoids client-state plumbing. The five tabs in order: Categories, Cities,
Membership plans, Sponsorship tiers, App settings. The page bodies are
moved verbatim — the existing `_components` and operation imports stay; only
the route file's path changes.

**Alternatives considered:**

- *Keep `Permission` narrow + add explicit `requireSuperAdminContext()` checks
  in each handler* — rejected. Decentralized: each new super_admin op has to
  remember the check, one forgotten import = a leak. The whole point of
  `defineOperation`'s declarative `permission:` field is to make policy
  visible and type-checkable in one place.
- *Collapsible sidebar group + keep routes top-level* — rejected per the user
  decision. Keeping 5 separate top-level Setup routes leaves the sidebar
  cluttered when expanded, and the role-aware hiding logic has to operate on
  5 individual rows instead of 1 group.
- *Three-tier sidebar groups with Operate / Setup / System as collapsible
  sections* — rejected. Adds interaction cost to find common things; the
  current admin sidebar has flat rows for a reason. Visual separators get the
  grouping benefit without the click cost.
- *Per-permission `feature flags` axis (e.g. `permission: "admin:setup"`)* —
  rejected. `permission.ts:1-8` documents that the second axis hasn't
  appeared yet; this is a single second axis (privilege level), not the
  start of a flag matrix. Add the matrix when a third dimension actually
  shows up.

## Data model changes

None. The `user_role` enum already carries `super_admin`; the super_admin
bootstrap hook already promotes the `SUPER_ADMIN_EMAIL` on signup. No
migration is needed.

## Files to touch

**New:**
- `apps/web/src/app/admin/settings/layout.tsx` — `requireSuperAdmin()` gate,
  renders the tab nav above `{children}`.
- `apps/web/src/app/admin/settings/page.tsx` — replaces the current
  landing-page implementation; redirects to `/admin/settings/categories`.
- `apps/web/src/app/admin/settings/categories/page.tsx` — moved body of
  `apps/web/src/app/admin/categories/page.tsx`.
- `apps/web/src/app/admin/settings/cities/page.tsx` — moved body of
  `apps/web/src/app/admin/cities/page.tsx`.
- `apps/web/src/app/admin/settings/membership-plans/page.tsx` — moved body of
  `apps/web/src/app/admin/membership-plans/page.tsx`.
- `apps/web/src/app/admin/settings/sponsorship-tiers/page.tsx` — moved body
  of `apps/web/src/app/admin/sponsorship-tiers/page.tsx`.
- `apps/web/src/app/admin/settings/app/page.tsx` — replaces the current
  `/admin/settings/page.tsx` landing (the cards index); the
  `homepage` and `renewal-schedule` sub-pages move with it under
  `/admin/settings/app/{homepage,renewal-schedule}`.
- `apps/web/src/app/admin/_components/settings-tabs.tsx` — client component
  rendering the 5-tab nav with active-tab styling driven by `usePathname()`.

**Edit:**
- `packages/api/src/permission.ts` — widen union; export a
  `permissionLevel` map and a `hasPermission(caller, required)` helper.
- `packages/api/src/define-operation.ts` — gate uses `hasPermission(...)`
  instead of equality so `permission: "admin"` still accepts super_admin.
- `apps/web/src/server/operations/index.ts:30-35` — stop collapsing
  `super_admin` to `"admin"` in `OperationSession.user.role`.
- `apps/web/src/lib/auth/server.ts` — add `requireSuperAdminJSON(req)` mirror
  of `requireAdminJSON(req)`.
- `apps/web/src/server/operations/categories-admin.ts` — five ops:
  `listCategoriesAdminOp`, `createCategoryOp`, `updateCategoryOp`,
  `deactivateCategoryOp`, `reorderCategoriesOp` → `permission: "super_admin"`.
- `apps/web/src/server/operations/cities.ts` (or wherever city ops live) —
  same.
- `apps/web/src/server/operations/membership-plans.ts` — same.
- `apps/web/src/server/operations/sponsorship-tiers.ts` — same.
- `apps/web/src/server/operations/app-settings.ts` — same.
- `apps/web/src/server/operations/admin.ts` — `listAuditOp` (and any
  cron ops) → `permission: "super_admin"`.
- `apps/web/src/server/operations/users.ts` (or wherever `changeUserRoleOp`
  lives — found at `/api/v1/admin/users/[id]/role/route.ts:3`) →
  `permission: "super_admin"`. Keep the existing rule that rejects
  super_admin targets.
- `apps/web/src/app/admin/_components/admin-sidebar.tsx` — accept `userRole`
  prop; nav list gains `requires:` per row and a `groupAfter:` marker;
  filter + render visual separator between groups.
- `apps/web/src/app/admin/_components/admin-mobile-sidebar.tsx` — accept and
  pass `userRole` through.
- `apps/web/src/app/admin/layout.tsx` — pass `admin.role` to both sidebars.
- `apps/web/src/app/admin/audit/page.tsx:1` — switch `requireAdmin()` →
  `requireSuperAdmin()`.
- `apps/web/src/app/admin/cron/page.tsx` — same.
- `apps/web/src/app/admin/users/[id]/page.tsx` — gate the role-change
  control on `userRole === "super_admin"`; still render the rest of the
  detail for plain admins.

**Delete:**
- `apps/web/src/app/admin/categories/page.tsx` (and any sibling files).
- `apps/web/src/app/admin/cities/page.tsx`.
- `apps/web/src/app/admin/membership-plans/page.tsx`.
- `apps/web/src/app/admin/sponsorship-tiers/page.tsx`.
- The current `apps/web/src/app/admin/settings/page.tsx` (cards landing) —
  replaced by the new redirect-to-first-tab `page.tsx`. Its homepage and
  renewal-schedule sub-folders move under `/admin/settings/app/`.

## Edge cases

- **Plain admin types `/admin/settings/categories` directly.** Layout
  `requireSuperAdmin()` returns `notFound()` → 404 page. No 403 → 404
  differentiation (locked W8 decision).
- **Plain admin POSTs `/api/v1/admin/categories` with a real cookie.**
  `defineOperation`'s gate sees `permission: "super_admin"` and a caller at
  `admin` level → returns the `ApiError.forbidden()` JSON response.
- **super_admin uses an existing admin-level op.** Hierarchy: `super_admin ≥
  admin`, so all existing `permission: "admin"` ops continue to accept
  super_admin callers — no regression for the bootstrap super_admin user.
- **Bootstrap super_admin doesn't exist yet.** First admin promoted via
  `/api/v1/admin/users/[id]/role` is `admin`, not `super_admin`. The
  bootstrap hook only fires on signup for `SUPER_ADMIN_EMAIL`. If the env
  var is unset and no one was promoted at signup, the Setup hub becomes
  unreachable. Acceptable in this template (it's a one-time setup step
  documented in `FORK_CHECKLIST.md.template`) but worth a doc nudge.
- **JWT-authed mobile admin.** The JWT carries `role` in its payload
  (`apps/web/src/lib/auth/server.ts:64`). Today it likely encodes the raw DB
  role; the `Permission` widening doesn't change the wire format, only the
  type union the operation system uses. Verify the JWT signing path passes
  the full role through.
- **`getCallerContext()`** at `apps/web/src/lib/auth/server.ts:105` also
  collapses super_admin → admin. Must update in lockstep with the
  operations/index.ts change so direct service callers (none today, but
  the helper exists) see the correct role.
- **Existing audit-log entries reference old URLs** (`/admin/categories/123`
  etc.). They'll 404 on click. Acceptable per the "break links" decision;
  but might want a one-line note in the audit table that older entries pre-
  date the move. Defer to review.
- **An admin loses access mid-session.** A user demoted from `super_admin` →
  `admin` keeps their session. Next render of `/admin/settings/*` returns
  404; their sidebar still shows the Setup row until next page load. No
  active revocation needed for MVP.
- **The 30-min admin idle timeout** (`ADMIN_IDLE_MS` at `auth/server.ts:21`)
  already wraps `requireSuperAdmin()`. No interaction issue.

## Acceptance criteria

- [ ] `packages/api/src/permission.ts` exports `Permission = "user" |
      "admin" | "super_admin"` and a `hasPermission(caller, required)` helper
      with `super_admin ≥ admin ≥ user`.
- [ ] `defineOperation` accepts `permission: "super_admin"` and rejects
      `admin`-level callers with `ApiError.forbidden()`; existing
      `permission: "admin"` ops still accept super_admin callers (no
      regression).
- [ ] `OperationSession.user.role` and `getCallerContext()`'s
      `CallerContext.user.role` carry the real DB role string (no more
      super_admin → admin collapse).
- [ ] `requireSuperAdminJSON(req)` exists in
      `apps/web/src/lib/auth/server.ts` and returns the same 403 JSON shape
      as `requireAdminJSON`.
- [ ] `/admin/settings` is a tabbed hub with 5 tabs in this order:
      Categories, Cities, Membership plans, Sponsorship tiers, App settings.
      Hitting `/admin/settings` directly redirects to
      `/admin/settings/categories`.
- [ ] `/admin/settings/app/{homepage,renewal-schedule}` work and are linked
      from the App settings tab body.
- [ ] Old routes `/admin/{categories,cities,membership-plans,
      sponsorship-tiers}` return Next.js 404.
- [ ] Sidebar shows Operate group (Dashboard, Businesses, Renewals,
      Community, Users) → Setup row (super_admin only) → System group (Audit
      log, Cron; super_admin only), with thin visual separators between
      groups.
- [ ] As a plain admin: Setup row is hidden, System rows are hidden;
      typing `/admin/settings/categories`, `/admin/audit`, or `/admin/cron`
      in the URL bar shows the Next.js 404 page (no 403).
- [ ] As a plain admin: every `/api/v1/admin/{categories,cities,
      membership-plans,sponsorship-tiers,app-settings,audit,cron}` endpoint
      and the `users/[id]/role` POST returns
      `ApiError.forbidden()` JSON.
- [ ] As super_admin: every previously-working surface continues to work
      identically (no regression).
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test` pass.
- [ ] No new top-level deps.
- [ ] No `"use server"` directives added (gate at `check-no-server-actions`
      stays clean).
- [ ] No raw `process.env` reads added — env access still goes through
      `apps/web/src/config/env.ts`.

## Open questions

For the reviewer (`/mlabs-review`) to resolve before implementation.

- **Users page split.** Should the Users *listing* page (`/admin/users`)
  stay `requireAdmin()` so plain admins can browse, with only the role-
  change button gated? Or hide the whole Users listing from plain admins
  too? Recommendation: keep listing for `admin`; gate the role-change
  control + the API.
- **Audit log visibility.** Confirmed super_admin-only above, but worth
  one more sanity check — some MVPs want audit log visible to all admins
  so peers can see each other's actions. If we want that flexibility per
  fork, we could read the gate from `packages/config/src/brand.ts` or an
  env var. Recommendation: hard-code super_admin for this template; forks
  that want different policy can change the `permission:` value.
- **App settings tab content.** Should the App settings tab show a list of
  sub-pages (current cards-style landing — Homepage, Renewal schedule), or
  should those settings be inlined into the tab body directly? Recommend:
  list view (forks will add more app-level settings over time).
- **First-tab redirect strategy.** Server-side `redirect()` to
  `/admin/settings/categories` from the bare `/admin/settings/page.tsx`, or
  let the parent layout render and have the page show "pick a tab"?
  Recommend: redirect, matches existing `/admin` pattern of always landing
  on something useful.
- **`OperationSession` widening blast radius.** Removing the role-collapse
  changes the type of `OperationSession.user.role`. Any service that
  exhaustively switches on the role will need a new branch. Scan for
  `user.role === "admin"` callsites — they may be safe because the
  comparison still type-checks, but it's worth a sweep.
- **JWT payload shape.** Confirm the JWT signing path (likely in
  `packages/auth`) already writes `role: "super_admin"` through. If it was
  collapsing too, mobile admins promoted to super_admin would still appear
  as `admin` after JWT verification.
- **Sidebar visual treatment for the empty middle when plain admin.** With
  Setup hidden, Operate sits next to Audit/Cron (also hidden). Plain admin
  effectively sees: Dashboard / Businesses / Renewals / Community / Users
  with no separators. Confirm that's acceptable (it is — there's nothing
  to separate).
