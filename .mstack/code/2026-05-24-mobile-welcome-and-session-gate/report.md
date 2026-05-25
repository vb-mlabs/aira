# Implementation report: Mobile welcome screen + session gate

**Date:** 2026-05-24
**Status:** complete
**Review:** [.mstack/reviews/2026-05-24-mobile-welcome-and-session-gate.md](../../reviews/2026-05-24-mobile-welcome-and-session-gate.md)
**Branch:** Vbhadala/incorporate-fork-learnings
**Commits:** 8 (Task 2 skipped — see below)

---

## Status table

| # | Task | Status | Commit |
|---|------|--------|--------|
| 1 | Add welcome screen | ✓ done | `4fd6efd` |
| 2 | Route meRequest through apiGet | ⊘ skipped | — |
| 3 | Top-level session gate at app/index.tsx | ✓ done | `4b862b5` |
| 4 | (app) group gate | ✓ done | `3bf4839` |
| 5 | (auth) group gate | ✓ done | `e5d164b` |
| 6 | Remove router.replace from login/verify | ✓ done | `671e562` |
| 7 | Remove sign-out router.replace from profile | ✓ done | `6958c6f` |
| 8 | Maestro flow 11 (+ flow 09 fix) | ✓ done | `d74dd0f` |
| 9 | Maestro flow 12 (deep-link bounce) | ✓ done | `8b3da2c` |

## Commits

```
8b3da2c test(mobile): maestro flow for deep-link bounces unauthenticated users
d74dd0f test(mobile): maestro flow for welcome cold launch + fix flow 09 target
6958c6f refactor(mobile): defer sign-out and delete-account redirects to (app) gate
671e562 refactor(mobile): defer auth redirects to the (auth) gate
e5d164b feat(mobile): gate (auth) group to bounce verified users to (app)
3bf4839 feat(mobile): gate (app) group on verified session
4b862b5 feat(mobile): add top-level session gate at app/index.tsx
4fd6efd feat(mobile): add welcome screen
```

Plus the prior docs commit `be56178` for the plan + review artifacts.

## Skipped: Task 2 (meRequest refactor)

The review claimed `meRequest()` should go through `apiGet` to pick up the
global 401→refresh-once retry, on the theory that an expired access token
with a valid refresh would otherwise false-positive the session gate.

That premise was wrong. `/api/auth/get-session` is Better Auth's built-in
endpoint, served by its bearer plugin. The bearer plugin validates the
bearer against a **session** row in the DB — mobile's "refresh" token in
SecureStore *is* that session token (the access-token JWT is a separate
short-lived artifact for `/api/v1/*` endpoints, verified by our custom
`getSessionFromHeaders` in `apps/web/src/lib/auth/server.ts:42`).

If `meRequest()` went through `apiGet`, it would attach the JWT access
token, and Better Auth's get-session would reject it (no matching session
row). After the refresh-retry, it would attach a freshly-minted JWT —
also rejected. Net: `useMe()` would 401 forever, the gate would always
route to welcome, and login would appear broken.

Confirmed by reading `apps/web/src/lib/auth/server.ts:28-71` and the
mobile `loginRequest` flow in `apps/mobile/features/auth/api.ts:71-101`.
Original `meRequest()` is correct as-is — the 7-day session token doesn't
need refresh-once retry.

User approved the skip during the per-task pause.

## Deviations from the review

1. **Task 2 skipped** — see above.
2. **Task 8 bundled flow-09 fix** — sign-out post-Task-7 lands on welcome,
   not login; flow 09's assertions needed updating. Folded into the
   Task 8 commit since both were Maestro work.
3. **Task 9 scenario changed** — the review allowed this fallback
   explicitly: Maestro can't write SecureStore, so "seed stale refresh
   token + deep link" became "no tokens + deep link." Semantic intent
   preserved (the gate's `me.isError || !emailVerified` fires identically
   for both cases).

## What this shipped

- `apps/mobile/app/index.tsx` (new) — top-level session gate, hides
  splash when `useMe()` settles, declarative `<Redirect/>` to `(app)` or
  `(auth)/welcome`.
- `apps/mobile/app/(auth)/welcome.tsx` (new) — wordmark + tagline + two
  CTAs (Create account primary, Sign in secondary). Brand strings from
  `@mlabs/config`.
- `apps/mobile/app/(app)/_layout.tsx` (edit) — gate on
  `me.isError || !emailVerified`; redirects to welcome.
- `apps/mobile/app/(auth)/_layout.tsx` (edit) — gate that bounces
  verified-session users to `(app)`; unverified stay in (auth) so
  check-email/verify remain reachable.
- `apps/mobile/app/(auth)/login.tsx`, `verify.tsx`,
  `app/(app)/profile.tsx` (edits) — removed explicit `router.replace`
  calls so the gates are the single source of redirection truth.
- `apps/mobile/.maestro/11-welcome-cold-launch.yaml` (new)
- `apps/mobile/.maestro/12-deep-link-expired-session.yaml` (new)
- `apps/mobile/.maestro/09-sign-out-clears-store.yaml` (edit) — updated
  post-sign-out assertion to welcome.

## Follow-ups (not done here)

- **Intent preservation on deep-link bounce.** A user deep-linked to
  `/messages/<id>` from an expired session lands on welcome with no
  breadcrumb back to the original target. Flagged with a FIXME comment
  in `apps/mobile/app/(app)/_layout.tsx`. Separate feature.
- **`reset-password.tsx` still uses explicit `router.replace`.** This is
  intentional (post-reset user is unauthenticated; reset → login is a
  within-(auth) navigation, not a gate-driven transition). Open question
  remains: should it land on welcome instead of login? Defaulted to
  login for lower-friction.
- **Web preview blank-frame on cold launch.** `SplashScreen` is a no-op
  on web; the gate's `null` during `me.isPending` produces a brief blank
  frame. Acceptable for the dev QA surface; not worth fixing.

## Recommended next step

Run **`/mlabs-qa`** focused on:

1. Cold launch with no tokens → welcome → tap CTAs
2. Cold launch with valid session → home tab visible (no welcome flash)
3. Sign out from profile → welcome (not login)
4. Verify Maestro flows 01 (signup), 04 (forgot-password), 08 (session
   restore), 09 (sign-out, now updated), 11 (welcome), 12 (deep link)
   all pass against a sim build.
