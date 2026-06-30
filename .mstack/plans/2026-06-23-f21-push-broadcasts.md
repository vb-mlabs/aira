# Plan: F21 — push broadcasts to business owners

**Date:** 2026-06-23
**Slug:** 2026-06-23-f21-push-broadcasts
**Status:** implemented
**Author:** framer@millionlabs.co.uk

---

## Problem

The last open S5 feature on the MVP roadmap. The admin team can already
fan out **in-app** notifications to business owners via the existing
`sendBusinessOwnerBroadcast` flow — wired into `/admin/businesses` →
"Notify all owners" — but those notifications only land on the bell
icon when an owner is actively in the app. **Push delivery to real
devices** is what closes the "admin broadcasts a message and it lands
on the owner's lock screen within seconds" loop.

The pieces are now all in place:

- **G1 (2026-06-16)** shipped the owner identity model:
  `businesses.owner_user_id` + `sendBusinessOwnerBroadcast` service +
  `business.broadcast_sent` audit + `business_broadcast` notification
  variant + the admin broadcast modal. The targeting layer + in-app
  fan-out is done.
- **S0 EAS init (2026-06-23)** shipped signed mobile builds for both
  platforms + an **Apple Push Key (.p8)** registered with EAS under
  the Nisarga Group LLC team (`C529274M9Y`). The APNs credential is
  live. iOS push delivery is unlocked.

F21 fills the remaining gap: device-side push token registration on
mobile, server-side fan-out via the Expo Push Service, per-device
delivery tracking, and an expanded audience picker that lets admins
target by city / categories / specific businesses instead of just
"all linked owners."

