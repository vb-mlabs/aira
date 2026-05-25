# Review: Stripe webhook route + e2e auth fixture (template-hardening followup)

**Date:** 2026-05-24
**Slug:** 2026-05-24-stripe-route-and-e2e-fixture
**Plan reviewed:** [2026-05-24-stripe-route-and-e2e-fixture.md](../plans/2026-05-24-stripe-route-and-e2e-fixture.md)
**Status:** approved
**Reviewer:** Claude (with Vbhadala)
**UI-Significant:** no

---

## Summary

Plan is approved with **5 reviewer decisions** locked (smoke spec target,
stripe-webhook-setup description rebrand, chromium-project testIgnore,
explicit `runtime = "nodejs"` on the Stripe route, sharpened T2 acceptance).
No blockers, no scope changes. Net change: 5 atomic tasks plus a sharpened
acceptance table. Critique came from reading the actual hat-yai protected
routes (`(app)/notifications/page.tsx`, etc.) vs the plan's deferred "read
at /mlabs-code time" guidance — pinning the target route now removes a
soft spot in T4.

## Findings

### Blockers (must fix before /mlabs-code)

None.

### Concerns (raised, decided, recorded)

- **Concern A — smoke spec target route was not specified.** The plan said
  "/mlabs-code will read `home.spec.ts` at task time and pick a stable
  locator", but `home.spec.ts` is the *unauthed* marketing smoke (asserts
  brand wordmark + "Get started" / "Sign in" CTAs). Authed smoke needs a
  *protected* route. hat-yai's `(app)/layout.tsx` calls `requireUser()` →
  any `(app)/*` page either renders or redirects to `/login`.
  **Decision:** target `/notifications` (most stable; pre-existing in the
  template; layout always renders the brand link + `SignOutButton`).
  Assertions:
    - `await expect(page).toHaveURL(/\/notifications$/)` — proves no
      redirect to `/login`.
    - `await expect(page.getByRole("link", { name: brand.name }).first()).toBeVisible()` —
      proves the `(app)/layout.tsx` shell rendered.
    - `await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible()` —
      proves the layout's auth-aware chrome rendered.
  Import `brand` from `@mlabs/config` (matches `home.spec.ts` pattern).

- **Concern B — `scripts/stripe-webhook-setup.ts` hardcodes
  `description: "BetFrnd app — wallet top-up + payment lifecycle"`** in
  the `stripe.webhookEndpoints.create` call. Template can't ship that
  string. Importing `@mlabs/config` from a root-level tsx script is
  awkward (workspace package resolution at the root needs `--filter` or
  hoist tricks).
  **Decision:** Hardcode a generic string `"MLabs template — Stripe
  webhook"` in the template. Forks edit it after `pnpm rename` if they
  care (the description is informational only — Stripe doesn't use it
  for routing or auth). Add a one-line comment above the call:
  `// Forks: customize this description if you want it to match your brand.`

