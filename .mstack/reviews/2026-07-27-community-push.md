---
UI-Significant: no
---

# Review: Push notifications for community comments + replies

**Date:** 2026-07-27
**Slug:** 2026-07-27-community-push
**Plan reviewed:** [2026-07-27-community-push.md](../plans/2026-07-27-community-push.md)
**Status:** approved
**UI-Significant:** no
**Reviewer:** vb-mlabs (with Claude)

---

## Summary

Approved with three locked changes: (1) push tap routes to the
existing `/(app)/account/notification/[id]` modal — NOT the post
directly, matching the deliberate bell-tap pattern that exists to
avoid the "Post not found" dead-end on cascade-hidden posts; (2)
`Notifications.setNotificationHandler` gets installed at root in
the same PR so iOS foreground pushes aren't silently suppressed;
(3) mark-as-read gets added to the notification detail modal (bell
+ push both go through the same modal, so a single hook covers both
entry paths). All other plan details verified against the code:
`createNotification` returns `{ id: string }`, the env-injection
convention for `EXPO_ACCESS_TOKEN` matches the existing broadcast
route, `NotificationBody.post_comment` already carries every field
the push copy needs, and the services package has a wired vitest
so tests drop in cleanly next to the existing
`packages/services/src/notifications/__tests__/service.test.ts`.
No new deps, no schema change, five open questions resolved with
recommendations baked into the tasks below.

## Findings

### Blockers (must fix before /mstack-code)

- **B1 — Push tap route was wrong.** Plan proposed
  `router.replace("/community/[post_id]")`. Mobile has no
  `/community/[id]` route (the mobile post detail lives at
  `/(app)/post/[id]`). And more importantly, the existing bell-tap
  pattern DELIBERATELY routes to `/(app)/account/notification/[id]`
  because the earlier straight-to-post flow broke ("Post not found.")
  whenever the community-post visibility filter refused the target
  — see the header comment at
  `apps/mobile/app/(app)/account/notification/[id].tsx:16-26`. Routing
  a push tap to the post directly would resurrect that dead-end.
  **Resolved:** tap handler routes to
  `/(app)/account/notification/[id]` using `data.notification_id`,
  matching the bell-tap pattern. Same file, same UX, no
  visibility-filter risk.

### Concerns (raised, decided, recorded)

- **C1 — `setNotificationHandler` was flagged out-of-scope.** Without
  it, iOS silently suppresses foreground pushes — a user inside the
  app on a different screen sees nothing when a push arrives. Same
  gap exists for today's admin broadcasts, but going ignored there
  doesn't mean it's OK to ship a new push feature with the same hole.
  **Decision:** install a simple foreground handler in the same PR
  (`shouldShowBanner: true, shouldPlaySound: true, shouldSetBadge: true`)
  at mobile root. One line, fixes iOS foreground for both this
  feature AND the pre-existing admin broadcasts. Task 3.

- **C2 — Mark-as-read behavior would drift between bell + push.** Plan
  proposed `markRead(notification_id)` from the tap handler only. But
  the existing bell-tap flow does NOT mark as read on modal open
  today — the `markRead` API wrapper exists at
  `apps/mobile/features/notifications/api.ts:46` with zero consumers.
  Adding it only on push tap creates a "why does this notification
  clear and this identical one didn't" inconsistency.
  **Decision:** wire mark-as-read once inside
  `/account/notification/[id]` modal on mount. Both entry paths
  (bell + push) go through the same modal → both benefit.
  Task 4.

- **C3 — `sendPushToUser` signature: `NotificationBody` param or
  explicit title/body/data?** Plan open-questioned this. **Decision:**
  explicit `{ title, body, data }` params. Callers own their copy;
  building a `NotificationBody → { title, body }` mapper inside
  the sender grows into a mini template system the moment the second
  caller lands. When post_interest / message push wirings arrive,
  each op passes its own copy — same as this PR's comment op does.

- **C4 — Log-and-return on missing `EXPO_ACCESS_TOKEN`, deliberate
  deviation from `sendPushBroadcast`'s throw.** Plan justified this
  well (comment path is a hot end-user path; broadcast is a
  discrete admin action). **Decision:** accepted. The new sender
  logs a warn once per call and returns silently. Broadcast keeps
  its fail-loud behaviour untouched.

- **C5 — Env in prod?** `EXPO_ACCESS_TOKEN` is `.optional()` in the
  env validator (see `apps/web/src/config/env.ts:75`). Plan doesn't
  say whether it's confirmed present in prod. **Decision:** deferred
  to a manual pre-ship check — reviewer confirms with the deploy
  operator before running the smoke test on real devices. Fine
  because the sender is defensive: worst case, pushes silently
  no-op and the log line is the surface. Recorded as a follow-up
  TODO.

### Suggestions (taken)

