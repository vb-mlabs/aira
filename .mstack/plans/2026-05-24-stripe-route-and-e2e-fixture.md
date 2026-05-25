# Plan: Stripe webhook route + e2e auth fixture (template-hardening followup)

**Date:** 2026-05-24
**Slug:** 2026-05-24-stripe-route-and-e2e-fixture
**Status:** implemented — see `.mstack/code/2026-05-24-stripe-route-and-e2e-fixture/report.md`
**Author:** Vbhadala (with Claude)

---

## Problem

The 2026-05-23 template-hardening initiative shipped the *primitives* but
left two real gaps that the next fork would have to rediscover:

1. **No Stripe webhook route.** T8 shipped `@mlabs/services/billing`
   (`getStripe`, `handleStripeEvent`, the `webhook_event` idempotency
   table) but never the Next.js route that calls it.
   `apps/web/src/app/api/stripe/webhook/route.ts` doesn't exist. The
   primitives are unreachable from Stripe deliveries until someone writes
   ~70 lines of glue per fork.
2. **No authed Playwright fixture.** hat-yai's `apps/web/e2e/` has 5 specs
   (admin, home, messages, notifications, profile) but no `global-setup.ts`,
   no `support/auth.ts`, no `authed` project in `playwright.config.ts`.
   Any spec that needs a logged-in user has to mint a BetterAuth-signed
   cookie from scratch — the same problem BetFrnd burned through 6
   sprints solving (learnings #14, #15, #18, #19, #20, #46).

The template-hardening QA report (2026-05-23-2051) called these out as
"recommended next step" deferrals. Picking them up now keeps the momentum
and means the next MVP fork inherits both fixes on day-one.

**Who benefits:** every future MVP fork. The first fork to wire Stripe
saves ~1 day; the first fork to write an authed e2e test saves ~3–5 days
(cookie format spelunking is brutal).

## Scope

### In

1. **Stripe webhook route** — `apps/web/src/app/api/stripe/webhook/route.ts`
   reading raw body, verifying HMAC, calling `handleStripeEvent`. Returns
   200/400/500 per Stripe retry semantics. ~70 LOC.
2. **Stripe webhook setup script** — port BetFrnd's
   `scripts/stripe-webhook-setup.ts` (already generic: list/create/rotate
   subcommands, prints `whsec_…` for copy-paste to env). Add
   `pnpm stripe:webhook-setup` to root `package.json`.
3. **E2E auth fixture infrastructure**:
   - `apps/web/e2e/support/auth.ts` — `E2E_TEST_USER` constants +
     `STORAGE_STATE_PATH`. Adapted from BetFrnd: drop `username` field
     (hat-yai user table doesn't have it), use stable UUID + email
     `e2e-test-primary@mlabs.test`, cleanup by `id` rather than
     `username LIKE`.
   - `apps/web/e2e/global-setup.ts` — Playwright globalSetup that
     cleans + creates the test user via Drizzle, then mints a
     BetterAuth-signed cookie via `auth.handler` and writes
     `storageState` to disk. Pure: NO domain seeding (per Q1 lock —
     forks add their own beforeAll for wallet/billing/etc.).
   - `apps/web/playwright.config.ts` — wire `globalSetup` field; add
     `authed` project that loads `storageState` and matches
     `**/*.authed.spec.ts`.
   - `apps/web/package.json` — update `"e2e"` script to set
     `NODE_OPTIONS=--conditions=react-server` (required because
     globalSetup imports `@/lib/db` + `@/lib/auth` which pull in
     `server-only`).
4. **Authed smoke spec** — `apps/web/e2e/authed-smoke.authed.spec.ts`:
   load `/`, assert the user is signed in (no `Login` link visible OR
   profile/account UI visible). Proves the fixture wires end-to-end;
   becomes a regression canary for any future BetterAuth or middleware
   change that breaks cookie handling.
5. **Final verification** — workspace typecheck + tests + e2e smoke
   against a live `pnpm dev`, plus an implementation report at
   `.mstack/implementations/2026-05-24-stripe-route-and-e2e-fixture/`.

### Out (deferred)

- **Stripe domain handlers** (checkout completion, account.updated, etc.)
  — those are per-fork. The template's `handleStripeEvent` switch ships
  with only a `default:` case; forks add their handlers there.
- **E2E test helper factories** (`createTestUser({ overrides })`, etc.)
  — BetFrnd called this out as future work; defer until a second fork
  actually needs per-test isolation.
- **A second e2e project for the existing unauthed specs** — they stay
  on the default `chromium` project; the new `authed` project is
  additive.
- **Replit live env verification** of Stripe — needs a Stripe test
  account + the webhook endpoint URL on the deployed VM. Deferred to
  the first-fork smoke.

## Approach

Mirror BetFrnd's shipped patterns, **strip BetFrnd-domain bits**, and
preserve the load-bearing comments (especially the
"cookie-name HTTPS-conditional" + "Playwright spec ESM resolution" gotchas
documented in support/auth.ts).

### Approach for the e2e fixture (this is the only non-obvious one)

The fixture has three coupled files (`support/auth.ts`, `global-setup.ts`,
`playwright.config.ts`). They form a single atomic unit — none of them is
useful alone — so they ship as one commit. The package.json `e2e` script
update is part of the same task because Playwright fails immediately
without `NODE_OPTIONS=--conditions=react-server` (the `server-only`
import in `@/lib/db` throws).

Specific deviations from BetFrnd:

- **No `wallet` insert** — Q1 locked "pure fixture".
- **No `username` field, no `isOver18`** — neither exists in hat-yai's
  user schema. The user row gets `{id, name, email, emailVerified, role}`.
- **Cleanup by stable id**, not `LIKE` on username prefix. The hardcoded
  UUID makes this safe across crashes (next run deletes the existing
  row by id, then re-inserts).
- **Email domain**: `@mlabs.test` (placeholder; rename.ts will substitute
  on fork via the `\bMLabs\b` rule? No — `@mlabs.test` is in a string,
  rename.ts handles namespace replacements not arbitrary domains.
  Acceptable to leave as `@mlabs.test`; forks can grep-and-replace if
  they care about cosmetics.)

### Alternatives considered

- **Extension-point fixture (Q1 option B)** — exposes a `seedExtras(db,
  userId)` hook in `support/auth.ts`. Rejected because the hook adds
  indirection without saving fork lines of code; the fork's own
  `beforeAll` is simpler.
- **Single Playwright project that loads storageState for all specs**
  — rejected because the existing unauthed specs (home.spec.ts etc.)
  would then run as a signed-in user, changing their semantics.
- **Skip the authed smoke spec; ship only the fixture** — rejected per
  Q2: the smoke is the regression canary that proves the fixture works
  without anyone having to write their own spec to find out.
- **Defer stripe-webhook-setup.ts again** — rejected per Q3: having
  route + provisioning script together makes Stripe usable end-to-end
  on day-one.

## Data model changes

**None.** The `webhook_event` table already landed in T7 (commit `cc47b80`).
The Stripe route reads/writes it via the existing `handleStripeEvent`
service. The e2e fixture uses existing `user` + `account` tables.

## Files to touch

### New

| Path | Source | Notes |
|---|---|---|
| `apps/web/src/app/api/stripe/webhook/route.ts` | BetFrnd same path | Rebrand `@betfrnd/services/billing` → `@mlabs/services/billing`; otherwise verbatim. ~70 LOC. |
| `scripts/stripe-webhook-setup.ts` | BetFrnd same path | Already generic (reads `process.env.STRIPE_SECRET_KEY` directly); no BetFrnd refs to strip. |
| `apps/web/e2e/support/auth.ts` | BetFrnd same path | Strip `username`, drop the LIKE-cleanup comment block, replace `betfrnd.test` → `mlabs.test`, keep the spec-ESM-resolution warning comment verbatim. |
| `apps/web/e2e/global-setup.ts` | BetFrnd same path | Strip `wallet` import + insert, drop `username`+`isOver18` from user insert, change cleanup to `DELETE WHERE id = E2E_TEST_USER.id`, rebrand `@betfrnd/db/schema` → `@mlabs/db/schema`. Keep the comments verbatim (especially the cookie-name HTTPS-conditional bit). |
| `apps/web/e2e/authed-smoke.authed.spec.ts` | new | Tiny: visit `/`, assert no Login link or assert profile-link visible. Read `apps/web/e2e/home.spec.ts` at /mlabs-code time to see the existing assertion style and the relevant page locator. |

### Edit

| Path | Change |
|---|---|
| `package.json` (root) | Add `"stripe:webhook-setup": "tsx scripts/stripe-webhook-setup.ts"` to scripts. |
| `apps/web/playwright.config.ts` | Add `globalSetup: "./e2e/global-setup.ts"`; add `{ name: "authed", use: { ...devices["Desktop Chrome"], storageState: "./e2e/.auth/user.json" }, testMatch: "**/*.authed.spec.ts" }` project alongside existing `chromium`; ensure `chromium` project excludes `*.authed.spec.ts` (Playwright defaults handle this since the authed project is more specific, but verify). |
| `apps/web/package.json` | Update `"e2e"` script from `"playwright test"` to `"NODE_OPTIONS=--conditions=react-server playwright test"`. |
| `apps/web/e2e/.auth/.gitignore` | New file in new `.auth/` dir with `*\n!.gitignore` so the dir is tracked but `user.json` isn't. |

### Files to verify at /mlabs-code time (not yet read)

| Path | Why |
|---|---|
| `apps/web/e2e/home.spec.ts` | See existing assertion style + locator for the smoke spec. |
| `apps/web/src/app/page.tsx` (or `(marketing)/page.tsx`) | Confirm what UI element distinguishes signed-in vs signed-out. |
| `apps/web/playwright.config.ts` | Confirm `webServer.command` runs against the same env the globalSetup needs (DATABASE_URL, BETTER_AUTH_SECRET). |
| `@mlabs/auth/server` `createAuth` exports | Confirm `auth.handler` accepts `Request` and returns `Response` (matches BetFrnd; almost certainly true since BetterAuth is the same library). |
| `package.json` root | Confirm `tsx` is already a devDep (it is — used by other scripts). |

## Edge cases

- **`auth.handler(req)` may reject the sign-in if BetterAuth's email+password
  plugin enforces email verification.** BetFrnd inserts `emailVerified: true`
  on the user row to bypass this. We do the same.
- **`@next/env` dep** — the global-setup uses `nextEnv.loadEnvConfig` so
  process.env populates from `.env.local` before importing `@/config/env`.
  `@next/env` is a peer of `next` and ships with it; no install needed.
- **`storageState` path collision** — the file lives at
  `apps/web/e2e/.auth/user.json`. The `.auth/` dir is new. Need a tiny
  `.gitignore` inside it so the cookie blob doesn't get committed (it
  contains a real signed session token). The dir itself stays tracked
  via `!.gitignore` so the path always exists at clone-time.
- **Authed project + unauthed project sharing one webServer** — Playwright
  by default reuses the dev server across projects. Fine for us; the
  fixture doesn't care which project triggers the server boot.
- **`E2E_TEST_USER.id` collision with a real user** — hardcoded UUID
  `00000000-0000-4000-8000-000000000001` is intentionally unrealistic
  (all-zeros prefix + version-4 marker). Comment in `support/auth.ts`
  warns against reusing this id in seed scripts.
- **`stripe-webhook-setup.ts` event subscription list** — BetFrnd hardcodes
  `["checkout.session.completed", "checkout.session.expired",
  "charge.succeeded", "payment_intent.payment_failed"]`. Generic enough for
  most fork uses. Forks can edit the list before running.
- **Smoke spec flakiness if `/` redirects to /login when unauthed AND we
  forget to load storageState** — guard by setting `testMatch:
  "**/*.authed.spec.ts"` on the `authed` project ONLY; the existing
  unauthed home.spec.ts continues to run in `chromium` without
  storageState.
- **Pre-commit hook (`check-contrast`, `check-migrations`) needs `pnpm` on
  PATH** — already validated during prior /mlabs-code run; corepack
  `enable --install-directory $HOME/.local/bin pnpm` is the workaround on
  fresh-clone Conductor workspaces (already in learnings.jsonl).

## Acceptance criteria

### Per-task

- [ ] **T1 (Stripe route):** `apps/web/src/app/api/stripe/webhook/route.ts`
      exists; `pnpm --filter @mlabs/web typecheck` clean; route imports
      from `@mlabs/services/billing` only (no `@betfrnd` leftovers).
- [ ] **T2 (Stripe setup script):** `scripts/stripe-webhook-setup.ts`
      exists; `pnpm stripe:webhook-setup --list` runs end-to-end against
      `STRIPE_SECRET_KEY=sk_test_invalid` (expected: prints clear "auth
      failed" error, exits non-zero) — proves the script bootstraps.
- [ ] **T3 (E2E fixture):** `apps/web/e2e/global-setup.ts`,
      `apps/web/e2e/support/auth.ts`, and `apps/web/e2e/.auth/.gitignore`
      all exist; `playwright.config.ts` has `globalSetup` field + `authed`
      project; `apps/web/package.json` `"e2e"` script includes
      `NODE_OPTIONS=--conditions=react-server`; `pnpm --filter @mlabs/web
      typecheck` clean.
- [ ] **T4 (Smoke spec):** `apps/web/e2e/authed-smoke.authed.spec.ts`
      exists; running `pnpm --filter @mlabs/web e2e --project=authed`
      against a `DATABASE_URL`-set env executes globalSetup → smoke spec
      passes (asserts signed-in UI on `/`).
- [ ] **T5 (Verification + report):** Workspace `pnpm typecheck` + `pnpm
      test` green at HEAD; `pnpm --filter @mlabs/web build` clean (Stripe
      route gets compiled into the standalone bundle); implementation
      report written at
      `.mstack/implementations/2026-05-24-stripe-route-and-e2e-fixture/report.md`;
      this plan's status → `implemented`.

### Initiative-level

- [ ] A fresh fork of this template (after `pnpm rename`) running
      `STRIPE_SECRET_KEY=sk_test_... pnpm stripe:webhook-setup` against
      a real Stripe test account provisions a webhook endpoint and
      prints the `whsec_…` secret.
- [ ] A fresh fork with `DATABASE_URL` + `BETTER_AUTH_SECRET` set and
      migrations applied can run `pnpm --filter @mlabs/web e2e
      --project=authed` and see the smoke spec pass on first try
      (proves the cookie fixture works without per-fork modification).
- [ ] The Stripe route, when called with a valid HMAC, dispatches to
      `handleStripeEvent` and returns 200; called with an invalid HMAC
      returns 400; called without `STRIPE_*` env vars set returns 500.

## Open questions

For `/mlabs-review` to resolve at review time:

1. **`apps/web/playwright.config.ts` webServer command** — currently
   `SKIP_ENV_VALIDATION=1 pnpm dev`. The globalSetup needs real env
   (DATABASE_URL, BETTER_AUTH_SECRET) loaded via `@next/env`'s
   `loadEnvConfig`. Confirm `pnpm dev` here doesn't conflict; verify
   the workflow at /mlabs-code time.
2. **Should `apps/web/e2e/.auth/` be in `.gitignore` instead of having
   a nested `.gitignore`?** Nested gives us a tracked-dir-with-untracked-
   contents pattern (useful: globalSetup can mkdirSync safely). Repo-root
   `.gitignore` is simpler. Reviewer's call.
3. **Smoke spec assertion** — depends on what hat-yai's `/` actually
   renders when signed in. /mlabs-code will read the relevant page
   component + existing home.spec.ts and pick a stable locator.
4. **stripe-webhook-setup.ts** lives at root `scripts/` — should it
   instead live under `packages/services/scripts/`? Root matches the
   pattern of `scripts/email-smoke.ts` (T15). Recommend keep at root.
5. **`tsx` invocation strategy** for `pnpm stripe:webhook-setup`:
   currently planned as `tsx scripts/stripe-webhook-setup.ts`. Alternative
   `tsx --conditions=react-server` if the script imports anything from
   `@mlabs/services`. BetFrnd's script imports `Stripe` directly (no
   `@mlabs` imports), so plain `tsx` works. Verify at /mlabs-code time.

## Source-of-truth references

- BetFrnd repo: `/Users/VB/conductor/workspaces/mlabs/betfrnd-readonly/`
- BetFrnd Stripe route: `apps/web/src/app/api/stripe/webhook/route.ts`
- BetFrnd e2e fixture:
  - `apps/web/e2e/global-setup.ts`
  - `apps/web/e2e/support/auth.ts`
  - `apps/web/e2e/authed-smoke.authed.spec.ts`
  - `apps/web/playwright.config.ts` (for project + globalSetup wiring)
- BetFrnd Stripe setup script: `scripts/stripe-webhook-setup.ts`
- Template's existing primitives:
  - `packages/services/src/billing/` (T8 — webhook + stripe-client)
  - `packages/db/src/schema/webhook_event.ts` (T7)
  - `apps/web/src/config/env.ts` STRIPE_* fields (T2)
- Related ADR: `docs/decisions/0008-codebase-conventions.md`
  (convention #7: one webhook URL = many event types)
- Prior plan/review: `.mstack/plans/2026-05-23-template-hardening.md` +
  `.mstack/reviews/2026-05-23-template-hardening.md` (T22's
  "follow-ups" section listed both gaps)