- **Concern C — Playwright `chromium` project may accidentally run
  `*.authed.spec.ts` without storageState.** Default Playwright spec
  match is `**/*.spec.ts`; `authed-smoke.authed.spec.ts` matches that
  glob. Without `testIgnore`, the `chromium` project would try to run
  the smoke against an unauthed page, get redirected to `/login`, and
  fail the URL assertion. The `authed` project's `testMatch:
  "**/*.authed.spec.ts"` only narrows that project — it doesn't exclude
  matches from sibling projects.
  **Decision:** add `testIgnore: ["**/*.authed.spec.ts"]` to the
  `chromium` project in `playwright.config.ts`. Symmetric and explicit.

- **Concern D — Stripe route doesn't pin `runtime`.** Next 16 may
  auto-select the edge runtime for routes whose code looks
  edge-compatible. The Stripe route uses the Stripe SDK (Node-only crypto
  for HMAC) AND `db` (`neon-serverless` WebSocket Pool needs Node `ws`).
  Auto-edge would 500 on first delivery.
  **Decision:** add `export const runtime = "nodejs"` at the top of
  `route.ts`. Cheap, explicit, future-proof against Next runtime-detection
  changes.

- **Concern E — T2 acceptance criterion was hand-wavy** ("runs end-to-end
  against `STRIPE_SECRET_KEY=sk_test_invalid`"). Two distinct error paths
  matter: missing env vs invalid credential.
  **Decision:** split T2 acceptance into two checkable assertions
  (see Implementation plan below).

### Suggestions (taken or deferred)

- **Taken:** Keep `playwright.config.ts` `webServer.command` as
  `"SKIP_ENV_VALIDATION=1 pnpm dev"`. The dev server doesn't need DB to
  boot; globalSetup loads env independently via `@next/env`'s
  `loadEnvConfig` before importing `@/lib/db`. Verified BetFrnd's pattern
  works the same way.
- **Taken:** Nested `apps/web/e2e/.auth/.gitignore` (not root-level
  `.gitignore` entry). Lets globalSetup `mkdirSync` safely without
  guarding for the dir's presence; the dir is tracked, the cookie blob
  isn't.
- **Taken:** `scripts/stripe-webhook-setup.ts` lives at root `scripts/`
  matching the `scripts/email-smoke.ts` precedent (T15).
- **Taken:** `tsx` invocation stays as plain `tsx scripts/stripe-webhook-setup.ts`
  (no `--conditions=react-server` needed — the script only imports
  `stripe`, no `@mlabs/services` server-only modules).
- **Deferred:** Test-user factory (`createTestUser({ overrides })`). Not
  needed for the smoke spec; pick it up when a second authed spec
  actually needs per-test isolation.

## Decisions locked

1. **Smoke spec target = `/notifications`** with 3 assertions (URL
   stay-put + brand-link visible + sign-out-button visible).
2. **Stripe webhook description = `"MLabs template — Stripe webhook"`**
   (generic; fork-editable; one-line comment above the call).
3. **`chromium` project gets `testIgnore: ["**/*.authed.spec.ts"]`**.
4. **Stripe route declares `export const runtime = "nodejs"`** at top.
5. **T2 acceptance splits** into two assertions:
   - `STRIPE_SECRET_KEY` unset → exit 1, stderr contains
     `"STRIPE_SECRET_KEY is required."`
   - `STRIPE_SECRET_KEY=sk_test_invalid` → exit 1, stderr contains a
     Stripe authentication error (e.g. `"Invalid API Key provided"`).
6. **Cookie cleanup strategy:** `DELETE FROM user WHERE id =
   E2E_TEST_USER.id` (BetterAuth ON DELETE CASCADE handles session +
   account). No `LIKE` patterns — hat-yai's user table has no `username`
   column.

## Implementation plan

5 atomic tasks. `/mlabs-code` executes top-to-bottom, one commit per
task, no `--no-verify`, never amend across tasks.

### Task 1: Add Stripe webhook route

- **Files:** `apps/web/src/app/api/stripe/webhook/route.ts` (new)
- **What:** Port BetFrnd's `apps/web/src/app/api/stripe/webhook/route.ts`
  verbatim with two changes:
  - Replace `import { … } from "@betfrnd/services/billing"` with
    `import { … } from "@mlabs/services/billing"`.
  - Add `export const runtime = "nodejs"` at the top of the file
    (above the imports if Next allows, otherwise just after — Next
    accepts the export anywhere at module top level).
- **Acceptance:**
  - File exists with imports from `@mlabs/services/billing` only (zero
    `@betfrnd` matches via `grep -c "@betfrnd" apps/web/src/app/api/stripe/webhook/route.ts`).
  - `pnpm --filter @mlabs/web typecheck` clean.
  - `pnpm --filter @mlabs/web build` produces the route under
    `.next/standalone/apps/web/.next/server/app/api/stripe/webhook/route.js`.

### Task 2: Add Stripe webhook setup script

- **Files:** `scripts/stripe-webhook-setup.ts` (new) · `package.json` (edit)
- **What:**
  - Port BetFrnd's `scripts/stripe-webhook-setup.ts` with one change:
    replace `description: "BetFrnd app — wallet top-up + payment
    lifecycle"` with `description: "MLabs template — Stripe webhook"`.
    Add a one-line comment above the call:
    `// Forks: customize this description after running pnpm rename.`
  - Add `"stripe:webhook-setup": "tsx scripts/stripe-webhook-setup.ts"`
    to root `package.json` `scripts`, alphabetised next to the existing
    `email:smoke` entry.
- **Acceptance:**
  - `pnpm stripe:webhook-setup` with no env set → exits 1; stderr
    contains `"STRIPE_SECRET_KEY is required."`.
  - `STRIPE_SECRET_KEY=sk_test_invalid pnpm stripe:webhook-setup --list`
    → exits 1; stderr contains a Stripe authentication error string
    (e.g. `"Invalid API Key"` or `"authentication"`).
  - File has zero `@betfrnd` / "BetFrnd" references (`grep`).