Success: an admin opens `/admin/businesses` → "Notify all owners",
fills out subject + message, picks an audience filter (e.g. "by
city = Atlanta"), clicks Send; within ~5 seconds every device with
a registered push token belonging to a matching owner receives the
push notification on their lock screen.

Benefits:
- Owners get time-sensitive ops messages (renewal reminders, listing
  reviews, payment confirmations) at the speed of push, not the
  speed of "when they open the app."
- Admin can target broadcasts narrowly (e.g. "just the restaurants
  with expiring sponsorships") instead of always pinging every owner.
- Logs every per-device push attempt with status + error code in a
  new `notification_delivery` table so ops can debug "why didn't
  Priya get the push?" without spelunking the Expo dashboard.

## Scope

**In:**

- **New `user_device` table** holding one row per registered Expo
  Push Token per user. Schema in "Data model changes" below.
- **`expo-notifications`** added to `apps/mobile/package.json` so the
  Expo SDK 55 native build can request permission + fetch the push
  token at runtime.
- **`expo-server-sdk`** added to `packages/services` (or wherever the
  push-sending lives — see Approach) so the server can talk to the
  Expo Push Service. **New top-level dep — flagged for reviewer.**
- **Mobile push permission UX**: a small post-login "AIRA wants to
  send you notifications" pre-prompt screen, then the OS permission
  prompt. On grant, fetch the Expo Push Token via
  `Notifications.getExpoPushTokenAsync()` and register it via a new
  `/api/v1/me/push-token` endpoint.
- **`registerPushTokenOp`** (POST `/api/v1/me/push-token`) — auth-gated
  user op. Upserts into `user_device` keyed on `(user_id,
  expo_push_token)`. Bumps `last_seen_at` on re-registration.
- **`unregisterPushTokenOp`** (DELETE `/api/v1/me/push-token`) —
  user op for explicit "stop sending me notifications on this device"
  flow + automatic cleanup when the OS reports the token has been
  revoked.
- **New `notification_delivery` table** logging each push delivery
  attempt. Schema in "Data model changes" below.
- **`sendPushBroadcast` service** at
  `packages/services/src/notifications/push.ts` (new) — the
  push-aware wrapper around the existing
  `sendBusinessOwnerBroadcast`. Takes the same `BusinessOwnerBroadcastArgs`,
  extends with a `target` field (the new audience shape), runs the
  existing audit + in-app fan-out (so the bell icon path is
  unchanged), THEN looks up every registered device for the
  resolved user_id set and fans out via `expo-server-sdk`. Logs per
  device into `notification_delivery`.
- **Audience targeting expansion**: extend
  `BusinessOwnerBroadcastArgs` with a discriminated `target` union:
  - `{ kind: "all_linked_owners" }` — current behavior
  - `{ kind: "by_city", city_id: string }` — only owners with at
    least one active business in that city
  - `{ kind: "by_categories", category_ids: string[] }` — only
    owners with at least one active business in any of those
    categories
  - `{ kind: "by_businesses", business_ids: string[] }` — only the
    owners of the named businesses
- **Extend the existing admin broadcast modal** at
  `apps/web/src/features/admin/components/business-broadcast-modal.tsx`
  with an audience picker. Default stays "all linked owners" so the
  existing one-click flow is unchanged. New picker reveals when
  admin selects "by city" / "by categories" / "by businesses".
- **Synchronous fan-out** (decision Q2): admin clicks Send, sees a
  loading state for ~2–10 seconds, then a success message showing
  recipient count + push delivery summary
  ("Sent to N owners — M push notifications delivered, K failed").
  No queue infra; deliveries happen inline.
- **Initial-ticket logging** in `notification_delivery`: status
  starts as `pending` for accepted tickets and `error` for
  rejected ones (per Expo's two-phase model). The final receipt
  status is NOT polled in v1 (decision Q3).
- **Notification body** — reuse the existing
  `NotificationBody.business_broadcast` variant unchanged. Push
  notification carries `title` + `message` in the standard
  iOS / Android body fields plus a JSON `data` payload mirroring
  the in-app notification body for deep-link parity later (F25).

**Out (deferred):**

- **Receipt polling cron** — Expo recommends polling tickets ~15
  minutes after send to fetch final delivery receipts (delivered /
  error / unregistered). Deferred to a follow-up plan. v1 only
  logs the initial ticket response.
- **Per-user notification preferences** — the existing
  `user_preferences` table has the shape; wiring a "I don't want
  broadcast pushes" flag is a follow-up plan. v1 sends to every
  registered device.
- **Rich notifications** (images, actions, deep-link parameters
  beyond the basic JSON payload). v1 ships title + body only.
- **Push delivery analytics dashboard** (per-broadcast open rates,
  device breakdown, etc.). v1 has a `notification_delivery` table
  ops can query via Drizzle Studio; no admin UI for it.
- **Rate limiting / abuse prevention** — admin-only fan-out + the
  existing freshness guard. Low risk; defer.
- **Web push** (sending push to web users via service workers). Not
  in the PRD scope; out.
- **Deep links** from the push tap — the JSON `data` payload carries
  the kind + business_id but the app's onPress handler is a basic
  no-op for v1. F25 wires the real navigation.
- **F26 force-update dialog** — separate concern; uses the EAS
  Update channel infrastructure but unrelated UX.

## Approach

**Layer push delivery on top of the existing in-app fan-out, not
underneath.** The current `sendBusinessOwnerBroadcast`
(`packages/services/src/admin/service.ts:294`) does three things
in order: targets the user set, audits, bulk-inserts in-app
notifications. F21's `sendPushBroadcast` calls
`sendBusinessOwnerBroadcast` (or its newly-extracted user-set-
resolution helper, see below), THEN looks up registered devices for
the resolved user_id set, THEN calls `expo-server-sdk` to deliver.

This keeps the in-app notification path bulletproof: even if the
Expo Push Service is down, the audit + in-app bell-icon delivery
still happens. The bell is the source of truth; push is a delivery
accelerant.

**Extract a `resolveTargetUserIds(db, target)` helper** from
`sendBusinessOwnerBroadcast`. Today's hard-coded query (distinct
owners of non-archived non-banned businesses) becomes the
`all_linked_owners` branch; the three new branches add their own
WHERE clauses. The audit + in-app fan-out then runs against the
resolved user_id set. Pure refactor — same behavior for the existing
broadcast modal which keeps calling with `target: { kind:
"all_linked_owners" }` until the admin picks something else.

**Synchronous fan-out (decision Q2 locked).** Per-recipient call
through `expo-server-sdk` is one HTTP request to Expo Push Service
per **chunk** of recipients (Expo chunks at 100 per request); for
an MVP scale of <500 active owners this is at most 5 round-trips,
typically completes in 1–3 seconds total. Admin sees a loading
spinner; the response shows the summary. The Replit Reserved VM's
single-process model fits this cleanly — no queue, no worker, no
race conditions on the broadcast row.

**Initial-ticket logging only (decision Q3 locked).** Expo's API
returns one ticket per push: either `{ status: "ok", id: "..." }`
or `{ status: "error", message: "...", details: { error: "..." } }`.
`notification_delivery` rows get inserted with status set from the
ticket. The receipt-polling step (which would update those rows
with final delivery confirmation 15 minutes later) is a small
follow-up plan that adds a node-cron job + a few service functions.

**Mobile permission flow (decision Q4 locked).** After successful
sign-in (in the post-auth redirect path), the mobile app checks
whether push permission has been requested before by reading a
local flag in `expo-secure-store`. If not requested yet:
1. Show a small "AIRA wants to send you notifications" screen with
   one-paragraph copy + an "Enable notifications" button + a "Maybe
   later" button.
2. On "Enable" → fire `Notifications.requestPermissionsAsync()`.
3. On grant → fetch `Notifications.getExpoPushTokenAsync({ projectId:
   <eas projectId> })` → POST to `/api/v1/me/push-token`.
4. Set the local flag so the screen doesn't re-appear on subsequent
   logins.
5. On deny (or "Maybe later") → set the local flag with "skipped"
   value so we don't re-prompt. Add a manual "Enable notifications"
   row to the account hub for users who change their mind later.

**Token storage on a new `user_device` table (decision Q1 locked)**:
multi-device by design (a user with phone + tablet gets two rows).
On token rotation (reinstall, OS revoke), the new token is upserted
and the old one's `last_seen_at` stays frozen. The cleanup of
truly-dead tokens is driven by the `DeviceNotRegistered` error
returned by Expo Push Service on subsequent fan-outs — when a fan-
out hits that error for a token, we delete the corresponding
`user_device` row (one-shot, no retry).

**`EXPO_ACCESS_TOKEN` env var** (Expo Push Service accepts unsigned
requests for tokens that belong to a project the request can prove
ownership of; an access token is the recommended auth path for
server-side use). Adds one env var to `apps/web/src/config/env.ts`.
Documented as part of the FORK_CHECKLIST update.

**Alternatives considered:**

- **Asynchronous fan-out via a `push_queue` table + node-cron**
  worker. Rejected per Q2 — admins want immediate feedback on
  send-success, and at MVP scale (<500 owners per broadcast) the
  synchronous path is fast enough. Re-evaluate if any single
  broadcast routinely exceeds 500 recipients.

- **Putting the push token directly on the `user` table** as a
  single column. Rejected per Q1 — one-device-per-user breaks
  multi-device users + loses history needed to debug delivery
  issues.

- **Calling Expo Push Service directly via `fetch` without
  `expo-server-sdk`.** The SDK is just a typed HTTP client; it's
  tempting to skip the dep. Rejected because: (a) the SDK
  handles the 100-recipient chunking + ticket parsing; (b) it
  carries the right TypeScript types for tickets + receipts that
  we'd otherwise have to redeclare; (c) it's an Expo-maintained
  package — staying on the official client makes a future
  upgrade (SDK 56, expo-notifications API changes) a one-line
  bump instead of a debugging exercise.

- **Doing the permission prompt at app first-launch (before
  sign-in).** Rejected — push notifications are user-bound
  (we send to a specific user_id), so no point in collecting a
  token before we know who the user is.

- **Including push delivery inside the existing
  `sendBusinessOwnerBroadcast` rather than a new wrapper.** Less
  layering but couples the in-app notification path tightly to
  the push path. The wrapper pattern means a future
  "in-app only" broadcast (e.g. ops-team admin notes that don't
  warrant a push) just calls the underlying service directly.

## Data model changes

**New `user_device` table** (`packages/db/src/schema/user-device.ts`):

```ts
import {
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core"
import { user } from "./auth"

export const userDevice = pgTable(
  "user_device",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    user_id: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Format: ExponentPushToken[XXX] or ExpoPushToken[XXX]. Expo
     *  treats both forms as equivalent; we store as-is. */
    expo_push_token: text("expo_push_token").notNull(),
    platform: text("platform").notNull(), // "ios" | "android"
    /** Bumped on every successful re-register. Stale tokens
     *  (>30 days since last_seen) can be pruned in a follow-up
     *  cron. */
    last_seen_at: timestamp("last_seen_at").defaultNow().notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("user_device_token_uq").on(
      table.user_id,
      table.expo_push_token,
    ),
    index("user_device_user_idx").on(table.user_id),
  ],
)
```

**New `notification_delivery` table**
(`packages/db/src/schema/notification-delivery.ts`):

```ts
import {
  pgTable,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core"
import { notifications } from "./notifications"
import { userDevice } from "./user-device"

export const notificationDelivery = pgTable(
  "notification_delivery",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    /** FK to the in-app notification row this push was paired with.
     *  Cascade-delete if the source notification is removed. */
    notification_id: text("notification_id")
      .notNull()
      .references(() => notifications.id, { onDelete: "cascade" }),
    /** FK to the device the push was sent to. Cascade-delete on device
     *  cleanup so the table doesn't accumulate orphan rows. */
    user_device_id: text("user_device_id")
      .notNull()
      .references(() => userDevice.id, { onDelete: "cascade" }),
    /** "pending" | "ok" | "error". `pending` = the initial Expo ticket
     *  was accepted; `ok` = receipt confirmed delivery (set by the
     *  follow-up receipts cron, not v1); `error` = ticket or receipt
     *  reported a failure. v1 only ever writes `pending` or `error`. */
    status: text("status").notNull(),
    /** Expo ticket UUID. Null on ticket-rejection rows. */
    ticket_id: text("ticket_id"),
    /** Error code from Expo when status = "error". Examples:
     *  DeviceNotRegistered, MessageRateExceeded, MismatchSenderId. */
    error_code: text("error_code"),
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("notification_delivery_notification_idx").on(
      table.notification_id,
    ),
    index("notification_delivery_device_idx").on(
      table.user_device_id,
    ),
  ],
)
```

Both tables ship in a single additive migration generated via
`pnpm db:generate`.

**No changes** to existing tables. `user`, `businesses`,
`notifications` all stay as-is. The `business.broadcast_sent`
audit kind stays; `notification.body.kind = "business_broadcast"`
stays.

## Files to touch

**New:**

- `packages/db/src/schema/user-device.ts`
- `packages/db/src/schema/notification-delivery.ts`
- `packages/db/drizzle/migrations/00XX_<auto>.sql` (generated)
- `packages/validators/src/devices.ts` —
  `RegisterPushTokenInputSchema` (+ matching `Mutation` output schema)
- `packages/services/src/notifications/push.ts` —
  `sendPushBroadcast` orchestrator + `resolveTargetUserIds` helper.
- `packages/services/src/devices/queries.ts` —
  `registerDevice` (upsert), `unregisterDevice` (delete),
  `listDevicesForUser`, `deleteDeviceByToken`.
- `apps/web/src/server/operations/devices.ts` — `registerPushTokenOp`
  + `unregisterPushTokenOp` (auth-gated, permission: "user").
- `apps/web/src/app/api/v1/me/push-token/route.ts` — POST + DELETE
  binding to the ops above.
- `apps/mobile/lib/push.ts` — small client utility:
  `requestPermissionAndRegister()` that does the full flow
  (request OS permission → fetch token → POST to API).
- `apps/mobile/app/(auth)/notifications-pre-prompt.tsx` (or a
  modal route under the existing auth shell) — the "AIRA wants to
  send you notifications" pre-prompt screen.

**Edit:**

- `packages/db/src/schema/index.ts` — re-export the two new tables.
- `packages/validators/src/index.ts` — re-export the devices module.
- `packages/validators/src/admin.ts` — extend
  `BusinessOwnerBroadcastInputSchema` with the new
  `target: BroadcastTargetSchema` discriminated union (+ matching
  inferred types).
- `packages/services/src/admin/service.ts` —
  `sendBusinessOwnerBroadcast` gets factored: the user-set
  resolution moves into `resolveTargetUserIds(db, target)`; the
  existing call site uses `target: { kind: "all_linked_owners" }`
  and continues to behave identically. The audit + in-app fan-out
  stays in this function.
- `apps/web/src/features/admin/components/business-broadcast-modal.tsx`
  — add the audience picker. Defaults to "all_linked_owners";
  expand to reveal city / category / business pickers when the
  user selects those modes. Reuses the existing city + category
  pickers from elsewhere in the admin surface.
- `apps/web/src/server/operations/admin.ts` (or wherever
  `sendBusinessOwnerBroadcastOp` lives) — accept the new `target`
  field, pass through to `sendPushBroadcast`.
- `apps/mobile/package.json` — add `expo-notifications@~0.32.x`
  (Expo SDK 55 compatible) and any peer deps it pulls in.
- `apps/mobile/app.config.ts` — add the `expo-notifications` config
  plugin entry under `plugins[]` so the iOS entitlements +
  Android receiver register at build time. (Note: this triggers a
  new EAS production build to apply on real devices.)
- `apps/web/src/config/env.ts` — declare `EXPO_ACCESS_TOKEN`
  (server-only, required for push fan-out).
- `.env.example` — document `EXPO_ACCESS_TOKEN`.
- `packages/services/src/notifications/index.ts` — export the new
  `sendPushBroadcast` from the barrel.
- `apps/mobile/app/_layout.tsx` (or wherever the post-login
  redirect lives) — gate the redirect on the push pre-prompt
  state; show the pre-prompt screen if not previously dismissed.
- `apps/web/package.json` — add `expo-server-sdk@^3.x`. Or
  `packages/services/package.json` if we scope it to the service
  layer. **NEW TOP-LEVEL DEP — flagged for reviewer.**
- `FORK_CHECKLIST.md` — add an entry for `EXPO_ACCESS_TOKEN`
  generation + setting + the mobile EAS rebuild required after
  the config-plugin change.

## Edge cases

- **Token rotation.** Expo Push Tokens rotate when the user
  reinstalls the app or the OS regenerates them. The mobile-side
  registration re-runs on every login and upserts (no duplicate
  rows). Stale tokens accumulate until either (a) the user
  re-registers from a new device which adds a row but the old one
  lingers, or (b) a fan-out hits the stale token with
  `DeviceNotRegistered` and we delete the row.
- **Cascading user deletion.** ON DELETE CASCADE on `user_device.user_id`
  cleans up devices when a user is anonymised. The
  `notification_delivery` rows then cascade via
  `user_device_id`. The source `notifications` rows are unaffected
  (they're per-user, also CASCADE).
- **Banned users.** The existing `sendBusinessOwnerBroadcast`
  filters banned users in the user-set resolution. The push fan-
  out inherits that — banned users have no resolved user_id, so
  no device lookup, so no push.
- **Owner with no registered device.** No-op; the audit + in-app
  notification still happen so the bell icon is correct.
  `notification_delivery` row simply doesn't get created for them.
- **Expo Push Service outage.** Push fan-out fails per-recipient
  with a network error; we log it as status=`error`,
  error_code=`NetworkError`. The audit + in-app notification
  succeeded; admins see "delivered to N owners, push failed for
  M". Acceptable failure mode — owners will still get the in-app
  notification on their next bell-icon check.
- **Token from one user reassigned to another user.** Shouldn't
  happen in practice (Expo binds tokens per-install), but if a
  user signs out + a different user signs in on the same device,
  the OLD user_device row stays attached to the old user_id (and
  will fail with DeviceNotRegistered on next fan-out) while the
  new user signs in + registers, creating their own row. The
  cleanup happens at fan-out time, not at sign-out time, because
  sign-out doesn't know if the user intends to come back.
- **iOS notification permission revoked from Settings.** Token
  remains valid in our DB but Expo returns `DeviceNotRegistered`
  on fan-out. We delete the row. On next app launch the user
  sees the pre-prompt only if they fully reinstall (the local
  flag persists); otherwise no re-registration unless they
  manually trigger from account hub. Documented.
- **Large recipient sets.** Expo chunks at 100 per request; for
  500 recipients that's 5 chunks. Sync fan-out completes in ~3s
  under nominal conditions, ~30s worst case if Expo is slow.
  Admin's loading state has a 60s timeout; beyond that we
  surface "broadcast partial — N/M devices contacted" and the
  admin can retry. Not in v1 scope per Q2; document as a known
  limitation.
- **Receipts not polled in v1.** `notification_delivery` rows with
  status=`pending` stay that way until the follow-up plan adds
  receipt polling. Ops can still query them; they know `pending`
  means "Expo accepted the push but we don't know if it landed."
- **Mobile config-plugin change** (adding `expo-notifications` to
  `plugins[]`) is a native-code change. It requires a new EAS
  build for both platforms; users on old builds won't get push
  even with the OS permission granted. Documented in the runbook
  + FORK_CHECKLIST.
- **`EXPO_ACCESS_TOKEN` missing on prod.** The server-side
  `sendPushBroadcast` throws on missing env; the existing
  env-validation gate (`apps/web/src/config/env.ts`) catches it
  at boot. Required env, not optional.
- **Audience picker on the admin modal**: when the audience is
  empty (e.g. "by city = Atlanta" but no owners in Atlanta yet),
  the modal disables Send and shows "0 owners match this audience"
  before the request fires. Same recipient_count=0 guard the
  service already has, just enforced at the UI for nicer UX.

## Acceptance criteria

- [ ] `pnpm db:generate` produces a non-destructive migration adding
      only `user_device` + `notification_delivery` tables + their
      indexes.
- [ ] `pnpm db:migrate` applies cleanly on a database with rows in
      `user`, `businesses`, `notifications`.
- [ ] A signed-in mobile user, on first post-login navigation, sees
      the "AIRA wants to send you notifications" pre-prompt screen.
- [ ] Tapping "Enable notifications" fires the OS prompt; on grant,
      the app POSTs to `/api/v1/me/push-token` with the user's
      `ExpoPushToken[...]`; a `user_device` row appears in the DB.
- [ ] Tapping "Maybe later" sets the local flag (verified via
      `expo-secure-store` inspection in dev) and the pre-prompt
      doesn't re-appear on subsequent logins.
- [ ] An "Enable notifications" row appears in the mobile account
      hub menu; tapping it re-runs the registration flow.
- [ ] An admin opens `/admin/businesses` → "Notify all owners",
      sees the new audience picker defaulting to "All linked
      owners", and the existing one-click flow still works.
- [ ] Selecting "By city" / "By categories" / "By businesses" in
      the audience picker reveals the matching picker and
      live-updates the recipient count.
- [ ] Sending a broadcast with audience "by city = Atlanta" delivers
      a push to every registered device of every linked owner of
      an active Atlanta business; one `notification_delivery` row
      per device with status=`pending` (or `error` + error_code if
      a ticket was rejected).
- [ ] The audit_log row for the broadcast has
      `meta.kind = "business.broadcast_sent"` + `recipient_count`
      reflecting the resolved user set (NOT the device count).
- [ ] The in-app bell icon shows the broadcast for every recipient,
      identical to today's behavior.
- [ ] An owner whose device sent back `DeviceNotRegistered` on
      fan-out has their `user_device` row deleted within the same
      broadcast transaction.
- [ ] An admin broadcast where 0 owners match the audience surfaces
      "0 owners match" in the modal + the Send button is disabled.
      No DB writes occur.
- [ ] `pnpm typecheck` + `pnpm lint` pass.
- [ ] `expo-server-sdk` is declared in the appropriate package.json
      and noted in the FORK_CHECKLIST as a new server dep.
- [ ] `EXPO_ACCESS_TOKEN` is declared in `apps/web/src/config/env.ts`
      as a required server env var and documented in `.env.example`.
- [ ] Mobile app.config.ts has `expo-notifications` in the `plugins`
      array. A new EAS production build for both platforms includes
      this plugin and successfully receives a test push from the
      Expo Push Tool with the registered token.

## Open questions

For `/mlabs-review` to resolve before implementation:

- **Q-A — Where does `expo-server-sdk` live?** Two reasonable
  options: (1) `packages/services/package.json` — keeps push as a
  service-layer concern; (2) `apps/web/package.json` — narrower
  scope, only the web app's API surface uses it. Plan
  recommendation: **services package**. The service-layer location
  fits the existing pattern (Postmark, Stripe primitives live in
  services) and lets future server-side push uses (e.g. cron-
  triggered renewal reminders escalating to push) reuse without
  needing to add a second dep.

- **Q-B — Should the audience picker target by **active**
  business or **any** business?** `sendBusinessOwnerBroadcast`
  today filters `isNull(businesses.deleted_at)`. The new audience
  branches inherit that filter. Confirm: archived listings'
  owners are excluded by the audience targeting even when the
  audience is "by_businesses". Reviewer locks the default.

- **Q-C — Notification body kind for the push payload data.**
  Plan reuses `business_broadcast`. Should the push payload's
  `data` field carry the full `body` or just the discriminator?
  Plan recommendation: full body. Costs nothing (Expo allows
  ~4KB), gives F25 deep-link wiring a clean route.

- **Q-D — Does the admin broadcast modal need a "preview push"
  button?** Sending a test push to the admin's own device before
  broadcasting widely. Not in scope per plan; reviewer can
  promote if they want it. (Useful for the first few weeks of
  ops; cheap to add later.)

- **Q-E — Receipt polling follow-up timing.** Plan defers
  receipts to a follow-up. Confirm: a separate plan file gets
  written immediately after F21 lands (so it's tracked) rather
  than left as an open todo? Plan recommendation: write the
  follow-up plan as part of F21's implementation report, not as
  part of this plan.

- **Q-F — Should the pre-prompt screen also live as a "force-
  re-prompt" option in account-hub?** E.g., if a user denied
  initially + later changed their mind, they'd toggle a setting
  + we'd show the pre-prompt again. Plan includes the manual
  "Enable notifications" row but not the explicit re-prompt
  flow. Reviewer can expand if needed.
