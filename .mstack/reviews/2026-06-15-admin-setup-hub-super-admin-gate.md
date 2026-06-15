# Review: Admin sidebar consolidation + Setup hub gated behind super_admin

**Date:** 2026-06-15
**Slug:** 2026-06-15-admin-setup-hub-super-admin-gate
**Plan reviewed:** [2026-06-15-admin-setup-hub-super-admin-gate.md](../plans/2026-06-15-admin-setup-hub-super-admin-gate.md)
**Status:** approved
**UI-Significant:** yes
**Reviewer:** framer@millionlabs.co.uk

---

## Summary

Plan is sound — the union-widening lever is the right shape and the page +
sidebar + operation layers are the right places to enforce. Review surfaced
one real correctness blocker (the operation-layer admin freshness gate is
gated on `spec.permission === "admin"` and would silently *skip* the 30-min
idle check on super_admin Setup ops unless widened in lockstep), several
file-path corrections (the plan referenced names that don't match the actual
operation files: `define-operation.ts` doesn't exist — `meetsPermission` lives
in `operation.ts:139-142`; cities/app-settings/cron ops are under their
`*-admin.ts` siblings, not the bare names), and one UX decision the plan had
left open (App settings tab inlines its forms; no nested cards). Ready for
implementation as a 10-task sequence.

## Findings

### Blockers (resolved during review)

- **Operation freshness gate must widen.**
  `packages/api/src/operation.ts:170-176` only invokes `enforceAdminFreshness`
  when `spec.permission === "admin"`. After widening Permission, `super_admin`
  Setup ops would *skip* the 30-min idle check at the API layer while still
  hitting it at the page layer (where `requireSuperAdmin()` calls
  `adminSessionIsStale`). That asymmetry is a real auth bug — a stale-cookie
  super_admin would fail RSC renders but their `apiClient` mutations to the
  same Setup ops would still succeed.
  **Decision:** Predicate becomes `spec.permission !== "user"` (fires for both
  admin and super_admin). Confirmed with user. Folded into Task 1.

### Concerns (raised, decided, recorded)

- **Concern:** Plan references `packages/api/src/define-operation.ts` and
  `apps/web/src/server/operations/{cities,app-settings,users}.ts`. None of
  those filenames exist as written.
  **Decision:** Implementation plan uses real paths: `packages/api/src/operation.ts`
  (where `meetsPermission` lives at line 139-142), and the
  `*-admin.ts`-suffixed operation files (`cities-admin.ts`,
  `app-settings-admin.ts`, `cron-admin.ts`). Users/audit/changeRole stay in
  `admin.ts` (which already groups them).

- **Concern:** Plan said the "Users role-change UI" gate goes in
  `app/admin/users/[id]/page.tsx`, but the role-change buttons actually live
  in `apps/web/src/features/admin/components/user-detail.tsx:178-189` (a
  client component). The page just renders the component.
  **Decision:** Task 8 passes a `callerRole` prop into `user-detail.tsx` and
  conditionally renders the role-change controls. Page-level
  `requireSuperAdmin()` is **not** appropriate here (would 404 a plain admin
  who only wants to ban/unban) — the gate is on the *button*, with the API
  op being the source of truth.

- **Concern:** Plan listed `listAuditOp` and "cron ops" all under
  `operations/admin.ts` with `permission: "super_admin"`. But cron ops live
  in `cron-admin.ts`, and `admin.ts` also has `listUsersOp`,
  `getUserDetailOp`, `banUserOp`, `unbanUserOp`, `sendPasswordResetToOp`,
  `sendAdminNotificationOp` — most of which the plan did **not** intend to
  gate (plain admins still need user listings + ban/unban).
  **Decision:** Only `listAuditOp` and `changeRoleOp` (in `admin.ts`), plus
  both ops in `cron-admin.ts` (`listCronRunsOp`, `triggerCronRunOp`) move to
  `super_admin`. Everything else in `admin.ts` stays `permission: "admin"`.
  Spelled out explicitly in Task 4.

