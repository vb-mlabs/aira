# Implementation report: Stripe route + e2e fixture

**Status:** complete
**Started:** 2026-05-24 (after /mlabs-review)
**Completed:** 2026-05-24
**Review:** [2026-05-24-stripe-route-and-e2e-fixture](../../reviews/2026-05-24-stripe-route-and-e2e-fixture.md)
**Branch:** `Vbhadala/incorporate-fork-learnings`
**Commits:** 5 atomic + 1 pre-flight chore = 6 total

---

## Summary

All 5 planned tasks landed as single atomic commits. Workspace typecheck
(10 packages), tests (5 packages, 200+ tests), and standalone build all
green at HEAD. The Stripe webhook route + provisioning script + e2e auth
fixture + smoke spec all wire end-to-end at the code level. No Pause-If
triggers fired (`auth.handler` signature matched BetFrnd; sign-out button
accessible name matched the planned locator). The single deferred check
is the live Playwright run, which is `/mlabs-qa`'s job, not `/mlabs-code`'s.

## Tasks

| # | Task | Status | Commit |
| --- | --- | --- | --- |
| T1 | Stripe webhook route (`runtime="nodejs"`) | ✓ done | `8f76364` |
| T2 | `pnpm stripe:webhook-setup` + script | ✓ done | `8630bfe` |
| T3 | E2E auth fixture (5 files) | ✓ done | `017ca90` |
| T4 | Authed smoke spec hitting `/notifications` | ✓ done | `9136ff3` |
| T5 | Verification + this report | ✓ done | (this commit) |

Pre-flight: `chore(mstack)` commit `4754b88` brought the plan + review +
2 review learnings into git so the working tree started clean (excluding
the user's pending favicon.ico → icon.png change, which stays untracked
as requested).

## Verification

- ✅ **Workspace typecheck**: `pnpm typecheck` → 10/10 packages (3.1s
  with cache). Catches the new Stripe route's import surface, the
  fixture's `auth.handler` shape, and the Playwright project config.
- ✅ **Workspace tests**: `pnpm test` → 5/5 packages. No regressions in
  services (still 41/41 incl. the `_qa-idempotency.test.ts` cleanup ran
  earlier in QA-S4).
- ✅ **Standalone build**: `rm -rf apps/web/.next && pnpm --filter
  @mlabs/web build` succeeds. The Stripe route lands at
  `apps/web/.next/standalone/apps/web/.next/server/app/api/stripe/webhook/route.js`
  (verified via `find`).
- ✅ **`pnpm stripe:webhook-setup` script verification** (during T2):
  - No env → exit 1 + stderr `"STRIPE_SECRET_KEY is required."`
  - `sk_test_invalid` → exit 1 + stderr `"StripeAuthenticationError:
    Invalid API Key provided"`
- ⊘ **`pnpm e2e --project=authed`**: skipped per `/mlabs-code` skill
  contract (e2e is `/mlabs-qa`'s job). The fixture is typecheck-clean
  and matches BetFrnd's pattern verbatim except for the documented
  template adaptations (no `username`, no wallet, id-based cleanup).

## Pause events

**None.** Both review-listed Pause-If triggers were checked and cleared:

- T3 Pause-If — `@mlabs/auth/server`'s `auth.handler` signature: ✓
  confirmed `toNextJsHandler(auth.handler)` already uses it in
  `apps/web/src/app/api/auth/[...all]/route.ts`, so the standard
  `(Request) → Response` shape holds.
- T4 Pause-If — sign-out button accessible name: ✓ confirmed
  `apps/web/src/app/(app)/_components/sign-out-button.tsx` renders a
  `<button>` with text "Sign out" (or "Signing out…" while pending);
  the `/sign out/i` regex matches both.

## Follow-ups for the user

These are NOT bugs from this run — they're the live-env validations
that the plan + review deferred:

1. **First-fork Stripe wiring smoke**: with a Stripe test key,
   `pnpm stripe:webhook-setup` against the deployed URL → expect endpoint
   created + `whsec_…` printed → paste into env → trigger a test event
   from Stripe Dashboard → expect 200 from the webhook + a row in
   `webhook_event`.
2. **First-fork e2e fixture smoke**: with `DATABASE_URL` +
   `BETTER_AUTH_SECRET` set, `pnpm --filter @mlabs/web e2e --project=authed`
   → expect globalSetup to mint the cookie + the smoke to pass at
   `/notifications`.
3. **`/mlabs-qa` run** focused on the new surface area (see "Recommended
   next step" below).

## Non-obvious surprises (none worth a learning)

This run was uneventful. Both Pause-If checks cleared cleanly. The
review's reviewer-decisions (`runtime="nodejs"`, generic Stripe
description, `testIgnore` on chromium) were all mechanically applied
without surprises. No new learnings appended this run — the two from
the review phase (`runtime=nodejs` necessity + `testMatch`/`testIgnore`
symmetry) cover the genuinely-new ground.

## Plan + review status updates

- Plan status: `reviewed` → `implemented` (Edited in this commit)
- Review status: stays `approved`
- `learnings.jsonl`: 137 → 137 entries (no new appends from this run; the
  2 review-phase appends are already in)

## Recommended next step

Run `/mlabs-qa` focused on:

1. **Live `pnpm e2e --project=authed`** against a real `DATABASE_URL` —
   the highest-value verification we couldn't do here. Proves the
   globalSetup actually mints a cookie that the dev server accepts.
2. **`/api/stripe/webhook` end-to-end via Stripe CLI** — `stripe listen
   --forward-to http://localhost:3000/api/stripe/webhook` + `stripe
   trigger payment_intent.payment_failed` → expect 200 + a row in
   `webhook_event` + the second trigger of the same id returns 200
   without re-dispatching (idempotency check).
3. **`testIgnore` symmetry**: `pnpm --filter @mlabs/web e2e
   --project=chromium` should NOT pick up `authed-smoke.authed.spec.ts`
   (would 500 without storageState). The `testIgnore` config from T3
   prevents this; QA can confirm with a single test-list invocation.

If `/mlabs-qa` is green, the branch is ready for PR review and merge to
`main`.
