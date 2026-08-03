# Plan: Admin Notify Users (with per-platform diagnostics)

**Date:** 2026-08-03
**Slug:** 2026-08-03-admin-notify-users
**Status:** reviewed
**Author:** framer@millionlabs.co.uk

---

## Problem

Admins currently have two push paths, neither of which fits the current
debug wedge:

- **"Notify business owners"** on `/admin/businesses` — fans out to
  linked owners of active businesses only. Bypasses end-users who don't
  own a business.
- **Per-user push** (`sendAdminNotificationOp` from the user detail
  page) — sends to one user at a time. No fan-out, no live device
  count, no platform breakdown.

A user has reported that iOS pushes aren't arriving on the App Store
build even though the same TestFlight build reaches macOS fine. With
today's tooling we can't distinguish **send-side failure** (nobody gets
it) from **receive-side / user-specific failure** (only some iOS users
miss it) — the missing instrumentation is the ability to blast a test
push to all users (or iOS-only) and read back per-platform delivery
counts.

Success = admin can (a) send a message to "all users with a device" or
to iOS/Android only, (b) see a live count of how many users + devices
per platform will be hit before sending, and (c) after send, see a
per-platform breakdown of `devices_attempted / devices_completed /
devices_pending` plus error-code counts (DeviceNotRegistered,
MessageTooBig, ...). One click in that flow tells us where the loss is
happening.

## Scope

**In:**
- "Notify users" button on `/admin/users` header (admin permission)
- Compose → Confirm → Sent modal, structurally identical to
  `BusinessBroadcastButton` / `BroadcastModal`
- Audience picker: **All users with a device** or **By platform**
  (iOS / Android)
- Live debounced preview showing total matching **users** + split by
  platform (e.g. "42 users — 30 iOS, 12 Android — 55 devices")
- Sent step: per-platform breakdown of `devices_attempted /
  devices_completed / devices_pending`, plus a count table of Expo
  ticket error codes seen (DeviceNotRegistered, MessageTooBig,
  MismatchSenderId, InvalidCredentials, other)
- New in-app notification type `admin_message` with
  `body.kind: 'admin_message'`
- Audit row `admin.user_broadcast_sent` written on every submit
  (including zero-recipient) with meta `{ title, recipient_count,
  platform_filter }`
- Mobile bell renderer falls back cleanly for `admin_message` (default
  case → title + message)
- Unit test: per-platform bucketing of a mixed-platform Expo response
  (mocked ticket set with iOS ok / iOS DeviceNotRegistered / Android
  ok / Android pending)

**Out (deferred):**
- Specific-user picker (multi-select by name/email)
- "Only me" self smoke-test branch (deferred — for v1 the admin can
  use the platform picker + observe their own device in the delivery
  log)
- Rate-limiting or typed-word confirm (owner broadcast has none; parity
  is the guardrail for now)
- Scheduling, drafts, rich text, email fallback
- Dedicated `/admin/audit/broadcast/<id>` delivery-log page with
  per-device rows — the aggregate Sent-step counts cover the debug
  wedge; a full page is future work if needed
- Cross-city/category user targeting (users don't have those
  attributes directly; if we ever want it we can join through
  `businesses` but that overlaps with the owner broadcast)

## Approach

Mirror the existing owner broadcast pipeline but scope the audience to
`user_device` rows directly instead of linked business owners. The
Expo integration — chunked send, `notification_delivery` rows,
DeviceNotRegistered cleanup outside the transaction, 60s
AbortController cap — is already battle-tested in
`packages/services/src/notifications/push.ts::sendPushBroadcast`. The
only genuinely new logic is (a) resolving user ids from a platform
filter, (b) counting devices grouped by platform for the preview, and
(c) rolling up per-platform ticket outcomes for the Sent step.

