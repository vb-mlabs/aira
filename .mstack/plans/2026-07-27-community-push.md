# Plan: Push notifications for community comments + replies

**Date:** 2026-07-27
**Slug:** 2026-07-27-community-push
**Status:** implemented
**Author:** vb-mlabs (with Claude)

---

## Problem

The community discussion loop currently ends at the in-app bell icon.
When someone comments on a user's post or replies to their comment, an
in-app notification lands in the `notifications` table and shows on the
`/account/notifications` screen — but the user only sees it if they
open the app. There is **no lock-screen push**, so the second half of
the loop (recipient opens app, replies back, thread stays warm) breaks
whenever the recipient isn't actively browsing.

The infrastructure to close this is 90% present: mobile devices already
register their Expo push token (`apps/mobile/lib/push.ts` →
`/api/v1/profile/push-token` → `user_device`), and the server has a
working push sender for admin business broadcasts
(`sendPushBroadcast` in `packages/services/src/notifications/push.ts`).
The gap is a per-user sender + a wiring in the comment op + a
mobile-side tap handler that opens the right post on tap.

**Who benefits:** community post authors (get notified when someone
engages), commenters (get notified when someone replies to a thread
they started), and the community loop as a whole (engagement stops
requiring active polling). Success = a mobile user who receives a
push for a reply and taps it lands on the post detail screen with
the thread visible.

## Scope

**In:**

- Real system-tray push notifications on mobile for the two comment
  events already in the in-app fan-out:
  - Top-level comment on your post
  - Reply to your comment
- New per-user sender `sendPushToUser` in
  `packages/services/src/notifications/push.ts`, mirroring the shape
  of `sendPushBroadcast` (Expo SDK client, chunk, ticket handling,
  `notification_delivery` log rows, immediate `DeviceNotRegistered`
  cleanup).
- Wire it into `createCommunityCommentOp` in
  `apps/web/src/server/operations/community-comments.ts`. Push
  dispatch runs alongside the existing `createNotification` call —
  same try/catch, same log-and-continue on failure. Push is a
  delivery accelerant on top of the in-app row; both must land or
  fail independently.
- Push payload `data` carries `{ kind: "post_comment", notification_id,
  post_id, is_reply }` so the mobile tap handler can route to the
  correct post detail.
- Mobile push-tap handler in `apps/mobile/lib/notification-tap.ts` —
  installs `Notifications.addNotificationResponseReceivedListener`
  in the root layout, reads `response.notification.request.content.data`,
  routes to `/community/[id]` (existing post-detail route). Also
  handles the "cold start via push" case via
  `Notifications.getLastNotificationResponseAsync()` so a tap-to-open
  from a locked device works.
- Copy locked (per user 2026-07-27):
  - Title: `"New comment on your post"` (top-level) or `"New reply
    to your comment"` (reply).
  - Body: `"${commenterName}: ${body_preview}"` — `body_preview` is
    the same clipped preview already stored on the in-app
    NotificationBody (see `community-comments.ts:86`,
    `BODY_PREVIEW_MAX`). Total body typically <120 chars.

**Out (deferred):**

- **Push opt-outs.** Per-event `push_on_post_comment_reply` columns
  on `user` — user 2026-07-27 chose "no opt-outs, device-registered
  = all pushes" for MVP. Users control notifications at the OS level
  (iOS Settings > AIRA > Notifications, or turning off registration
  from the account hub). If users complain, add later — the fan-out
  site is one line.
- **Push for `post_interest`** and **push for direct `message`**
  events. Same helper `sendPushToUser` will slot in when we do those,
  but they're not in this feature's scope (user 2026-07-27).