### Task 3: Add E2E auth fixture infrastructure

- **Files:**
  - `apps/web/e2e/support/auth.ts` (new)
  - `apps/web/e2e/global-setup.ts` (new)
  - `apps/web/e2e/.auth/.gitignore` (new — contents: `*\n!.gitignore\n`)
  - `apps/web/playwright.config.ts` (edit)
  - `apps/web/package.json` (edit — `"e2e"` script)
- **What:**
  - `support/auth.ts`: adapt BetFrnd's. Constants:
    ```ts
    export const E2E_TEST_USER = {
      id: "00000000-0000-4000-8000-000000000001",
      name: "E2E Primary",
      email: "e2e-test-primary@mlabs.test",
      password: "e2e-test-password",
    } as const

    export const STORAGE_STATE_PATH = join(__dirname, "..", ".auth", "user.json")
    ```
    Drop the BetFrnd `username` field. Keep the verbatim "DB ACCESS
    FROM SPECS" warning comment (it's load-bearing — explains why
    specs use raw `Pool` + SQL instead of `@mlabs/db/schema`).
  - `global-setup.ts`: adapt BetFrnd's. Strip:
    - `import { wallet as walletTable } from "@betfrnd/db/schema"`
    - `walletTable` insert block + `E2E_STARTING_BALANCE_VC` const
    - `username: …` and `isOver18: …` fields on the user insert
    - `like` import (no longer needed without LIKE cleanup)
    Replace cleanup `like(userTable.username, "e2e-test-%")` with
    `eq(userTable.id, E2E_TEST_USER.id)` (`import { eq } from "drizzle-orm"`).
    Replace `@betfrnd/db/schema` import with `@mlabs/db/schema`.
    Keep verbatim: the env load via `@next/env`, the cookie-name
    HTTPS-conditional regex + comment, the E2E_BASE_URL handling, the
    storageState write to `STORAGE_STATE_PATH`.
  - `apps/web/e2e/.auth/.gitignore`: tiny file, contents `*\n!.gitignore\n`
    so the dir stays tracked but `user.json` doesn't.
  - `playwright.config.ts`: add `globalSetup: "./e2e/global-setup.ts"`
    to the top-level config. Add `testIgnore: ["**/*.authed.spec.ts"]`
    to the existing `chromium` project. Add a second project:
    ```ts
    {
      name: "authed",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "./e2e/.auth/user.json",
      },
      testMatch: "**/*.authed.spec.ts",
    }
    ```
  - `apps/web/package.json`: change `"e2e": "playwright test"` →
    `"e2e": "NODE_OPTIONS=--conditions=react-server playwright test"`.
- **Acceptance:**
  - All 5 file changes land in one commit.
  - `pnpm --filter @mlabs/web typecheck` clean.
  - `grep -r "@betfrnd" apps/web/e2e/` returns zero matches.
  - `grep -r "username\|isOver18\|wallet" apps/web/e2e/global-setup.ts
    apps/web/e2e/support/auth.ts` returns zero matches (other than
    `// no LIKE-by-username cleanup` if a clarifying comment was added).
  - `apps/web/e2e/.auth/.gitignore` exists with correct contents.
- **Pause if:** `@mlabs/auth/server`'s `auth.handler` signature
  differs from BetFrnd's — e.g. doesn't accept a `Request` object or
  doesn't return a `Response` with `getSetCookie`. The plan assumes
  parity with BetFrnd (same BetterAuth version), but verify by
  running the fixture once before declaring T3 done.

### Task 4: Add authed smoke spec

- **Files:** `apps/web/e2e/authed-smoke.authed.spec.ts` (new)
- **What:** Tiny spec that proves the fixture works end-to-end:
  ```ts
  import { test, expect } from "@playwright/test"
  import { brand } from "@mlabs/config"

  test("authed user lands on /notifications without redirect", async ({ page }) => {
    await page.goto("/notifications", { waitUntil: "domcontentloaded" })

    // No redirect to /login — the session cookie was accepted.
    await expect(page).toHaveURL(/\/notifications$/)

    // (app) layout chrome rendered.
    await expect(
      page.getByRole("link", { name: brand.name }).first(),
    ).toBeVisible()
    await expect(
      page.getByRole("button", { name: /sign out/i }),
    ).toBeVisible()
  })
  ```
