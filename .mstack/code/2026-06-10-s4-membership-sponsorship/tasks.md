# Implementation: S4 — Membership, Sponsorship, sponsored sort

**Started:** 2026-06-10 00:00
**Review:** [2026-06-10-s4-membership-sponsorship](../../reviews/2026-06-10-s4-membership-sponsorship.md)
**Branch:** feat/rest-api-migration
**Status:** in_progress

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [ ] **Task 1:** Drizzle schemas + migration 0017
  - Files: packages/db/src/schema/{membership-plans,business-subscriptions,sponsorship-tiers,sponsorships,cron-runs}.ts + index.ts + migration
  - Commit: —
  - Notes: —

- [ ] **Task 2:** Validators
  - Files: packages/validators/src/{membership-plans,business-subscriptions,sponsorship-tiers,sponsorships}.ts + index.ts + package.json
  - Commit: —
  - Notes: —

- [ ] **Task 3:** AuditMeta extension
  - Files: packages/db/src/audit.ts
  - Commit: —
  - Notes: —

- [ ] **Task 4:** Service layer — membership_plans + business_subscriptions
  - Files: packages/services/src/{membership-plans,business-subscriptions}/{queries,service,index}.ts + src/index.ts
  - Commit: —
  - Notes: —

- [ ] **Task 5:** Service layer — sponsorship_tiers + sponsorships + cron_runs
  - Files: packages/services/src/{sponsorship-tiers,sponsorships,cron}/{queries,service?,index}.ts + src/index.ts
  - Commit: —
  - Notes: —

- [ ] **Task 6:** Visibility gate + sponsored sort in businesses/queries.ts
  - Files: packages/services/src/businesses/queries.ts
  - Commit: —
  - Notes: —

- [ ] **Task 7:** Payment-evidence pipeline + admin operations
  - Files: apps/web/src/features/admin/server/evidence-pipeline.ts + apps/web/src/server/operations/{membership-plans,business-subscriptions,sponsorship-tiers,sponsorships,cron-admin}.ts
  - Commit: —
  - Notes: —

- [ ] **Task 8:** Route handlers + CSV export
  - Files: apps/web/src/app/api/v1/admin/* (many new routes)
  - Commit: —
  - Notes: —

- [ ] **Task 9:** Cron registry + wire-up via instrumentation.ts
  - Files: apps/web/src/lib/cron/{registry,sponsorship-status-rollover,subscription-status-rollover}.ts + instrumentation.ts + root package.json
  - Commit: —
  - Notes: —

- [ ] **Task 10:** Admin Membership Plans CRUD pages
  - Files: apps/web/src/app/admin/membership-plans/{page,new/page,[id]/page,_components/plan-form}.tsx
  - Commit: —
  - Notes: —

- [ ] **Task 11:** Admin Sponsorship Tiers CRUD pages
  - Files: apps/web/src/app/admin/sponsorship-tiers/{page,new/page,[id]/page,_components/tier-form}.tsx
  - Commit: —
  - Notes: —

- [ ] **Task 12:** Subscriptions + Sponsorships sections on business edit page
  - Files: apps/web/src/features/admin/components/{subscriptions-section,sponsorships-section}.tsx + business-detail.tsx
  - Commit: —
  - Notes: —

- [ ] **Task 13:** Admin Businesses list — Subscription column + renewing filter + CSV button
  - Files: apps/web/src/app/admin/businesses/page.tsx + _components/renewing-filter.tsx + server/operations/businesses-admin.ts
  - Commit: —
  - Notes: —

- [ ] **Task 14:** Admin Cron page + sidebar nav + roadmap update
  - Files: apps/web/src/app/admin/cron/{page,_components/run-now-button}.tsx + admin-sidebar.tsx + roadmap.md
  - Commit: —
  - Notes: —
