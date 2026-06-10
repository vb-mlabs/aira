# Implementation: S5 — Renewal Reminder, Homepage Sponsored Sort, Sponsorship Slot Limits

**Started:** 2026-06-10 12:00
**Review:** [2026-06-10-s5-renewal-reminder-homepage-slots](../../reviews/2026-06-10-s5-renewal-reminder-homepage-slots.md)
**Branch:** feat/rest-api-migration
**Status:** in_progress

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [ ] **T1:** DB migration 0018 — max_slots on sponsorship_tier
  - Files: `packages/db/src/schema/sponsorship-tiers.ts`, migration `0018`
  - Commit: —
  - Notes: —

- [ ] **T2:** Validators — add max_slots to sponsorship-tier schemas
  - Files: `packages/validators/src/sponsorship-tiers.ts`
  - Commit: —
  - Notes: —

- [ ] **T3:** Service layer — slot enforcement + max_slots threading
  - Files: `packages/services/src/sponsorship-tiers/service.ts`, `packages/services/src/sponsorships/queries.ts`, `packages/services/src/sponsorships/service.ts`
  - Commit: —
  - Notes: —

- [ ] **T4:** Homepage sponsored sort — correlated subqueries in getFeaturedBusinesses
  - Files: `packages/services/src/businesses/queries.ts`
  - Commit: —
  - Notes: —

- [ ] **T5:** Operation — listSponsorshipTiersOp slot annotation
  - Files: `apps/web/src/server/operations/sponsorship-tiers.ts`
  - Commit: —
  - Notes: —

- [ ] **T6:** UI — slot info in Add Sponsorship dialog + Max Slots field in tier form
  - Files: `apps/web/src/features/admin/components/sponsorships-section.tsx`, `apps/web/src/app/admin/sponsorship-tiers/_components/tier-form.tsx`
  - Commit: —
  - Notes: —

- [ ] **T7:** F20 — Renewal reminder email template + cron handler
  - Files: `packages/email/src/templates/renewal-reminder.tsx` (new), `packages/email/src/templates/index.ts`, `apps/web/src/lib/email/templates.ts`, `apps/web/src/lib/cron/renewal-reminder.ts` (new), `apps/web/src/lib/cron/registry.ts`
  - Commit: —
  - Notes: —
