# Implementation: F22 audit log UI (minimal scope)

**Started:** 2026-06-15
**Review:** [2026-06-15-audit-log-ui](../../reviews/2026-06-15-audit-log-ui.md)
**Branch:** feat/rest-api-migration
**Status:** complete

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [x] **Task 1:** Extract AuditMeta + KNOWN_AUDIT_ACTIONS + KNOWN_AUDIT_TARGET_TYPES to validators
  - Files: `packages/validators/src/audit-meta.ts` (new) · validators index + package.json · `packages/db/src/audit.ts` (edit — re-export) · `packages/db/package.json` (added @aira/validators workspace dep)
  - Commit: 7600c3d
  - Notes: discovered db package didn't depend on validators — added it. Two compile-time assertions for bidirectional coverage.

- [x] **Task 2:** Extend `listAudit` filters + LEFT JOINs + validator schema
  - Files: `packages/validators/src/admin.ts` · `packages/services/src/admin/queries.ts`
  - Commit: 3b148e3
  - Notes: Drizzle accepted `leftJoin(table, and(eq(target_type, X), eq(target_id, t.id)))` directly; no fallback to correlated subqueries needed. target_business_id surfaces via COALESCE.

- [x] **Task 3:** Renderer helpers + AuditTable wiring
  - Files: `apps/web/src/features/admin/audit/render-detail.tsx` (new) · `.../render-target.tsx` (new) · `.../index.ts` (new) · `apps/web/src/features/admin/components/audit-table.tsx` (edit)
  - Commit: 6504604
  - Notes: had to drop redundant inner `_exhaustive: never` guards inside the nested switches (session.revoked, user.signed_in_failed) — TS proved the inner switches exhaustive so `m.reason` became `never`, causing tsc to reject the assignment. Outer-switch never guard remains.

- [x] **Task 4:** FilterBar + ActorTypeahead + page wiring
  - Files: `.../actor-typeahead.tsx` (new) · `.../filter-bar.tsx` (new) · `audit/index.ts` (edit) · `apps/web/src/features/admin/index.ts` (edit) · `apps/web/src/app/admin/audit/page.tsx` (edit)
  - Commit: d2723e8
  - Notes: hit react-hooks/set-state-in-effect on the typeahead's debounce reset; fixed by moving the `setResults([])` reset inside the setTimeout's async closure (consistent with the F23′ T9 fix pattern).
