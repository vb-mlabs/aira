# Implementation: F23′ renewal follow-up queue

**Started:** 2026-06-15
**Review:** [2026-06-15-renewal-followup-queue](../../reviews/2026-06-15-renewal-followup-queue.md)
**Branch:** feat/rest-api-migration
**Status:** complete

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [x] **Task 1:** Schema — add `subscription_followup` table + `followup_outcome` enum
  - Files: `packages/db/src/schema/subscription-followups.ts` (new) · `packages/db/src/schema/index.ts` (edit) · migration 0023
  - Commit: 7303bb1 (preceded by 21adb61 metadata fix)
  - Notes: 0022 snapshot chain was broken; fixed in standalone chore commit before T1

- [x] **Task 2:** AuditMeta — add `business.subscription_followup` variant
  - Files: `packages/db/src/audit.ts`
  - Commit: eb0053b
  - Notes: single action kind + outcome inside metadata (matches session.revoked.reason precedent)

- [x] **Task 3:** Validators — followup schemas + subpath export
  - Files: `packages/validators/src/subscription-followups.ts` (new) · `packages/validators/src/index.ts` · `packages/validators/package.json`
  - Commit: 7201f4f
  - Notes: 9-probe runtime sanity check on superRefine passed

- [x] **Task 4:** Service — `listQueue` + `listForSubscription` queries
  - Files: `packages/services/src/subscription-followups/index.ts` · `.../queries.ts` · `packages/services/src/index.ts`
  - Commit: 1610954
  - Notes: correlated subqueries (not LATERAL); 100-row cap + on-demand COUNT(*)

- [x] **Task 5:** Service — `create` mutation (transactional INSERT + audit)
  - Files: `packages/services/src/subscription-followups/mutations.ts` · index re-export
  - Commit: b1cf318
  - Notes: pre-generated UUID, audit-before-INSERT inside one transaction

- [x] **Task 6:** Operations — `listFollowupQueueOp` + `createFollowupOp` (+ `listFollowupHistoryOp`)
  - Files: `apps/web/src/server/operations/subscription-followups.ts`
  - Commit: 5b23bc1
  - Notes: added listFollowupHistoryOp implicitly (T9 modal needs the GET; co-locating with POST at the same URL)

- [x] **Task 7:** REST routes — GET queue + GET/POST followups
  - Files: `apps/web/src/app/api/v1/admin/renewals/queue/route.ts` · `.../[subscriptionId]/followups/route.ts`
  - Commit: fc7f5ca
  - Notes: history GET co-located with POST under `[subscriptionId]/followups/route.ts`

- [x] **Task 8:** Admin page — `/admin/renewals` + queue table + window chips (read-only)
  - Files: `apps/web/src/app/admin/renewals/page.tsx` · `apps/web/src/features/admin/renewals/renewal-queue-table.tsx` · `.../window-chips.tsx`
  - Commit: cdc7ea8
  - Notes: row click sets state placeholder for T9 modal

- [x] **Task 9:** Followup modal + outcome radio group + sidebar entry
  - Files: `.../followup-modal.tsx` · `.../outcome-radio-group.tsx` · `.../renewal-queue-table.tsx` (edit) · `apps/web/src/app/admin/_components/admin-sidebar.tsx` (edit)
  - Commit: 2b0cabd
  - Notes: dropped form-reset effects — parent unmounts on close so state initializes fresh on every mount (satisfies react-hooks/set-state-in-effect cleanly)
