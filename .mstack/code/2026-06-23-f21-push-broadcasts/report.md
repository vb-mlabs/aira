# Implementation report — F21 push broadcasts

**Status:** complete
**Started + finished:** 2026-06-23
**Branch:** feat/qa-test-accounts-seed
**Review:** [2026-06-23-f21-push-broadcasts](../../reviews/2026-06-23-f21-push-broadcasts.md)

---

## Tasks

| # | Task | Status | Commit |
|---|---|---|---|
| 1 | `user_device` + `notification_delivery` tables | ✓ done | `d2e5c12` |
| 2 | Devices validators + broadcast target union + device counters | ✓ done | `75e398c` |
| 3 | `expo-server-sdk` dep on `packages/services` | ✓ done | `090082b` |
| 4 | `resolveTargetUserIds` extracted + broadcast accepts target | ✓ done | `d08fdc9` |
| 5 | Devices service queries (register/unregister/list/delete) | ✓ done | `da5e181` |
| 6 | `sendPushBroadcast` Expo Push orchestrator | ✓ done | `c93e1bc` |
| 7 | Register/unregister push-token ops | ✓ done | `5cd8780` |
| 8 | `/api/v1/profile/push-token` route handler | ✓ done | `d1ae84d` |
| 9 | Broadcast op wired through `sendPushBroadcast` | ✓ done | `505626d` |
| 10 | `EXPO_ACCESS_TOKEN` env + `.env.example` | ✓ done | `d5090c1` |
| 11 | Broadcast modal audience picker + live count + counters | ✓ done | `5c32670` |
| 12 | `expo-notifications` dep + config plugin | ✓ done | `8e03c8e` |
| 13 | `requestPermissionAndRegister` mobile utility | ✓ done | `8523802` |
| 14 | `NotificationsPrePrompt` modal | ✓ done | `6475213` |
| 15 | Post-login pre-prompt gating in `_layout.tsx` | ✓ done | `ab84958` |
| 16 | Account-hub "Enable notifications" row | ✓ done | `58d0b2e` |
| 17 | FORK_CHECKLIST + roadmap updates | ✓ done | `b71c631` |

17 of 17 complete. One mandatory pause fired after T12 (the
`expo-notifications` config-plugin change is native code that
requires a fresh EAS production build before push works on
installed devices); user acknowledged and the run continued through
T13–T17.

## Commits

Precursor:
- `486be76` docs(mstack): F21 push broadcasts plan + review

Implementation:
- `d2e5c12` feat(db): user_device + notification_delivery tables
- `75e398c` feat(validators): broadcast target union + devices push-token shapes
- `090082b` build(services): add expo-server-sdk dep
- `d08fdc9` refactor(services): resolveTargetUserIds + broadcast accepts target
- `da5e181` feat(services): devices domain (register/unregister/list/delete)
- `c93e1bc` feat(services): sendPushBroadcast — Expo Push delivery orchestrator
- `5cd8780` feat(web): register/unregister push token ops
- `d1ae84d` feat(web): /api/v1/profile/push-token route handler
- `d5090c1` feat(env): declare EXPO_ACCESS_TOKEN for push broadcasts
- `505626d` feat(web): broadcast op routes through sendPushBroadcast
- `5c32670` feat(admin): broadcast audience picker + live recipient preview
- `8e03c8e` feat(mobile): expo-notifications dep + config plugin
- `8523802` feat(mobile): requestPermissionAndRegister utility
- `6475213` feat(mobile): NotificationsPrePrompt modal
- `ab84958` feat(mobile): gate pre-prompt in post-auth layout
- `58d0b2e` feat(mobile): account-hub "Enable notifications" row
- `b71c631` docs(roadmap): F21 push broadcasts shipped + decisions logged

## What shipped

End-to-end push broadcast delivery. Concretely:

- **Schema (migration `0033`)**: two new tables, purely additive.
  - `user_device` (`id`, `user_id` FK→user, `expo_push_token`,
    `platform`, `last_seen_at`, `created_at`; unique on
    `(user_id, expo_push_token)`; cascade on user delete).
  - `notification_delivery` (`id`, `notification_id`,
    `user_device_id`, `status`, `ticket_id?`, `error_code?`,
    `created_at`; cascade on both FKs).
- **Service layer**: `resolveTargetUserIds` extracted from the
  existing `sendBusinessOwnerBroadcast` — the single SELECT path
  every audience branch routes through. New `sendPushBroadcast`
  orchestrator composes audit + in-app + push with a 60s
  `AbortController` cap and best-effort
  `DeviceNotRegistered` cleanup outside the broadcast transaction.