Concretely: add a **sibling** target discriminator
`UserBroadcastTargetSchema` in `packages/validators/src/admin.ts` —
**do not overload** the existing `BroadcastTargetSchema`, which is
business-owner-shaped (`by_city`, `by_categories`, `by_businesses`)
and semantically distinct from a user-direct blast. Add
`resolveUserTargetUserIds(db, target)` in
`packages/services/src/admin/service.ts` that queries `user_device`
for distinct user ids matching the platform filter. Wrap the shared
Expo fan-out into a small user-scoped analog `sendUserBroadcast` that
writes the audit + inserts in-app notifications with
`type: 'admin_message'`, then buckets ticket outcomes by
`device.platform` for the return payload. Two new ops
(`sendUserBroadcastOp`, `previewUserBroadcastRecipientCountOp`), two
new one-liner routes (`/api/v1/admin/users/broadcast` +
`/preview`), one new component
(`UserBroadcastButton`/`UserBroadcastModal`) mounted on
`apps/web/src/app/admin/users/page.tsx`.

For the per-platform breakdown, wrap the existing single-loop Expo
send into a variant that stamps each item's platform (already on
`user_device` and returned from `listDevicesForUserIds`) and buckets
ticket outcomes into two counter objects. For v1, prefer copying the
~40-line loop into a new function `sendPushBroadcastByPlatform` in
`packages/services/src/notifications/push-users.ts` rather than
refactoring `sendPushBroadcast` — the owner broadcast is stable
production code and the review shouldn't have to re-verify it. A
follow-up refactor can extract the shared core once both paths are
proven.

The mobile app's tap handler + bell renderer today already have a
generic default for unknown types (verify in review). If not, add a
default case: title + message rendered in the existing notification
detail modal, no deep link — matches how the owner broadcast surfaces.

**Alternatives considered:**

- **Overload `BroadcastTarget` with user-direct branches** — rejected.
  The validator would need `.superRefine` to reject cross-branch
  fields, and downstream code reading `target.kind` would have to
  guard against nine branches instead of four+three. Cleaner to keep
  two discriminated unions.
- **Loop `sendAdminNotificationOp` per recipient** — rejected. Would
  (a) create one audit row per recipient (audit-log spam), (b) miss
  Expo's chunk-batch optimization, (c) have no way to expose a live
  preview count, and (d) have no per-platform rollup.
- **Full delivery-log audit page** — deferred. The Sent-step
  aggregates cover the debug wedge; adding a per-device page is a
  scope multiplier that doesn't unblock the immediate iOS
  investigation.

## Data model changes

**None.** Reuses:
- `user_device` (unchanged) — source for audience resolution and
  platform bucketing
- `notifications` (unchanged) — the `type` column is already `text`;
  we add a new value `admin_message` and a new
  `body.kind: 'admin_message'` variant to the
  `NotificationBodySchema` discriminated union in validators
- `notification_delivery` (unchanged) — same per-device rows keyed on
  `(notification_id, user_device_id)`
- `audit_log` (unchanged) — new `action: 'admin.user_broadcast_sent'`
  added to `KnownAuditActionSchema` + the audit-meta discriminated
  union

## Files to touch

**New:**
- `packages/services/src/notifications/push-users.ts` —
  `sendUserPushBroadcast(db, ctx, args, options)` — variant of
  `sendPushBroadcast` returning per-platform counts + error-code
  counts. Reuses `listDevicesForUserIds`, `deleteDeviceById`.
- `apps/web/src/app/api/v1/admin/users/broadcast/route.ts` — one-liner
  exporting `sendUserBroadcastOp.runFromRequest`
- `apps/web/src/app/api/v1/admin/users/broadcast/preview/route.ts` —
  one-liner
- `apps/web/src/features/admin/components/user-broadcast-modal.tsx` —
  copy `business-broadcast-modal.tsx`; strip city/category/business
  picker branches; add platform radio; expand Sent step with the
  per-platform breakdown table
- `packages/services/src/notifications/__tests__/push-users.test.ts` —
  mirrors `push-to-user.test.ts` shape; asserts per-platform bucketing
  on a mixed-platform mocked ticket response