- **Concern:** App settings tab content was a plan-level open question.
  **Decision:** Inline the Homepage CMS form + Renewal schedule form
  directly into `/admin/settings/app/page.tsx` (no nested sub-routes).
  Confirmed with user. The existing
  `/admin/settings/homepage` and `/admin/settings/renewal-schedule` routes
  are deleted (their bodies fold into the App tab). HomepageCmsForm and
  RenewalScheduleForm components live in `@/features/admin/components` and
  are already self-contained, so co-rendering is safe.

- **Concern:** Sidebar separator visual treatment was unspecified.
  **Decision:** Thin horizontal rule + 8-12px extra vertical gap between
  groups. Matches the texture-paper aesthetic and the user-facing
  AppSidebar's grouping idiom. Folded into Task 9.

- **Concern:** JWT refresh route writes
  `role: user.role ?? "user"` (`apps/web/src/app/api/auth/refresh/route.ts:64`).
  After widening Permission, the `signAccessToken` signature must accept the
  wider union. If `packages/auth` constrains the role string narrowly, that
  would need touching too — but `packages/auth` is out-of-scope per the
  plan.
  **Decision:** Task 2 verifies the call site type-checks against the new
  union. If `signAccessToken`'s payload schema constrains role to
  `"user" | "admin"`, that's a **Pause if** trigger — escalate, don't
  silently widen the auth package.

- **Concern:** `apps/web/src/app/api/v1/messages/conversations/*` route files
  collapse `super_admin` → `"admin"` for their LOCAL messaging role
  (`route.ts:25-29`). Distinct from the global Permission collapse.
  **Decision:** Leave those alone — they're collapsing to a domain-specific
  enum (`"user" | "admin"` for who-can-see-which-conversations), not the
  global Permission. No regression.

- **Concern:** `OperationSession.user.role` is typed `Permission` at
  `packages/api/src/operation.ts:41`. Widening Permission widens this for
  free, BUT downstream callers exhaustive-switching on
  `ctx.user.role === "admin"` keep working (super_admin satisfies any role
  check that asks for ≥ admin level only if they go through
  `meetsPermission`). Direct equality checks on `"admin"` would now miss
  super_admin callers.
  **Decision:** Scanned `packages/services` and
  `apps/web/src/{server,lib,app,features}` for `user.role === "admin"`
  callsites. Only hit is `features/admin/components/user-row.tsx:18` and
  similar UI conditionals — those are about the *target* user's role being
  rendered, not the *caller's*. No service-layer or auth callsite does
  equality on caller role. Safe to widen.

### Suggestions (taken)

- **Add test cases for super_admin gate in `packages/api/src/__tests__/operation.test.ts`** —
  Taken. Task 1 adds three cases: (a) super_admin op rejects admin caller
  with 403, (b) admin op accepts super_admin caller, (c) freshness gate
  fires when `permission: "super_admin"` and `ctx.source === "web"`.
- **Make `requires` field on nav rows total (not optional)** —
  Taken. Default-required fields catch a forgotten gate at compile time
  rather than at runtime. Operate rows declare `requires: "admin"` explicitly.
- **Add an audit-table note that pre-move audit URLs may 404** —
  Deferred. The audit table renders human-readable action descriptions; the
  URL-rendering happens only on a specific subset of audit kinds. Forks that
  care can add the disclaimer separately.

## Decisions locked

Net new decisions made during review (beyond what was in the plan):

- **Operation freshness gate fires for both `admin` and `super_admin`.**
  Predicate in `maybeEnforceFreshness` widens from `spec.permission === "admin"`
  to `spec.permission !== "user"`.
- **App settings tab inlines the Homepage CMS form and Renewal schedule
  form** directly. No nested `/admin/settings/app/{homepage,renewal-schedule}`
  routes. The existing nested routes are deleted.
