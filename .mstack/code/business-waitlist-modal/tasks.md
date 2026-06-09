# Implementation: Business Waitlist Sign-Up Modal

**Started:** 2026-06-08 00:00
**Review:** [business-waitlist-modal](../../reviews/2026-06-08-business-waitlist-modal.md)
**Branch:** feat/rest-api-migration
**Status:** in_progress

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [ ] **Task 1:** DB schema + migration + fix existing waitlist route
  - Files: `packages/db/src/schema/waitlist.ts`, generated migration, `apps/web/src/app/api/v1/waitlist/route.ts`
  - Commit: —
  - Notes: —

- [ ] **Task 2:** Validators — BusinessWaitlistSignupSchema
  - Files: `packages/validators/src/waitlist.ts`
  - Commit: —
  - Notes: —

- [ ] **Task 3:** Business waitlist welcome email
  - Files: `packages/email/src/templates/business-waitlist-welcome.tsx` (new), `packages/email/src/templates.tsx`, `apps/web/src/lib/email/templates.ts`
  - Commit: —
  - Notes: —

- [ ] **Task 4:** POST /api/v1/business-waitlist route
  - Files: `apps/web/src/app/api/v1/business-waitlist/route.ts` (new)
  - Commit: —
  - Notes: —

- [ ] **Task 5:** Frontend — Get Listed Early form modal
  - Files: `apps/web/src/components/marketing/business-cta-pair.tsx`
  - Commit: —
  - Notes: —