**Edit:**
- `packages/validators/src/admin.ts` — add
  `UserBroadcastTargetSchema` (discriminated union of
  `all_users_with_device` and `by_platform` with `platform: 'ios' |
  'android'`); `SendUserBroadcastInputSchema` (title, message,
  target); `SendUserBroadcastOutputSchema` (recipient_count,
  by_platform: { ios: {...counts}, android: {...counts} },
  error_code_counts: Record<string, number>);
  `PreviewUserBroadcastInputSchema`;
  `PreviewUserBroadcastOutputSchema` (user_count, device_count,
  by_platform: { ios: {users, devices}, android: {users, devices} })
- `packages/validators/src/notifications.ts` (or wherever
  `NotificationBodySchema` lives — reviewer to confirm) — add
  `admin_message` variant to the body discriminated union: `{ kind:
  'admin_message', title: string, message: string }`
- `packages/validators/src/audit-meta.ts` — add
  `admin.user_broadcast_sent` to `KnownAuditActionSchema` + the
  discriminated `AuditMeta` union with shape `{ kind:
  'admin.user_broadcast_sent', title: string, recipient_count:
  number, platform_filter: 'all' | 'ios' | 'android' }`
- `packages/services/src/admin/service.ts` — add
  `resolveUserTargetUserIds(db, target)` +
  `resolveUserTargetDevices(db, target)` (returns full device rows
  when the caller also needs platform info for the preview);
  `sendUserBroadcast(db, ctx, args)` (audit + bulk-insert
  notifications with `type: 'admin_message'`)
- `packages/services/src/admin/index.ts` — export the new fns
- `packages/services/src/notifications/index.ts` — export
  `sendUserPushBroadcast`
- `apps/web/src/server/operations/admin.ts` — `sendUserBroadcastOp`
  (permission: "admin", wraps `sendUserPushBroadcast` with
  `expoAccessToken` from env), `previewUserBroadcastRecipientCountOp`
  (permission: "admin", wraps a new
  `previewUserBroadcastCounts(db, target)` that returns the
  per-platform counts)
- `apps/web/src/app/admin/users/page.tsx` — mount
  `<UserBroadcastButton />` in the header, aligned right, matching
  the pattern on `apps/web/src/app/admin/businesses/page.tsx:64`
- `apps/mobile/lib/notification-tap.ts` (and any bell-list renderer
  file the reviewer identifies) — handle `admin_message` type. If a
  generic default case already exists, this may reduce to a labeled
  branch that renders through the same path.

## Edge cases

- **Empty DB / no devices.** Preview shows 0/0. Send button stays
  disabled. Audit row still written on submit for consistency with
  owner broadcast's zero-recipient contract.
- **Platform filter selected, zero matches.** Same — preview 0, Send
  disabled, no notification rows created.
- **Missing `EXPO_ACCESS_TOKEN`.** `sendUserPushBroadcast` throws
  (mirrors `sendPushBroadcast`, unlike `sendPushToUser` which
  log-and-returns). Modal surfaces the error on the Sent step. Do
  NOT log-and-return silently — that would defeat the debug purpose
  (we'd think 0 devices got pushed when actually the token was
  missing).
- **Expo API times out mid-chunk.** Existing 60s AbortController
  fires; remaining items count as `devices_pending`. Per-platform
  breakdown must bucket pending by `device.platform` correctly (bucket
  BEFORE the chunk starts, tracking the platform of every
  in-flight item, not after — an aborted chunk has no ticket to key
  off).
- **User has both iOS and Android device.** With platform filter =
  `ios`, only their iOS device is included in `devices_attempted`.
  Their in-app notification row is still created once (we resolve
  distinct user ids first, then filter their devices by platform).
- **DeviceNotRegistered cleanup.** Reuse the existing
  best-effort cleanup outside the transaction (see
  `push.ts:176-185`). Stale tokens get pruned across broadcasts.