- **Sidebar group separators** use a thin `border-t border-sidebar-border`
  rule with `mt-3` extra padding between groups. No group labels (matches
  current sidebar's label-less idiom).
- **Only `listAuditOp` and `changeRoleOp` move to `super_admin` in
  `admin.ts`.** Other admin-domain ops (listUsers, getUserDetail, banUser,
  unbanUser, sendPasswordReset, sendAdminNotification) stay at
  `permission: "admin"` so plain admins keep moderation powers.
- **`requireSuperAdmin()` is NOT used on `/admin/users/[id]/page.tsx`.**
  Page stays `requireAdmin()`; only the role-change button conditionally
  renders based on `callerRole === "super_admin"`. The
  `changeRoleOp` API gate is the security source of truth.

## Implementation plan

Ordered tasks for `/mlabs-code` to execute top-to-bottom. Each task is atomic
(one commit). The codebase stays in a working state between tasks.

### Task 1: Widen Permission union in @aira/api with hierarchy + freshness fix

- **Files:**
  - `packages/api/src/permission.ts` (edit)
  - `packages/api/src/operation.ts` (edit — `meetsPermission` line 139-142
    and `maybeEnforceFreshness` line 170-176)
  - `packages/api/src/__tests__/operation.test.ts` (edit — add three test cases)
- **What:** Widen `Permission` to `"user" | "admin" | "super_admin"`. Export a
  `permissionLevel: Record<Permission, number>` map (`user: 0, admin: 1,
  super_admin: 2`) and a `hasPermission(actual, required): boolean` helper
  using the map. Replace `meetsPermission()` body with a call to
  `hasPermission`. In `maybeEnforceFreshness`, widen the predicate from
  `spec.permission === "admin"` to `spec.permission !== "user"` so
  super_admin Setup ops hit the same 30-min idle gate. Add tests: (a)
  super_admin op rejects admin caller (403 forbidden), (b) admin op accepts
  super_admin caller (200), (c) freshness hook is called for a
  super_admin-gated op on `source: "web"`.
- **Acceptance:**
  - `pnpm --filter @aira/api test` passes; the three new test cases assert
    role-hierarchy and freshness behaviors.
  - `pnpm --filter @aira/api typecheck` passes.
  - No callers of `Permission` outside @aira/api are touched (downstream
    tasks pick up the wider union via re-export).

### Task 2: Stop role-collapse in apps/web composition root + getCallerContext

- **Files:**
  - `apps/web/src/server/operations/index.ts` (edit — lines 30-35)
  - `apps/web/src/lib/auth/server.ts` (edit — `getCallerContext` at 105-123)
- **What:** Remove the `u.role === "admin" || u.role === "super_admin" ? "admin"
  : "user"` collapse in both files; preserve the raw DB role string when it's
  one of `admin | super_admin`, fall back to `"user"` otherwise. Update the
  doc comments that explain the collapse to instead explain the hierarchy.
- **Acceptance:**
  - `pnpm typecheck` passes across the workspace.
  - Reading `OperationSession.user.role` for a super_admin caller returns
    literally `"super_admin"`.
  - Existing `permission: "admin"` ops continue to accept super_admin callers
    (covered by Task 1's hierarchy logic).
- **Pause if:** Any TypeScript error appears in `packages/auth/src/server.ts`
  (signAccessToken signature) — that would mean the JWT payload schema in
  `packages/auth` constrains `role` to the narrow union and needs widening
  too. `packages/auth` is out-of-scope per the plan; escalate.

### Task 3: Gate Setup ops on super_admin

- **Files:**
  - `apps/web/src/server/operations/categories-admin.ts` (edit — 5 ops)
  - `apps/web/src/server/operations/cities-admin.ts` (edit — 3 ops)
  - `apps/web/src/server/operations/membership-plans.ts` (edit — 4 ops)
  - `apps/web/src/server/operations/sponsorship-tiers.ts` (edit — 4 ops)
  - `apps/web/src/server/operations/app-settings-admin.ts` (edit — 4 ops)
- **What:** Find/replace every `permission: "admin"` → `permission: "super_admin"`
  in these five files only. Do not touch operations in `businesses-admin.ts`,
  `business-subscriptions.ts`, `community.ts`, `subscription-followups.ts`,
  `users.ts`, `notifications.ts`, `messages.ts`, `businesses.ts`, etc.
- **Acceptance:**
  - As a plain admin: every `/api/v1/admin/{categories,cities,
    membership-plans,sponsorship-tiers,app-settings}` endpoint returns 403
    `ApiError.forbidden()` JSON.
  - As super_admin: every endpoint above succeeds (verified manually or via
    existing integration tests if present).

### Task 4: Gate audit, cron, and changeRole ops on super_admin

- **Files:**
  - `apps/web/src/server/operations/admin.ts` (edit — `listAuditOp` line 56-60,
    `changeRoleOp` line 72-79)
  - `apps/web/src/server/operations/cron-admin.ts` (edit — `listCronRunsOp`,
    `triggerCronRunOp`)
- **What:** Change exactly those four ops' `permission: "admin"` →
  `permission: "super_admin"`. Leave `listUsersOp`, `getUserDetailOp`,
  `banUserOp`, `unbanUserOp`, `sendPasswordResetToOp`,
  `sendAdminNotificationOp` untouched.
- **Acceptance:**
  - Plain admin → 403 on `/api/v1/admin/audit`, `/api/v1/admin/cron/[job_name]`
    (both GET and POST), and `/api/v1/admin/users/[id]/role` POST.
  - Plain admin still succeeds on `/api/v1/admin/users` (list),
    `/api/v1/admin/users/[id]` (detail), and ban/unban/password-reset
    endpoints.

### Task 5: Add requireSuperAdminJSON helper

- **Files:** `apps/web/src/lib/auth/server.ts` (edit)
- **What:** Add `export async function requireSuperAdminJSON(req: Request):
  Promise<AuthSession["user"] | Response>` mirroring `requireAdminJSON` at
  line 161-178. Same idle-timeout enforcement, returns
  `ApiError.forbidden("Super admin access required").toResponse()` for
  non-super_admin callers.
- **Acceptance:**
  - Helper is exported and type-checks.
  - Unit test (if a sibling test exists for `requireAdminJSON`) covers
    super_admin success + admin failure paths. If no sibling test exists,
    skip — the function is small and mirrors a tested helper.

### Task 6: Move Setup pages under /admin/settings/

- **Files:**
  - new: `apps/web/src/app/admin/settings/categories/page.tsx`
  - new: `apps/web/src/app/admin/settings/cities/page.tsx`
  - new: `apps/web/src/app/admin/settings/membership-plans/page.tsx`
  - new: `apps/web/src/app/admin/settings/sponsorship-tiers/page.tsx`
  - delete: `apps/web/src/app/admin/categories/` (whole folder, including
    any nested route files)
  - delete: `apps/web/src/app/admin/cities/`
  - delete: `apps/web/src/app/admin/membership-plans/`
  - delete: `apps/web/src/app/admin/sponsorship-tiers/`
- **What:** Move each page body verbatim into its new location. Update any
  internal links / breadcrumb hrefs / `backHref` props that point to
  `/admin/categories` etc. → `/admin/settings/categories`. Don't touch
  imports — they go through `@/server/operations/...` which doesn't move.
- **Acceptance:**
  - super_admin hitting `/admin/settings/categories` (etc.) sees the
    expected manager UI.
  - `/admin/categories` (and siblings) return Next.js 404.
  - `pnpm lint && pnpm typecheck` pass.

### Task 7: Build /admin/settings tabbed hub + App tab

- **Files:**
  - new: `apps/web/src/app/admin/settings/layout.tsx` — calls
    `requireSuperAdmin()`, renders `<SettingsTabs />` above `{children}`.
  - new: `apps/web/src/app/admin/_components/settings-tabs.tsx` — client
    component rendering 5 tab links driven by `usePathname()` (active-tab
    styling). Tabs in order: Categories, Cities, Membership plans,
    Sponsorship tiers, App.
  - rewrite: `apps/web/src/app/admin/settings/page.tsx` — replaces today's
    cards landing with a server-side `redirect("/admin/settings/categories")`.
  - new: `apps/web/src/app/admin/settings/app/page.tsx` — inlines
    `<HomepageCmsForm settings={…} />` and `<RenewalScheduleForm
    initialValue={…} initialWindows={…} />` side-by-side (or stacked on
    mobile). Data fetched via `apiServerFetch(getAppSettingsOp, { input: {} })`
    and `apiServerFetch(getReminderScheduleOp, { input: {} })` at the top of
    the page (same pattern as today's homepage/renewal-schedule pages).
  - delete: `apps/web/src/app/admin/settings/homepage/page.tsx` and folder
  - delete: `apps/web/src/app/admin/settings/renewal-schedule/page.tsx` and
    folder
- **What:** Build the tabbed hub with one route per tab. App tab inlines the
  two existing forms (Homepage CMS + Renewal schedule) so super_admins
  configure both on one page with no extra click. Old card-style
  `/admin/settings` landing is replaced by the tab redirect.
- **Acceptance:**
  - `/admin/settings` redirects to `/admin/settings/categories`.
  - Tab strip is sticky/visible across all five tabs; active tab is visually
    distinct.
  - `/admin/settings/app` renders both Homepage CMS form and Renewal
    schedule form, both submitting independently without conflict.
  - Plain admin hitting any `/admin/settings/*` URL → 404.
  - Old `/admin/settings/homepage` and `/admin/settings/renewal-schedule`
    return 404.
- **Pause if:** `HomepageCmsForm` and `RenewalScheduleForm` can't co-render
  cleanly (shared client state, conflicting submit toasts, etc.). Both should
  be self-contained — but if you find unexpected coupling, surface it rather
  than working around it.

### Task 8: Page-level super_admin gates + Users role-change UI gate

- **Files:**
  - `apps/web/src/app/admin/audit/page.tsx` (edit — single-line swap)
  - `apps/web/src/app/admin/cron/page.tsx` (edit — single-line swap)
  - `apps/web/src/app/admin/users/[id]/page.tsx` (edit — pass `callerRole`
    prop)
  - `apps/web/src/features/admin/components/user-detail.tsx` (edit —
    conditionally render role-change buttons at line 178-189)
- **What:**
  - Audit page + cron page: swap their `requireAdmin()` call →
    `requireSuperAdmin()`. No other change.
  - User detail page: read the caller's role from `requireAdmin()`'s return
    value (it's the user object — the role is on it as `caller.role`) and
    pass it down to `UserDetail`. `UserDetail` accepts a new optional
    `callerRole: string` prop; renders the role-change `<Button>`s only when
    `callerRole === "super_admin"`.
- **Acceptance:**
  - Plain admin hitting `/admin/audit` → 404. Plain admin hitting
    `/admin/cron` → 404. super_admin → both render normally.
  - Plain admin on `/admin/users/[id]`: page renders, can ban/unban/reset
    password, but role-change buttons are absent.
  - super_admin on `/admin/users/[id]`: role-change buttons render as today.

### Task 9: Sidebar role-aware grouping + separator treatment

- **Files:**
  - `apps/web/src/app/admin/_components/admin-sidebar.tsx` (edit)
  - `apps/web/src/app/admin/_components/admin-mobile-sidebar.tsx` (edit)
  - `apps/web/src/app/admin/layout.tsx` (edit — pass `admin.role` through)
- **What:** Rewrite `ADMIN_NAV` to include `requires: Permission` per row and
  `groupAfter?: "operate" | "setup"` markers between groups. New shape:
  ```
  { Dashboard, requires: "admin" }
  { Businesses, requires: "admin" }
  { Renewals, requires: "admin" }
  { Community, requires: "admin" }
  { Users, requires: "admin", groupAfter: "operate" }
  { Settings (label: "Setup"), href: "/admin/settings",
    requires: "super_admin", groupAfter: "setup" }
  { Audit log, requires: "super_admin" }
  { Cron, requires: "super_admin" }
  ```
  Remove the now-defunct `/admin/categories`, `/admin/cities`,
  `/admin/membership-plans`, `/admin/sponsorship-tiers` entries from the nav.
  `AdminSidebar` accepts `userRole: string` and filters via
  `hasPermission(userRole as Permission, row.requires)`. After each row whose
  `groupAfter` matches the visible group AND there are visible rows after,
  render a `border-t border-sidebar-border mt-3 pt-3` divider on the next
  row. `AdminMobileSidebar` accepts and forwards `userRole`. `admin/layout.tsx`
  passes `admin.role` to both.
- **Acceptance:**
  - Plain admin: sidebar shows Dashboard / Businesses / Renewals / Community
    / Users with no separators (no visible rows after Users).
  - super_admin: sees three visually-separated groups with the thin
    divider + extra padding treatment.
  - Mobile drawer matches desktop sidebar.
  - Clicking the Setup row → `/admin/settings` → redirects to Categories tab.
- **Pause if:** the `requires` filter logic interacts badly with the existing
  active-state highlighting (`isActive(href)` uses `startsWith` for non-/admin
  routes — moving routes under `/admin/settings/*` means the Setup row stays
  active for the whole hub, which is correct, but worth a sanity check).

### Task 10: Smoke-test scenarios + final verification

- **Files:** none (verification + any small fixes uncovered)
- **What:** Run through this scenario matrix with both a plain admin and a
  super_admin user (use the Replit session bootstrap + Better Auth
  bootstrap):

  As **super_admin**:
  - `/admin/settings` → redirects to `/admin/settings/categories`. ✓
  - Click each tab — all five render their tool. ✓
  - `/admin/settings/app` shows Homepage CMS + Renewal schedule forms;
    both submit independently. ✓
  - `/admin/audit` and `/admin/cron` render as before. ✓
  - `/admin/users/[id]` shows role-change buttons. ✓
  - Sidebar shows all three groups with separators. ✓

  As **plain admin**:
  - Sidebar: only Dashboard / Businesses / Renewals / Community / Users. ✓
  - Direct URL `/admin/settings`, `/admin/settings/categories`, `/admin/audit`,
    `/admin/cron` → Next.js 404. ✓
  - `/admin/users/[id]` renders; role-change buttons absent;
    ban/unban/password-reset still work. ✓
  - Direct POST to `/api/v1/admin/categories` (etc.) → 403 ApiError JSON. ✓

  Cross-cutting:
  - `pnpm typecheck`, `pnpm lint`, `pnpm test` all green.
  - No new top-level deps.
  - No new `"use server"` directives.
  - No raw `process.env` reads.
- **Acceptance:** Every checkbox above ticked. Any failure is its own
  follow-up task in this same review (don't ship partial).

## Open questions

Anything still unresolved that `/mlabs-code` should escalate, not guess.

- **JWT signing in `packages/auth`.** Task 2's Pause-if covers this — if
  `signAccessToken` doesn't already accept the wider role union, that's a
  packages/auth widening which is out-of-scope. Escalate before touching it.
- **Bootstrap super_admin pathway for fresh forks.** Not blocked by this
  review (the SUPER_ADMIN_EMAIL bootstrap hook already exists), but the
  FORK_CHECKLIST.md.template may need a one-line nudge: "Set
  SUPER_ADMIN_EMAIL before first login so the Setup hub is reachable." Defer
  to a documentation pass; not part of this work.