- **Acceptance:**
  - File exists.
  - With `DATABASE_URL` + `BETTER_AUTH_SECRET` set, running
    `pnpm --filter @mlabs/web e2e --project=authed` triggers
    globalSetup, runs the smoke, and reports 1 passed.
  - The dev server stays up the whole run (no crash during
    instrumentation hook or middleware boot).
- **Pause if:** the assertion `page.getByRole("button", { name:
  /sign out/i })` doesn't match because `_components/sign-out-button.tsx`
  renders a non-button element or a differently-labelled button. Read
  that file first and use the actual accessible name.

### Task 5: Verification + implementation report

- **Files:** `.mstack/implementations/2026-05-24-stripe-route-and-e2e-fixture/{tasks.md,log.md,report.md}` (new) · plan status flip
- **What:**
  - Workspace acceptance gates:
    - `pnpm typecheck` clean (all 10 packages).
    - `pnpm test` green at HEAD (no regressions in services tests).
    - `pnpm --filter @mlabs/web build` clean; Stripe route appears in
      the standalone bundle (`find apps/web/.next/standalone -path "*api/stripe*"`).
  - Write the implementation report per
    `.claude/skills/mlabs-code/SKILL.md` final-report contract.
  - Flip the plan's `Status:` from `reviewed` → `implemented`.
  - Append a learning if anything non-obvious surfaced during the run
    (e.g. `auth.handler` shape mismatch, dev server flake, etc.).
- **Acceptance:** Report at
  `.mstack/implementations/2026-05-24-stripe-route-and-e2e-fixture/report.md`
  with status `complete`; plan status reflects `implemented`.
- **Pause if:** any acceptance gate fails. Write a follow-up plan stub
  and stop.

### Commit ordering (locked)

T1 → T2 → T3 → T4 → T5

Rationale: T1 (Stripe route) and T2 (setup script) are independent of
each other and of T3/T4 (e2e fixture). T3 must land before T4 (T4
needs the fixture wiring to run). T5 is always last.

## Open questions

For `/mlabs-code` to escalate if encountered (not guess):

1. **`auth.handler` signature drift.** If `@mlabs/auth/server`'s
   `createAuth` doesn't expose `.handler` or expects different inputs,
   the globalSetup will fail at runtime. Verify in T3 via a one-shot
   `npx tsx -e 'import { auth } from "..."; console.log(typeof
   auth.handler)'` if uncertain.
2. **BetterAuth cookie domain on Replit.** The fixture's
   `E2E_BASE_URL` handling supports both HTTP loopback (default) and
   HTTPS Replit. If a fork runs e2e on Replit, pass
   `E2E_BASE_URL=https://$REPLIT_DEV_DOMAIN`. Documented in the
   support/auth.ts comment; no code change needed.
3. **Smoke spec sign-out-button accessible name.** Read
   `apps/web/src/app/(app)/_components/sign-out-button.tsx` before
   committing T4 to confirm the button's accessible name actually
   matches `/sign out/i`. If it's an icon-only button without a label,
   pick a different stable signal (e.g. the user's `name` in a header).

## Source-of-truth references

- BetFrnd repo: `/Users/VB/conductor/workspaces/mlabs/betfrnd-readonly/`
- BetFrnd Stripe route: `apps/web/src/app/api/stripe/webhook/route.ts`
- BetFrnd setup script: `scripts/stripe-webhook-setup.ts`
- BetFrnd e2e:
  - `apps/web/e2e/support/auth.ts`
  - `apps/web/e2e/global-setup.ts`
  - `apps/web/e2e/authed-smoke.authed.spec.ts` (structure reference;
    the actual assertions differ for the template)
  - `apps/web/playwright.config.ts` (project shape reference)
- Template precedents:
  - `scripts/email-smoke.ts` (T15) — `tsx` script at root pattern
  - `apps/web/src/middleware.ts` (T13) — matcher excludes `/api/stripe/*`
  - `apps/web/src/lib/db/index.ts` (T5) — exports `db` from `@mlabs/db/client`
  - `apps/web/src/lib/auth/index.ts` (T3) — exports `auth` with REPLIT_DEV_DOMAIN fallback
  - `packages/services/src/billing/{stripe-client,webhook}.ts` (T8) —
    `getStripe`, `handleStripeEvent` exports
  - `packages/db/src/schema/webhook_event.ts` (T7) — idempotency table
- Related ADR: `docs/decisions/0008-codebase-conventions.md`
  (convention #7: one webhook URL = many event types)
