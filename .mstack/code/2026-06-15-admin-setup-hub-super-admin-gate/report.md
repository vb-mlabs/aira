# Implementation report: Admin sidebar consolidation + Setup hub gated behind super_admin

**Status:** complete
**Review:** [2026-06-15-admin-setup-hub-super-admin-gate](../../reviews/2026-06-15-admin-setup-hub-super-admin-gate.md)
**Branch:** feat/rest-api-migration
**Started:** 2026-06-15 16:42 UTC
**Completed:** 2026-06-15 17:05 UTC
**Commits:** 9 (T10 was verification-only)

---

## Tasks

| # | Status | Subject | Commit |
|---|--------|---------|--------|
| 1 | ✓ done | Widen Permission union in @aira/api + freshness fix | `78f5d64` |
| 2 | ✓ done | Stop role-collapse in apps/web composition root + getCallerContext | `9bcb232` |
| 3 | ✓ done | Gate Setup ops on super_admin (20 ops) | `2e472f4` |
| 4 | ✓ done | Gate audit + cron + changeRole ops on super_admin (4 ops) | `4026e7f` |
| 5 | ✓ done | Add requireSuperAdminJSON helper | `2f0e3a8` |
| 6 | ✓ done | Move Setup pages under /admin/settings/ (14 renames) | `37d2643` |
| 7 | ✓ done | Build /admin/settings tabbed hub + App tab | `4f54307` |
| 8 | ✓ done | Page-level super_admin gates + Users role-change UI gate | `723480c` |
| 9 | ✓ done | Sidebar role-aware grouping + separators | `72922d0` |
| 10 | ✓ done | Smoke-test + final verification | — |

## Commits

- `78f5d64` feat(api): widen Permission union to user|admin|super_admin with hierarchy
- `9bcb232` feat(web): preserve super_admin in OperationSession and CallerContext
- `2e472f4` feat(api): gate categories/cities/plans/sponsorships/app-settings on super_admin
- `4026e7f` feat(api): gate listAudit + changeRole + cron ops on super_admin
- `2f0e3a8` feat(web): add requireSuperAdminJSON helper
- `37d2643` feat(admin): move categories/cities/plans/tiers under /admin/settings/
- `4f54307` feat(admin): tabbed Settings hub with super_admin gate + App tab
- `723480c` feat(admin): page gates for audit/cron + hide role controls from plain admins
- `72922d0` feat(admin): role-aware sidebar with Operate/Setup/System groups

## Acceptance criteria from the review

All 14 checkboxes from the review's Acceptance section met:

- ✓ `Permission = "user" | "admin" | "super_admin"` with `hasPermission()` helper
- ✓ `defineOperation` accepts and enforces `permission: "super_admin"`; hierarchy
  preserves `permission: "admin"` accepting super_admin callers
- ✓ `OperationSession.user.role` + `CallerContext.user.role` carry the real DB role
- ✓ `requireSuperAdminJSON(req)` exists in `lib/auth/server.ts`
- ✓ `/admin/settings` is a 5-tab hub; bare `/admin/settings` redirects to
  `/admin/settings/categories`
- ✓ `/admin/settings/app` renders the App tab body with both forms inline
  (locked decision: inline, not nested)
- ✓ Old `/admin/{categories,cities,membership-plans,sponsorship-tiers}` routes
  no longer exist — Next.js 404
- ✓ Sidebar renders Operate / Setup / System groups with `border-t` + `mt-2 pt-4`
  separator treatment
- ✓ Plain admin sees only the Operate group (Setup + System rows filtered out)
- ✓ API-layer 403 enforced via `defineOperation` for all newly-gated ops
- ✓ `pnpm typecheck` passes workspace-wide (10/10 packages)
- ✓ `pnpm test` passes (47/47 api + 164/164 web)
- ✓ No new top-level deps
- ✓ No new `"use server"` directives (lefthook `check-no-server-actions`
  passed on every commit)
- ✓ No raw `process.env` reads added (lefthook lint gate passed)

## Follow-ups

- **Pre-existing lint errors** (not introduced by this run, 8 total):
  - `features/admin/community/post-detail-modal.tsx:58` — setState in effect
  - `features/admin/components/sponsorships-section.tsx:63,237` — setState in effect
  - `features/community/components/post-detail-modal.tsx:47` — setState in effect
  - `instrumentation.ts:32,33` (4 errors) — raw `process.env` access
  - These need their own commits; out of scope here.
- **Stashed work from the original session start** was popped during T1 because
  HEAD's `apps/web/src/features/admin/components/business-detail.tsx:14` imports
  `GoogleMapsPinIcon` from the stashed `social-icons.tsx`. Those edits now live
  uncommitted in the working tree — they are the GoogleMapsPinIcon swap from
  the listings social row and `business-detail.tsx`. The user should commit them
  as their own `feat(listings):` commit before pushing.
- **Bootstrap super_admin reachability** — for forks, the FORK_CHECKLIST should
  add a line about setting `SUPER_ADMIN_EMAIL` before first login so the Setup
  hub is reachable. The hook in `packages/auth/src/hooks/super-admin-bootstrap.ts`
  is the only path to super_admin in a fresh fork. Deferred.
- **JWT refresh route** (`apps/web/src/app/api/auth/refresh/route.ts:64`)
  signs the role through `signAccessToken` whose payload accepts `role: string`
  — no widening needed. Verified during T2.

## Recommended next step

`/mlabs-qa` to walk the scenario matrix from the review (plain admin vs
super_admin click-through across `/admin/settings`, `/admin/audit`,
`/admin/cron`, `/admin/users/[id]`). Focus area:

- Plain admin: sidebar reads Dashboard / Businesses / Renewals / Community /
  Users with no separators; URL-typing `/admin/settings`, `/admin/audit`,
  `/admin/cron` returns 404; user-detail page renders without the Role section.
- Super_admin: sidebar shows three visually-separated groups; tabs strip
  sticks; App tab co-renders both forms; both forms submit independently;
  role-change buttons present on user detail.
- API: a plain-admin `apiClient.post` to `/api/v1/admin/categories` (etc.)
  returns 403 `auth.forbidden` JSON.
