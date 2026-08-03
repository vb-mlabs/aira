# Implementation report: Admin Notify Users

**Status:** complete
**Review:** [2026-08-03-admin-notify-users](../../reviews/2026-08-03-admin-notify-users.md)
**Branch:** feat/business-logo
**Finished:** 2026-08-03

---

## Tasks

| # | Task | Status | Commit |
|---|---|---|---|
| 1 | Audit action + render-detail branch | ✓ done | [`64e738a`](#) |
| 2 | Validator schemas for user broadcast | ✓ done | [`2f373f4`](#) |
| 3 | Service layer + Expo fan-out + test | ✓ done | [`2da1c6a`](#) |
| 4 | Operations + routes | ✓ done | [`1e1368e`](#) |
| 5 | UI UserBroadcastButton component | ✓ done | [`a35147c`](#) |
| 6 | Mount + verify | ✓ done | [`2d40805`](#) |

## Commits (in order)

- `1d21c06` docs(mstack): plan + review + ledger for admin notify users
- `64e738a` feat(audit): register admin.user_broadcast_sent action
- `2f373f4` feat(validators): schemas for admin user-direct broadcast
- `2da1c6a` feat(services): admin user-direct broadcast + per-platform fan-out
- `1e1368e` feat(api): admin.users.broadcast op + REST routes
- `a35147c` feat(admin/ui): UserBroadcastButton with per-platform diagnostics
- `2d40805` feat(admin): mount UserBroadcastButton on /admin/users header

## Verification

- `pnpm typecheck` — **green** across all 10 packages (turbo cached 3, ran 7).
- `pnpm lint` — **green** (17 pre-existing warnings across the workspace,
  0 in files this run touched).
- `pnpm test` for `@aira/services` — **76/76 passed**, including six new
  push-users bucketing cases (empty audience, no-devices, missing token
  throws, mixed-platform response with DeviceNotRegistered cleanup,
  by_platform device filter, network-failed chunk bucketed as pending).
- `apps/web/tests/email.test.ts` — 6 failures, **pre-existing on this
  branch**, unrelated. Confirmed by re-running that suite with T6 diff
  stashed (same 6 failures on both sides). See follow-ups.

## Deviations from the plan

- **Reused `body.kind: 'generic'` instead of introducing `admin_message`.**
  Locked at review time. Cut scope from ~14 files to ~7 with no
  user-visible loss — existing renderers already handle `generic` on
  both platforms.
- **Copy-not-refactor for `sendPushBroadcast`.** New file
  `packages/services/src/notifications/push-users.ts` rather than
  generalising the owner-broadcast loop. Owner broadcast unchanged;
  extract-shared-core is a follow-up if a third caller lands.
- **`platformBucket` hoisted out of the closure** in `push-users.ts`
  to keep TypeScript's narrowing happy across the `.filter` callback.
  One-line adjustment; noted in T3 tasks.md.

## Follow-ups

- **`apps/web/tests/email.test.ts` — 6 failing tests.** Pre-existing on
  `feat/business-logo`; NOT caused by this work. Test file untouched
  by any of the seven commits above. Should be triaged separately —
  possible causes are a template-render env issue, a missing test env
  var, or drift from a prior email refactor.
- **The debug wedge itself.** This tool is now in place; the actual
  iOS-delivery investigation for the reported user is the next step.
  Recommended flow: admin sends an iOS-only test blast → reads the
  Sent-step per-platform breakdown. If iOS `devices_completed > 0` but
  the user still doesn't get pushes, the failure is downstream of Expo
  (APNs env mismatch, user permission denied, iOS Focus/DND). If
  `devices_completed == 0` and `error_code_counts` shows
  `InvalidCredentials` or similar, the EAS APNs key is misconfigured.
- **Copy warning on the Confirm step.** T5 added "cannot be recalled"
  language, but no typed-word confirm gate. Review deliberately deferred
  that guardrail; revisit if abuse surfaces.
- **Follow-up refactor:** if the owner-broadcast Sent step ever wants a
  per-platform breakdown too, extract the shared Expo loop from
  `push.ts` + `push-users.ts` into a `push-shared.ts` internal helper.
  Not urgent — two callers is under the extract-then-refactor threshold.

## Recommended next step

Run `/mlabs-qa --focus "admin notify users flow: open modal on /admin/users, verify preview count matches SQL, send iOS-only test blast, verify per-platform breakdown on Sent step, verify audit row appears at /admin/audit"` — this is the real acceptance test for a delivery-triage tool.

Or, if the admin can just log in and use it themselves:
1. Open `/admin/users`
2. Click "Notify users"
3. Pick "By platform" → iOS
4. Send a short title/body
5. Read the Sent step
6. Correlate to what the reporting user sees on their iPhone
