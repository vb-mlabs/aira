# Run log

- 2026-06-15 16:42 UTC — pre-flight passed. Stashed unrelated GoogleMapsPinIcon edits. Branch: feat/rest-api-migration.
- 2026-06-15 16:46 UTC — T1 commit 78f5d64. Permission widened; 47/47 api tests pass. Discovered HEAD apps/web typecheck depended on the stashed GoogleMapsPinIcon export (admin/business-detail.tsx:14 imports it), so popped the stash to restore a typecheckable workspace; those edits now ride along with future tasks.
- 2026-06-15 16:50 UTC — T2 commit 9bcb232. Role-collapse stopped in operations/index.ts:33 + getCallerContext:108-116. signAccessToken accepts role:string — no packages/auth widening needed.
- 2026-06-15 16:54 UTC — T3 commit 2e472f4. 20 Setup ops gated (5 categories + 3 cities + 4 plans + 4 tiers + 4 app-settings).
- 2026-06-15 16:56 UTC — T4 commit 4026e7f. 4 ops tightened: listAudit, changeRole, listCronRuns, triggerCronRun. Kept ban/unban/reset/notify on admin.
- 2026-06-15 16:57 UTC — T5 commit 2f0e3a8. requireSuperAdminJSON added.
- 2026-06-15 16:59 UTC — T6 commit 37d2643. 14 file renames via git mv + 3 feature components + 4 list pages. Bumped relative path for AdminPageHeader (../_components → ../../_components). Sidebar links left for T9.
- 2026-06-15 17:01 UTC — T7 commit 4f54307. Tabbed Settings hub, App tab with co-rendered Homepage+Renewal forms. Old homepage/renewal-schedule sub-folders deleted.
- 2026-06-15 17:03 UTC — T8 commit 723480c. requireSuperAdmin on audit/cron pages; UserDetail accepts callerRole and gates the Role section.
- 2026-06-15 17:04 UTC — T9 commit 72922d0. Sidebar rewrite: 3 groups, startsGroup separator, role-based filtering via hasPermission.
- 2026-06-15 17:05 UTC — T10 verification: typecheck ✓ workspace-wide, tests ✓ (47 api + 164 web), lint: 8 pre-existing errors in untouched files only. Run complete.