- **Full receipt polling** (delayed Expo `/receipts` poll for
  `DeviceNotRegistered` / `MessageTooBig` / `MismatchSenderId` that
  surface only in the delayed receipt, not the immediate ticket).
  Deferred as a follow-up TODO — the current fan-out catches
  DeviceNotRegistered from the immediate ticket (~95% of stale-token
  cases per Expo's docs). Same gap exists on the broadcast side today;
  a single cron/edge job can close both when it lands.
- **Debouncing/collapsing bursts** (a user getting 5 comments in 3
  seconds gets 5 pushes). Expo Notifications doesn't natively
  collapse; iOS + Android group notifications by app anyway. Note in
  edge cases, revisit if user complaints.
- **Push analytics** (delivery success rate, tap-through rate) —
  `notification_delivery` rows are there for a future dashboard;
  not building one in this pass.
- **Web push notifications** — this plan is mobile-only. Web keeps
  the bell icon.

## Approach

**Reuse the shape of `sendPushBroadcast` — one new function, one
call site, one tap handler.**

`sendPushBroadcast` (`packages/services/src/notifications/push.ts:45`)
is the canonical push pattern this project has already made
decisions about (F21 review: 60s abort cap, partial-success
reporting, `data` carries full body, `DeviceNotRegistered` cleanup
outside the transaction). The new `sendPushToUser` is a scoped-down
sibling that:

1. Takes `db`, `userId`, and a partial `ExpoPushMessage` (title,
   body, `data`) — everything the caller needs to inject without
   knowing the SDK.
2. Looks up the user's devices via the existing
   `listDevicesForUserIds(db, [userId])` service. Short-circuits when
   the user has no registered devices — no Expo call, no delivery log.
3. Bails early when `EXPO_ACCESS_TOKEN` is missing — `logger.warn` +
   return, **not throw**. A missing env in dev must NOT block the
   comment op path. (This is a deliberate departure from
   `sendPushBroadcast`'s throw behaviour, justified by the fact that
   comment creation is a hot path for end users, whereas admin
   broadcasts are a slow discrete admin action.)
4. Uses Expo SDK's `chunkPushNotifications` + `sendPushNotificationsAsync`
   with a 15s abort cap (shorter than broadcast's 60s — this is a
   per-request path, not a batch operation).
5. Writes `notification_delivery` rows per device (same schema
   `sendPushBroadcast` writes to). Ticket errors of `DeviceNotRegistered`
   trigger an immediate `deleteDeviceById` best-effort — matches the
   broadcast pattern verbatim.
6. Returns `{ devices_attempted, devices_completed, devices_pending }`
   for the caller to log — but the caller does not surface the
   number to the user. It's silent-on-success from a UX standpoint.

**The op handler's changes are minimal.** In
`apps/web/src/server/operations/community-comments.ts` the
existing `createNotification` call at :78-89 sits inside a
try/catch that already logs failures. The push dispatch runs **after
the in-app notification succeeds** (so we always have a
`notification_id` to embed in the push payload), inside the same
try/catch. Order: create in-app row → get its id → dispatch push
using that id in `data.notification_id`. If push fails, the caught
error logs — but the in-app row already exists so the user still
sees the notification in the bell icon on next app open.

**Mobile tap wiring is the missing infrastructure.** A new
`apps/mobile/lib/notification-tap.ts` module installs the
`expo-notifications` response listener in the root layout
(`apps/mobile/app/_layout.tsx`) and handles two entry paths:

- **Cold start** (app was killed, user tapped push): read
  `Notifications.getLastNotificationResponseAsync()` once on mount,
  route to `/community/[post_id]`.
- **Warm start** (app in background, user tapped push): the
  `addNotificationResponseReceivedListener` fires while the app is
  still mounted. Same routing.

The tap payload has enough info to route: `data.post_id` +
`data.notification_id`. The tap handler ALSO marks the notification
as read via the existing
`markNotificationAsReadOp` (`/api/v1/notifications/[id]/read`) so
the bell badge count decrements when the user opens the post from
push. Minor UX polish, uses code that already exists.

**Alternatives considered:**

- **Inline the Expo call inside the op handler** — rejected. The
  service layer is the right home per CLAUDE.md's service-layer
  rule; ops are thin adapters. A per-event helper also keeps the
  op handler readable and lets the two future push wirings
  (post_interest, message) share it.
- **Skip the tap handler and rely on OS default behaviour** —
  rejected. The default on iOS is "open the app to its last state,"
  which for most users is Home — not the post they just got pinged
  about. A push that lands you on Home instead of the post feels
  broken; adding the handler is 40 lines and the F21 broadcast
  path already ships push payloads with `kind` — building the
  handler now serves both.
- **Add per-event opt-out columns preemptively** — rejected per
  user 2026-07-27 decision. MVP posture matches existing broadcast
  behaviour (no opt-outs beyond OS-level and device-registration).
  Follow-up if users complain.
- **Merge multiple pending pushes for the same recipient inside a
  short window (debounce/collapse)** — rejected. Expo Notifications
  doesn't natively support server-side collapse; iOS + Android
  group by app on the client. Community comments arrive minute-scale
  in practice — a 5-comment burst is unusual enough to defer.

## Data model changes

**None.**

- No new column on `user` (no opt-outs for MVP).
- No new column on `notifications` (in-app schema unchanged).
- No new column on `notification_delivery` (schema fits both
  broadcast + per-user senders).
- No new table.

The `notification_delivery` table already exists (from F21) and its
foreign keys (`notification_id`, `user_device_id`) already carry
what we need to log per-device push attempts for the per-user
path. Verified against
`packages/db/src/schema/notification-delivery.ts`.

## Files to touch

**New:**

- `packages/services/src/notifications/push-to-user.ts` — the
  scoped-down sender. Kept in its own file rather than added to
  `push.ts` so the two functions can be read side-by-side without
  scrolling; `push.ts`'s F21 comment block is dense.
- `apps/mobile/lib/notification-tap.ts` — Expo Notifications
  response listener + cold-start `getLastNotificationResponseAsync`
  handler + `/community/[post_id]` routing.
- `packages/auth/src/__tests__/…` — not applicable. Auth-package
  tests go there; notification service tests go under a to-be-created
  `packages/services/src/notifications/__tests__/` sibling (mirrors
  the pattern packages/api/tests uses).
- `packages/services/src/notifications/__tests__/push-to-user.test.ts`
  — unit tests. Mock the Expo SDK's `sendPushNotificationsAsync`,
  assert: empty-device short-circuit, missing-token log-and-return
  (does NOT throw), success with delivery log write,
  DeviceNotRegistered → deleteDeviceById call, abort-cap timeout
  behaviour.

**Edit:**

- `packages/services/src/notifications/index.ts` — export
  `sendPushToUser` next to `sendPushBroadcast`.
- `apps/web/src/server/operations/community-comments.ts` — inside
  the existing try/catch at :72-97, after the `createNotification`
  await, capture the returned `id`, then call `sendPushToUser` with
  title + body + data payload. Env token injected from
  `apps/web/src/config/env.ts` (`EXPO_ACCESS_TOKEN`) — pattern
  already used by the broadcast route (grep
  `apps/web/src/app/api/v1/admin/businesses/broadcast/` to confirm
  the env injection convention).
- `apps/mobile/app/_layout.tsx` — import and install the tap
  handler once at root. Uses the existing router singleton for
  navigation; no context / state hookup needed.
- `apps/mobile/lib/push.ts` — add a comment header line pointing
  at `notification-tap.ts` so future readers find the counterpart.
  No functional change to the token-registration flow.

## Edge cases

- **User has no registered devices** (email-only user, or
  registration rejected). `sendPushToUser` short-circuits after the
  device lookup — no Expo call, no delivery-log rows, no cost.
  Comment op still succeeds; in-app notification still lands.
- **`EXPO_ACCESS_TOKEN` missing in dev.** `sendPushToUser`
  `logger.warn`'s and returns cleanly. **Deliberate deviation from
  `sendPushBroadcast`, which throws** — comment creation is a hot
  end-user path; a missing env in dev must not block it.
  Admin broadcasts remain fail-loud because they're a discrete
  admin action.
- **Expo network error / timeout on `sendPushNotificationsAsync`.**
  15s abort cap fires; the caught exception logs; the caller's
  try/catch swallows. In-app row already committed. No user-facing
  failure.
- **`DeviceNotRegistered` in ticket response.** Immediate
  `deleteDeviceById` best-effort — same shape as `sendPushBroadcast`.
  If the delete throws, swallow. The next push attempt will retry
  and re-cleanup.
- **Push fires before user_device row is written** (race between
  registration POST and comment fan-out). No — `listDevicesForUserIds`
  is called synchronously at fan-out time; the race window is
  someone-registering-device-DURING-a-comment. Cost is one missed
  push, next comment will land it.
- **Multiple devices for one user** (phone + tablet). The service
  loops all devices; both get the push. Expected — matches how iOS
  handles push across paired devices anyway.
- **App is foregrounded on the post detail page for the same post
  the push is about.** The push still lands in the OS notification
  centre; the user sees it. Not a bug — iOS handles the "foreground
  suppression" question at the OS level (via
  `setNotificationHandler` in `expo-notifications`). Out of scope.
