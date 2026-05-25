# Implementation: Stripe webhook route + e2e auth fixture

**Started:** 2026-05-24
**Review:** [2026-05-24-stripe-route-and-e2e-fixture](../../reviews/2026-05-24-stripe-route-and-e2e-fixture.md)
**Branch:** Vbhadala/incorporate-fork-learnings
**Status:** complete

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [ ] **T1:** Add Stripe webhook route (with `runtime = "nodejs"`)
  - Files: `apps/web/src/app/api/stripe/webhook/route.ts` (new)
  - Commit: —

- [ ] **T2:** Add Stripe webhook setup script
  - Files: `scripts/stripe-webhook-setup.ts` (new), `package.json` (edit)
  - Commit: —

- [ ] **T3:** Add e2e auth fixture infrastructure
  - Files: `apps/web/e2e/support/auth.ts` (new), `apps/web/e2e/global-setup.ts` (new), `apps/web/e2e/.auth/.gitignore` (new), `apps/web/playwright.config.ts` (edit), `apps/web/package.json` (edit)
  - Commit: —

- [ ] **T4:** Add authed smoke spec
  - Files: `apps/web/e2e/authed-smoke.authed.spec.ts` (new)
  - Commit: —

- [ ] **T5:** Verification + implementation report
  - Files: `.mstack/code/2026-05-24-stripe-route-and-e2e-fixture/report.md`
  - Commit: —