- **API surface**: `POST/DELETE /api/v1/profile/push-token`
  (under the existing profile namespace, not a sibling `/me/*`);
  broadcast op now flows through `sendPushBroadcast` with the
  audience `target` field carried in; new
  `previewBroadcastRecipientCountOp` backs the live audience count
  in the admin modal.
- **Env**: `EXPO_ACCESS_TOKEN` optional in
  `apps/web/src/config/env.ts`; app boots without it. Send-time
  throw is the gate.
- **Admin UI**: broadcast modal extended with the four-radio
  audience picker (city dropdown / category checkbox list /
  business checkbox list reveal on demand), 400ms-debounced
  live count, Send disabled at zero, sent step shows partial-
  success counters.
- **Mobile**: `expo-notifications` dep + config plugin;
  `lib/push.ts` with the full permission → token → POST flow +
  secure-store flag management; pre-prompt modal gated by
  `_layout.tsx`; always-visible account-hub row for re-trigger /
  Settings-blocked path.
- **Docs**: roadmap S5 closed; off-roadmap F21 entry with locked
  decisions + by_categories deviation noted; FORK_CHECKLIST has
  EXPO_ACCESS_TOKEN + rebuild reminders; 10 new decision-log
  entries.

## Verification done

- `pnpm typecheck` — green for `@aira/db`, `@aira/validators`,
  `@aira/services`, `@aira/web`, `@aira/mobile` at every commit
  boundary.
- Migration 0033 inspected: only `CREATE TABLE`,
  `ALTER TABLE ADD CONSTRAINT`, `CREATE INDEX` statements.
- Pre-commit hooks (check-contrast, check-migrations,
  check-no-server-actions, check-mobile-tailwind) passed on every
  commit.
- No e2e/Playwright runs — that's `/mlabs-qa`'s job.

## Deviations from the review

1. **`by_categories` audience join.** Review T4 sample SQL hinted
   at `inArray(businesses.category, target.category_ids)` (the
   legacy text column). The implementation joins through the new
   `business_category` N:M table instead — the admin modal's
   category picker draws from `listCategoriesTreeOp` which
   returns `categories.id` values, and only the join through
   `business_category` matches those IDs. Documented in the
   decision log + the T4 commit message.

2. **Audience picker UX bundled into compose step.** Review T11
   said "audience picker between compose + confirm steps". The
   implementation inlines the picker into the compose step so
   the existing all_linked_owners one-click flow keeps the same
   click count (which was an explicit acceptance criterion).
   The picker appears below title + message; sub-pickers reveal
   on demand.

3. **New `listCitiesForAdminOp` (permission "admin") + route
   `/api/v1/admin/cities-for-broadcast`.** The existing
   `listCitiesAdminOp` is super_admin only — adding a plain-admin
   sibling kept the canonical mutation path super_admin while
   unblocking the audience picker for any admin. Documented in
   the T11 commit message.

## Operational follow-ups (deferred, not orphaned)

- **Receipt-polling cron** (review Q-E locked deferral). Expo
  recommends polling tickets ~15 minutes after send to upgrade
  `notification_delivery.status` from `pending` → `ok` once the
  push has actually landed. Today's pending rows are
  observable but never reconciled. Suggested plan shape:
  store the active ticket IDs in memory or a tiny TTL table,
  add a `notifications.receipts` node-cron job, walk
  `getPushNotificationReceiptsAsync` chunks, update statuses,
  delete devices where the receipt comes back
  `DeviceNotRegistered`. Tracked as a small follow-up plan to
  pick up after F21 lands in production.
- **EAS production rebuild + submit**. The `expo-notifications`
  config plugin is a native-code change; existing TestFlight +
  Play Internal Testing builds installed before T12 won't receive
  push even with OS permission granted.
  `eas build --profile production --platform all` →
  `eas submit --profile production --platform all`.
  Runbook: `docs/operations/eas-build-runbook.md`. **Required
  before push activates on real devices**; this is the next
  human step.
- **`EXPO_ACCESS_TOKEN` on prod**. Generate at
  <https://expo.dev/settings/access-tokens> scoped to the
  `million-labs` org and set in Replit prod secrets. Without it
  the broadcast modal still writes audit + in-app notifications,
  but `sendPushBroadcast` throws on send.
- **F25 deep links** (separate roadmap item). The push payload
  carries the full `NotificationBody.business_broadcast` so
  tapping a notification can navigate to the relevant
  business/listing — F25 wires that navigation. Out of F21
  scope.

## Recommended next step

`/mlabs-qa` against `/admin/businesses` → "Notify business
owners" + `/account/listings` notifications + the mobile
profile screen's new Notifications section. The web side is
fully exercisable today; the mobile side will need an Expo Go
or a fresh EAS production build to validate end-to-end push.

OR: trigger the EAS production rebuild now so push works on
the existing TestFlight + Play Internal Testing tracks before
QA runs.