- **Cold start via push tap.** `notification-tap.ts` uses
  `getLastNotificationResponseAsync()` on mount to catch the case
  where the app was fully killed. Route: `router.replace` (not
  `push`) to `/community/[post_id]` so the back button returns to
  the home tab, not to a phantom pre-notification screen.
- **Post got deleted between push send and tap** (rare — deletes
  cascade the notification row too). The `/community/[id]` route
  will fetch and render its own not-found state. Not this plan's
  problem.
- **Body preview contains an emoji sequence that breaks at a
  surrogate pair boundary.** `BODY_PREVIEW_MAX` already handles
  this via the existing `clip()` helper (assumption — reviewer to
  verify). If not, this is a pre-existing bug in the in-app
  notification body, not introduced here.
- **Notification tap while the app is on a different route in the
  Listings tab.** `router.replace("/community/[id]")` crosses tabs
  cleanly (same primitive the goBackTo fix now uses for cross-tab
  nested; see `.mstack/fixes/2026-07-27-1155-back-nav-cross-tab-nested.md`).
- **Push fires but `notification_id` in `data` doesn't match the
  in-app row** (would only happen if the caller reordered). The
  `createNotification` call MUST come first and its returned `id`
  used verbatim — sequencing enforced by the op handler order.
  Reviewer should assert this in the code review.