- **Older mobile builds without `admin_message` handling.** The push
  notification itself (title + body) comes from the Expo message
  envelope, so it displays natively regardless. Only the in-app bell
  rendering could regress. **Reviewer to verify** the current bell
  renderer has a default case that renders `body.title` +
  `body.message`; if not, adding one is a v1 prerequisite so OTA
  users on prior bundles don't see empty rows.
- **Concurrency: two admins hit Send at once.** Two audit rows, two
  notification batches, two Expo round-trips. Fine — audit trail
  shows both. No shared state to protect.
- **User has been banned since preview.** Preview shows N; by the time
  Send runs, the banned user's devices still exist unless the ban
  flow deletes them (it doesn't). This is consistent with owner
  broadcast, which filters banned users at the query level. Add the
  same `isNull(user.banned_at)` filter to
  `resolveUserTargetUserIds` — reviewer to confirm this is the right
  policy for a debug-tool blast (arg: yes, banned users shouldn't
  get pushes; counterarg: for a delivery-loop test we might want to
  include them).

## Acceptance criteria

- [ ] "Notify users" button visible on `/admin/users` header (admin
      permission), styled identically to "Notify business owners" on
      `/admin/businesses`
- [ ] Modal opens with title (≤120) + message (≤2000) inputs and
      platform picker: "All", "iOS only", "Android only"
- [ ] Live preview shows debounced total count split by platform
      (e.g. "42 users — 30 iOS, 12 Android — 55 devices")
- [ ] Send button disabled when title/message empty or matching count = 0
- [ ] Confirm step shows recipient count + rendered preview of title
      + message
- [ ] Sent step shows per-platform table:
      `devices_attempted / devices_completed / devices_pending` for
      iOS and Android, PLUS a count table of Expo ticket error codes
      (DeviceNotRegistered, MessageTooBig, MismatchSenderId,
      InvalidCredentials, other)
- [ ] `type: 'admin_message'` notification row appears in the
      recipient's bell with title + message rendered
- [ ] Audit row `admin.user_broadcast_sent` written with meta
      `{ title, recipient_count, platform_filter }` even when
      recipient_count = 0
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test` all clean
- [ ] Manual: send a test push to iOS-only from a real admin session;
      confirm push arrives on at least one registered iOS device and
      Sent step reports `devices_completed >= 1` under iOS
- [ ] Manual: repeat for Android-only
- [ ] Manual: mixed-platform send with a known stale iOS token in the
      DB; confirm Sent step reports `error_code_counts:
      { DeviceNotRegistered: 1 }` under iOS and the row is deleted
      from `user_device` after the fan-out

## Open questions

For the reviewer (`/mlabs-review`) to resolve:

1. **Platform picker default.** "All" (safest, matches owner broadcast
   default) or "iOS only" (matches the immediate debug motivation)?
   Recommend: **All** — the modal is not a debug-only tool long-term.
2. **`NotificationBodySchema` location.** Confirm the exact file the
   discriminated union lives in and whether adding a variant is a
   one-line append or triggers a cascade of `assertNever` checks in
   the mobile renderer.
3. **Mobile bell renderer default case.** Verify the current renderer
   has a default that shows `body.title` + `body.message` for unknown
   types. If not, adding one is a v1 requirement (OTA users on older
   bundles).
4. **Include banned users?** Owner broadcast filters them out.
   Recommend: **filter out** for consistency, note in the plan that
   for a delivery-loop test we could re-enable via a hidden flag —
   but not in v1.
5. **Audit meta — include resolved user ids?** Owner broadcast
   doesn't (keeps audit_log rows small). Recommend: **no**, same
   policy.
6. **Should the preview also surface how many total registered
   devices exist DB-wide** (as context, not filter)? Cheap SELECT
   COUNT(*) — reviewer to decide if it's noise or useful triage
   framing.

---

**Handoff:** Plan written to `.mstack/plans/2026-08-03-admin-notify-users.md`.
Run `/mlabs-review` next.
