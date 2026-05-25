# QA report — 2026-05-24 13:33

**Focus:** Email flows (React Email refactor): signup → verify-email, password reset, /_dev/emails preview
**Env:** localhost:3000 (existing Next.js dev server, PID 73313, started 10:39am)
**Status:** partial (1 fixed, 1 fixed-in-spec, 1 paused — needs DATABASE_URL)
**Tester:** /mlabs-qa
**Run dir:** `.mstack/qa/2026-05-24-1333/`

## Scenarios run

1. **/_dev/emails preview route renders 3 templates** — ❌ fail (route 404s)
2. **Signup → "Check your email"** — ❌ fail (test selector ambiguity + downstream 500 from pre-existing env bug)
3. **Forgot password → "Check your email"** — ❌ fail (500 from pre-existing env bug)
4. **/_dev/emails returns 404 in production** — ⊘ deferred (route is 404 in dev too — see Issue 1; production behaviour is moot until Issue 1 is fixed)

## Issues

### Issue 1 — critical, OUR REGRESSION

**Title:** `/_dev/emails` route is unreachable — Next.js's `_folder` private-folder convention excludes it from routing.

- **Severity:** critical
- **Repro:**
  1. `curl -i http://localhost:3000/_dev/emails`
  2. Observe `HTTP 404 Not Found`
- **Expected:** Page renders three template iframes; Task 7 in the implementation report claims this works.
- **Actual:** Next.js 404 page. The handler in `apps/web/src/app/_dev/emails/page.tsx` never executes.
- **Console errors:** none for this route (404 is silent)
- **Suspected cause:** Next.js App Router treats any folder prefixed with `_` as a *private* folder excluded from routing (see Next.js project structure docs). The implementation plan and review both picked `/_dev/emails` without verifying the convention. The pre-existing `_dev/messages` and `_dev/notifications` seed pages have **the same latent bug** — they also 404, and `marketing-footer.tsx` ships broken links to them.
- **Affected files:**
  - `apps/web/src/app/_dev/emails/page.tsx` (our regression)
  - `apps/web/src/app/_dev/messages/page.tsx` (pre-existing latent)
  - `apps/web/src/app/_dev/notifications/page.tsx` (pre-existing latent)
  - `apps/web/src/app/_dev/states/page.tsx` (pre-existing latent)
  - `apps/web/src/components/marketing/marketing-footer.tsx` (links to 3 broken paths)
  - `apps/web/src/components/marketing/feature-grid.tsx` (we just shipped copy saying "preview them live at /_dev/emails")
  - `docs/handover/postmark-templates.md` (we just shipped docs pointing at `/_dev/emails`)
- **Fix plan:** rename `apps/web/src/app/_dev/` → `apps/web/src/app/dev/`. Update the 3 footer links + our 2 docs/copy references to `/dev/...`. No code inside the page modules changes. (The footer also has a copy mistake at line 14 — `/_dev/messages` labelled "Email previews" but it's actually the chat seed page — flag but don't fix here, that's out of QA scope.)
- **Status:** ✓ fixed (commit `a4da8ab`). Re-verified: `curl -sI http://localhost:3000/dev/emails` → `200 OK`; Playwright Scenario 1 → ✓ pass in 1.4s. Screenshot: `assets/scenario-1-dev-emails.png`.

### Issue 2 — minor, OUR TEST ONLY

**Title:** QA spec selector `getByLabel("Password")` matches both the password input AND the "Show password" toggle button.

- **Severity:** low (test-only, no product impact)
- **Repro:** run scenario 2 — Playwright error `strict mode violation: getByLabel('Password') resolved to 2 elements`.
- **Expected:** selector resolves to the input field only.
- **Actual:** matches both the `<input id="password">` and the `<button aria-label="Show password">` because both have "Password" in their accessible name.
- **Suspected cause:** `apps/web/packages/ui-web/password-input.tsx` (the `PasswordInput` component) renders both as siblings.
- **Fix plan:** in the QA spec, replace `page.getByLabel("Password")` with `page.locator('input#password')` or `page.getByRole("textbox", { name: "Password" })`.
- **Status:** ✓ fixed in spec (no commit — QA-internal). Will surface a real signup verdict once Issue 3 is resolved.

### Issue 3 — out-of-scope (pre-existing env misconfiguration), NOT OUR REGRESSION

**Title:** `POST /api/auth/sign-up/email` and `POST /api/auth/request-password-reset` both return 500 — pre-existing `DATABASE_URL` not set in dev env.

- **Severity:** critical (blocks all auth flows in this dev env) BUT pre-existing
- **Repro:**
  1. `curl -X POST http://localhost:3000/api/auth/request-password-reset -H 'Content-Type: application/json' -d '{"email":"x@y.com"}'`
  2. Observe `HTTP 500` with empty body
- **Actual server log:** `ERROR [Better Auth]: DATABASE_URL is required to query the database. Set it in .env.local. (SKIP_ENV_VALIDATION=1 only gates the env validator, not the runtime.)`
- **Suspected cause:** `.env.local` is missing in `apps/web/`. The error is raised in `lib/db/` (or its caller) before the React Email pipeline is ever invoked. This 500 would happen with or without the React Email refactor.
- **Implication for our QA:** the React Email render pipeline cannot be exercised end-to-end in this dev environment. We confirmed via unit tests in the implementation phase (`apps/web/tests/email.test.ts`, 6/6 passing) that render works correctly with a recording driver; live verification requires either a working DB or a stub for `getEmailDriver()` that returns a recording driver in dev.
- **Fix plan:** out of scope for this QA. The user (or `/mlabs-debug`) should add a `DATABASE_URL` (or a `.env.local` with one) and re-run signup/reset flows. **Recommend deferring.**
- **Status:** ⏸ paused (user opted to provision DATABASE_URL themselves; will re-run signup/reset flows after). Pre-existing, not introduced by the React Email refactor.

## Summary

- **Total:** 3 issues
- **Critical (our regression):** 1 (Issue 1 — `_dev/` private folder)
- **Critical (pre-existing, deferred):** 1 (Issue 3 — DATABASE_URL missing)
- **Low (test-only):** 1 (Issue 2 — selector ambiguity)

The React Email refactor work (the actual subject of this QA) is **rendering-correct** per the unit tests and **does not introduce the 500s** — those are pre-existing. Issue 1 (preview route + landing copy + handover docs pointing at an unreachable path) is now fixed and re-verified live at `/dev/emails`.

## Outcome

- **Issue 1** ✓ fixed in commit `a4da8ab` and re-verified (200 OK, Playwright passes)
- **Issue 2** ✓ fixed in the QA spec (test-only, no source commit)
- **Issue 3** ⏸ paused (needs `DATABASE_URL`; pre-existing, not our regression)

## Recommended next step

Once you've added `DATABASE_URL` to `apps/web/.env.local`, re-run:

```
npx playwright test --config=.mstack/qa/2026-05-24-1333/playwright.qa.config.ts --reporter=list
```

That will exercise signup → verify-email and forgot-password → reset-password end-to-end through the new React Email pipeline. If those still 500 after the DB is in place, escalate with `/mlabs-debug --from-qa 2026-05-24-1333`.