- **S1 — Split the mobile root wiring into a small `lib/` module.**
  Plan already proposed `apps/mobile/lib/notification-tap.ts`.
  Confirmed; also the `setNotificationHandler` call belongs in the
  same module (one exported `installNotificationHandlers()` that
  wires both) rather than inline in `_layout.tsx`. Root layout
  imports and calls once inside a `useEffect`.

- **S2 — Add a comment header to
  `apps/mobile/lib/push.ts` pointing at `notification-tap.ts`.**
  Plan already mentioned it. Confirmed — small change, big
  discoverability win.

- **S3 — Push abort cap at 15s (shorter than broadcast's 60s).**
  Plan recommended 15s. Confirmed — per-request path shouldn't
  block a comment op for longer than that.

## Decisions locked

Net-new during review (in addition to the three planning-time
decisions on gating / copy / receipt polling):

1. Push tap routes to `/(app)/account/notification/[id]` (bell-tap
   parity). NOT the post directly.
2. `Notifications.setNotificationHandler` installed at mobile root
   in the same PR. Simple `{ shouldShowBanner: true, shouldPlaySound:
   true, shouldSetBadge: true }` for all kinds.
3. `useEffect(() => markRead(id))` added inside
   `/account/notification/[id]` modal on mount. Bell + push both
   benefit; the pre-existing gap gets closed as a side-effect.
4. `sendPushToUser` signature: explicit `{ userId, title, body, data }`
   — no NotificationBody derivation inside the sender.
5. Abort cap: 15s for the per-user sender.
6. Log-and-return (not throw) on missing `EXPO_ACCESS_TOKEN`.

## Implementation plan

Ordered tasks for `/mstack-code` to execute top-to-bottom. Each task
is atomic (reviewable as a single commit). Every task leaves the
codebase in a working state — pushes only start firing after Task 2,
and gain deep-link tap + foreground behaviour after Task 3.

### Task 1: `sendPushToUser` service + unit tests

- **Files:**
  - `packages/services/src/notifications/push-to-user.ts` (new)
  - `packages/services/src/notifications/__tests__/push-to-user.test.ts` (new)
  - `packages/services/src/notifications/index.ts` (edit — add export)
- **What:** New per-user push sender. Signature:
  ```
  sendPushToUser(db, userId, {
    title: string,
    body: string,
    data: Record<string, unknown>,
    notification_id: string,
  }, { expoAccessToken?: string, abortMs?: number }): Promise<{
    devices_attempted: number, devices_completed: number,
    devices_pending: number,
  }>
  ```
  Behaviour: (1) `listDevicesForUserIds(db, [userId])` — no devices
  → return zeros, no Expo call. (2) `expoAccessToken` undefined →
  `logger.warn` once + return zeros, do NOT throw. (3) Chunk +
  `sendPushNotificationsAsync` inside a 15s AbortController. (4) Per-ticket
  write to `notification_delivery` with `status: "pending"` or
  `status: "error"`. (5) `DeviceNotRegistered` tickets trigger a
  best-effort `deleteDeviceById(db, device.id)` outside the delivery
  write (mirrors broadcast's `finally` pattern). Unit tests: mock
  the Expo SDK. Cover no-device, no-token, success delivery-log
  write, DeviceNotRegistered → `deleteDeviceById` called, abort
  timeout swallowed + logged.
- **Acceptance:** `pnpm --filter @aira/services test` green. New
  file exports `sendPushToUser`. `pnpm typecheck` (10/10) clean.

### Task 2: Wire push into `createCommunityCommentOp`

- **Files:**
  - `apps/web/src/server/operations/community-comments.ts` (edit)
- **What:** Inside the existing try/catch at
  `community-comments.ts:72-97`, capture
  `createNotification`'s return `{ id }` into a local. Then, still
  inside the SAME try/catch, call `sendPushToUser` with:
  - `userId: recipientId`
  - `title: isReply ? "New reply to your comment" : "New comment on your post"`
  - `body: \`${commenter_name}: ${body_preview}\``
  - `data: { kind: "post_comment", notification_id, post_id, is_reply }`
  - `notification_id`
  - `{ expoAccessToken: env.EXPO_ACCESS_TOKEN }` (env injected at
    the op boundary — same convention `admin.ts:174-175` uses for
    the broadcast route)
  Push failure must NOT roll back the comment or the in-app row;
  the existing `.catch(logger.error)` swallows.
- **Acceptance:** manual smoke: send a comment via `POST
  /api/v1/community/posts/[id]/comments` from a user account that
  has a registered mobile device, receive push on-device. In-app
  notification row is written regardless of push success.
- **Pause if:** the recipient user has multiple registered devices
  and the delivery log wouldn't distinguish "same user two devices"
  from "two recipients" — verify the schema's user_device_id FK
  covers this cleanly (it does, per prior read of
  `notification-delivery.ts`).

### Task 3: Mobile foreground handler + tap handler wiring

- **Files:**
  - `apps/mobile/lib/notification-tap.ts` (new)
  - `apps/mobile/app/_layout.tsx` (edit — install once)
  - `apps/mobile/lib/push.ts` (edit — comment header pointer only)
- **What:** New module exports `installNotificationHandlers()` which:
  1. Calls `Notifications.setNotificationHandler({ handleNotification:
     async () => ({ shouldShowBanner: true, shouldPlaySound: true,
     shouldSetBadge: true, shouldShowList: true }) })`. Foreground iOS
     pushes now surface as banners.
  2. Installs
     `Notifications.addNotificationResponseReceivedListener((response) =>
     handleTap(response))`. Handler reads
     `response.notification.request.content.data.notification_id`
     (string check + presence check), calls
     `router.replace("/(app)/account/notification/[id]")` with
     `{ id: notification_id }`.
  3. Calls
     `Notifications.getLastNotificationResponseAsync()` once inside
     the installer — if a response is present (cold-start via
     push), same `handleTap` runs. Guard against double-fire when
     both cold-start AND active listener see the same response
     (small memoisation on the response's identifier).
  4. Exports a cleanup function for symmetry, though the intent is
     "install once at root, never uninstall". Returns the subscription
     from the listener so a caller can `.remove()` if needed.
  Root layout imports and calls once inside a `useEffect(() =>
  installNotificationHandlers(), [])` at
  `apps/mobile/app/_layout.tsx:33-39`. Same file also carries the
  fonts-loaded `useEffect` — new hook goes right after.
  `push.ts` header gains a one-line comment pointing at the tap
  module so future readers find the counterpart.
- **Acceptance:** manual smoke: (a) app foregrounded on Home,
  receive push, banner appears. (b) app backgrounded, receive
  push, tap, land on `/account/notification/[id]` for the correct
  row. (c) app fully killed (iOS force-quit), receive push, tap
  from lock screen, land on `/account/notification/[id]`. All
  three cases verified per real-device smoke.
- **Pause if:** `router.replace("/(app)/account/notification/[id]",
  { id })` fails because expo-router 6.x needs a different
  argument shape — verify against the router version pinned in
  `apps/mobile/package.json` and confirm the exact call signature
  before shipping.

### Task 4: `markRead` on notification detail modal mount

- **Files:**
  - `apps/mobile/features/notifications/hooks.ts` (edit — add
    `useMarkNotificationRead` hook wrapping the existing
    `markRead` api call)
  - `apps/mobile/app/(app)/account/notification/[id].tsx` (edit —
    call the hook on mount)
- **What:** New `useMarkNotificationRead` mutation hook in the
  notifications hooks module (mirrors the pattern of the existing
  `useNotifications` list hook, uses `useMutation` +
  `queryClient.invalidateQueries(["notifications"])` on success so
  the bell badge decrements). Inside the notification detail
  modal, add a `useEffect(() => markRead.mutate(id), [id])` that
  fires once on mount. Idempotent: markRead API is safe to call
  on an already-read notification (server-side `.changed: number`
  reports 0 on no-op).
- **Acceptance:** open a notification (via bell OR push tap),
  verify the notification's `read_at` becomes non-null on the
  server, verify the bell badge count decrements on next
  `useNotifications` refetch (5s interval, so give it 5-6s).
  Idempotency check: open the same notification twice, second
  call reports `changed: 0`.

### Task 5: Final gate

- **Files:** none
- **What:** `pnpm typecheck && pnpm lint && pnpm --filter
  @aira/services test`. Manual smoke checklist:
  1. User A comments on User B's post; User B receives push on
     Expo Go device; taps push → lands on
     `/account/notification/[id]` for the correct row.
  2. Same for reply case (User A replies to User B's comment).
  3. In-app notification row lands in bell icon regardless of
     push success. Bell badge decrements after mark-as-read
     fires on modal mount.
  4. Cold-start via push tap (kill app on iOS, tap push) also
     routes correctly.
  5. `EXPO_ACCESS_TOKEN` unset in dev: comment succeeds, in-app
     row lands, no crash, warn line in logs.
- **Acceptance:** all three commands pass. All five smoke items
  visually verified on Expo Go against a real Better Auth session.

## Open questions

None. All five plan-level open-questions were resolved during
review with recommendations locked in the tasks above:

- Sender signature — explicit params (C3).
- Tap handler install site — mobile root, no auth gate (Task 3
  handler skips if `data.notification_id` is missing).
- Abort timeout — 15s (S3).
- Quiet hours — deferred to TODOS.
- Tap route + mark-as-read wrapper — B1 + C2 resolved (route to
  `/account/notification/[id]`, mark-as-read hook added).

Anything `/mstack-code` should escalate:

- If `router.replace("/(app)/account/notification/[id]", { id })`
  fails on the pinned expo-router version (see Task 3 pause-if).
- If the `notification_delivery` schema requires additional NOT NULL
  columns not covered by the plan (unlikely — verified against
  broadcast's own writes to the same table — but call it out if
  the type-check surfaces one).
- If prod `EXPO_ACCESS_TOKEN` is confirmed unset — that's a
  deploy-config issue, not a code issue. Pause and ask the user
  before running the smoke test.