## Acceptance criteria

- [ ] `sendPushToUser` exports from
      `packages/services/src/notifications`.
- [ ] Unit tests for `sendPushToUser` cover: no-device
      short-circuit, missing-EXPO_ACCESS_TOKEN log-and-return (no
      throw), success writes delivery rows, DeviceNotRegistered
      deletes the device, abort timeout swallows and logs.
      `pnpm --filter @aira/services test` runs green.
- [ ] `createCommunityCommentOp` calls `sendPushToUser` inside the
      existing try/catch, using the `notification_id` returned by
      `createNotification`. Push title matches the locked copy
      (`"New comment on your post"` vs `"New reply to your
      comment"`), body matches `"${commenterName}: ${body_preview}"`.
- [ ] `data` payload includes: `kind: "post_comment"`,
      `notification_id`, `post_id`, `is_reply`.
- [ ] Push failure does NOT roll back the comment insert or the
      in-app notification row (both are already committed by the
      time the push dispatch runs). Verified by unit-testing the
      op handler with a throwing `sendPushToUser` mock.
- [ ] Mobile: `notification-tap.ts` installs the response listener
      at root. Cold-start path (via `getLastNotificationResponseAsync`)
      routes to `/community/[post_id]`. Warm-start path (via
      `addNotificationResponseReceivedListener`) does the same.
- [ ] Mobile: tapping the push also fires the
      `markNotificationAsReadOp` for `data.notification_id` so the
      bell badge count decrements. Best-effort; failure logged only.
- [ ] `pnpm typecheck` (10/10), `pnpm lint` (3/3), `pnpm build`
      (web) all clean.
- [ ] Real-device smoke on Expo Go: two users, User A comments on
      User B's post, User B receives push on-device, taps push,
      lands on `/community/[post_id]`. Repeat for reply case.
- [ ] Real-device smoke: cold-start (fully kill app on iOS, receive
      push, tap) also routes correctly.
- [ ] `notification_delivery` rows are written per-device per-push
      for future analytics reads.

## Open questions

For the reviewer (`/mstack-review`) to resolve before implementation.

- **Should `sendPushToUser` accept a `NotificationBody` and derive
  title/body from `kind`, or accept title/body/data explicitly?**
  Recommend explicit — the callers know their copy best, and having
  the sender own the mapping would grow into a mini template system.
  Alternative: a `push-copy.ts` module that maps `NotificationBody →
  { title, body }` and lives next to the sender. Reviewer picks.
- **Confirm `notification-tap.ts` installation site.** Options:
  (a) `apps/mobile/app/_layout.tsx` root, once; (b)
  `apps/mobile/app/(app)/_layout.tsx` so only signed-in users get
  it; (c) a hook `useNotificationTap()` called from the root.
  Recommendation: (a) with a signed-in gate inside the handler
  (skip route if `useMe().data` is null). Simpler mental model.
- **Abort timeout for `sendPushToUser`.** Broadcast uses 60s. Per-
  request 15s or 10s. Reviewer picks; 15s recommended for headroom
  on slow networks.
- **Should the push respect a per-user quiet-hours window** (e.g.
  no pushes 10pm–7am recipient-local)? Recommend NO for MVP — no
  timezone info stored, adds admin complexity. Note as a follow-up
  if user requests.
- **Notification tap route.** Currently the plan says
  `/community/[post_id]`. Confirm the mobile app has that route
  (it does — `apps/mobile/app/(app)/post/_layout.tsx` header comment
  at line 13 references community-board and notifications-screen
  taps both opening it, so the route is `/(app)/post/[id]`
  actually — grep and confirm the exact expo-router path).
  Reviewer to verify and pin the correct route string.
- **`markNotificationAsReadOp` from the tap handler**: is there a
  mobile client wrapper for it, or does the tap handler need to
  hit the raw API? Grep
  `apps/mobile/features/notifications/api.ts` (if it exists) or
  the `hooks.ts` sibling. If no wrapper exists, adding one is
  <10 lines and lives in the same PR.
