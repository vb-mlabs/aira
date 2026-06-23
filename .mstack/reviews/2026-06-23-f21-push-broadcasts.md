# Review: F21 — push broadcasts to business owners

**Date:** 2026-06-23
**Slug:** 2026-06-23-f21-push-broadcasts
**Plan reviewed:** [2026-06-23-f21-push-broadcasts.md](../plans/2026-06-23-f21-push-broadcasts.md)
**Status:** approved
**UI-Significant:** no
**Reviewer:** framer@millionlabs.co.uk

---

## Summary

Plan is approved. Approach is sound: layer push delivery on top of
the existing in-app fan-out (audit + bell-icon stay bulletproof
even if Expo Push Service is down), extract a
`resolveTargetUserIds(db, target)` helper from the current
`sendBusinessOwnerBroadcast` so the four audience branches (current
all-owners + new by-city + by-categories + by-businesses) share one
SELECT path, and synchronously fan out via `expo-server-sdk` with a
60-second `AbortController` cap. Six plan-level open questions all
resolved during review. One structural change locked: route lives
at `/api/v1/profile/push-token` (under the existing `/profile/*`
namespace), not the plan's proposed `/api/v1/me/push-token` (which
would have introduced a sibling top-level namespace for one
endpoint). 17-task implementation plan ordered bottom-up so each
commit leaves the tree green. UI-Significant **no** — only the
broadcast modal touches the web UI heuristic.

## Findings

### Blockers (must fix before /mlabs-code)

None.

### Concerns (raised, decided, recorded)

- **Concern:** Plan's route at `/api/v1/me/push-token` introduces a
  new top-level `/me/*` namespace just for one endpoint. The
  codebase already has a populated `/api/v1/profile/*` namespace
  (`route.ts`, `password/route.ts`, `email/route.ts`,
  `preferences/route.ts`) for "current user's resources". Parallel
  namespaces for the same conceptual scope are an unnecessary
  cognitive split.

  **Decision:** Route is **`/api/v1/profile/push-token`**. POST
  registers a token (upsert keyed on `(user_id, expo_push_token)`),
  DELETE removes one (by token in body). Mirrors how
  `/profile/password` and `/profile/email` work today.

- **Concern:** Synchronous fan-out has no documented upper bound on
  how long the admin waits. Expo Push Service can be slow or
  unreachable; without a cap, the request hangs until the platform's
  default fetch timeout (~120s).

  **Decision:** Server-side `AbortController` cap at **60 seconds**.
  When the cap fires, `sendPushBroadcast` returns the partial state:
  `{ ok: true, recipient_count, devices_attempted, devices_completed,
  devices_pending }`. Admin UI shows
  "Sent to N owners — M devices contacted (K still in flight)" so
  the partial outcome is visible. Tighter caps (30s) lose the
  partial-state visibility; no cap risks 2-minute hangs on a real
  Expo outage. 60s is the documented Expo Push Service tail
  latency for ~95% of requests.

- **Concern:** `expo-server-sdk` is a new top-level server dep — MLabs
  convention requires explicit reviewer buy-in for new top-level
  deps.

  **Decision:** **Accepted.** Reasoning: (a) it's Expo's official
  client for their Push Service — same provenance as the
  `expo-notifications` mobile package; (b) wraps the
  100-recipient chunking + typed ticket/receipt parsing we'd
  otherwise re-implement by hand; (c) lives in
  **`packages/services/package.json`** (Q-A locked), matching how
  Postmark and Stripe primitives are scoped to the service layer.
  Future cron-triggered server-side push uses (e.g. renewal
  reminder escalation) inherit access without a second dep.

- **Concern:** Plan's "An owner whose device sent back
  `DeviceNotRegistered` on fan-out has their `user_device` row
  deleted within the same broadcast transaction" — but the broadcast
  spans the in-app fan-out (DB transaction) AND the Expo Push HTTP
  call (no transaction). Rolling back the broadcast on a Push Service
  error would be wrong; the audit + bell-icon work is the source of
  truth.

  **Decision:** Cleanup happens **OUTSIDE the broadcast transaction**.
  The broadcast commits the audit + notifications + initial
  `notification_delivery` rows; then a separate background-style
  pass (still synchronous within `sendPushBroadcast`'s execution,
  but no transaction) deletes any `user_device` rows whose tickets
  came back `DeviceNotRegistered`. A failed cleanup leaves the row
  in place for the next fan-out to retry-then-delete; harmless,
  idempotent.

- **Concern:** `notification_delivery.status` is `text`, not a
  Postgres enum. Three valid values (`pending`, `ok`, `error`)
  could drift over time if a future contributor adds a fourth
  without thinking about consumers.

  **Decision:** Stay on `text` to match the codebase pattern
  (`notifications.type` is also `text` — the comment there
  explicitly notes "we don't carry a separate boolean to avoid
  drift" and the type field stays text with Zod validation at the
  service boundary). Zod-validate the field at every service
  entry with a `z.enum(["pending","ok","error"])`. Postgres-level
  enum can land later if it ever matters.

- **Concern:** Mobile config-plugin change (adding
  `expo-notifications` to `app.config.ts.plugins[]`) is a
  native-code change. Production builds installed before this
  change won't receive push even with permission granted.

  **Decision:** Acknowledged in edge cases. After T12 lands, a
  **new EAS production build is required** for both platforms for
  push to work on real devices. Task 12 has a `Pause if` trigger
  flagging this — `/mlabs-code` pauses so the user can
  acknowledge before continuing past that point. The user has the
  full EAS build pipeline from the S0 init plan, so this is
  procedural not a blocker.

### Suggestions (taken or deferred)

- **Suggestion (taken):** Plan's recommendation that the audit row's
  `recipient_count` reflect the user-set size, not the device count.
  That's already in the acceptance criteria; explicit confirmation.
  Devices are an implementation detail of how the push lands; the
  user-facing recipient count is what the broadcast was scoped to.
- **Suggestion (taken):** Plan's "audience disabled at UI when 0
  match" behavior. UI calls a `previewRecipientCount` helper before
  enabling Send. Acceptance criterion added.
- **Suggestion (taken):** Q-B locked as **active-only** — the new
  audience branches inherit `isNull(businesses.deleted_at)` filter
  from the existing query. Archived listings' owners are excluded
  even when audience is "by_businesses". Reviewer agrees with
  plan recommendation.
- **Suggestion (taken):** Q-C locked — push payload `data` carries
  the **full notification body** (`{ kind, title, message }`), not
  just the discriminator. Stays within Expo's 4KB limit, gives F25
  deep-link wiring a clean route.
- **Suggestion (taken):** Q-E locked — receipt-polling follow-up
  plan is **written as part of F21's implementation report** (not
  this plan, not left as an open todo). Tracked, not forgotten.
- **Suggestion (deferred):** Q-D — admin-side "preview push" button.
  Out of v1 scope. Cheap to add later if first-week-of-ops needs
  the confidence; current Expo Push Tool covers the same job from
  outside the admin UI.
- **Suggestion (deferred):** Q-F — explicit "I changed my mind"
  force-re-prompt UI on mobile. The plan's manual "Enable
  notifications" account-hub row already triggers the registration
  flow (which fires the OS prompt if permission isn't granted, or
  just registers the token if it is). Same end-state. No special
  re-prompt UI needed.

## Decisions locked

Net new decisions made during review (beyond the plan's open
questions which were all resolved):

1. **Route path** — `/api/v1/profile/push-token`. POST + DELETE
   handlers. Mirrors `/profile/password` + `/profile/email`.
2. **Sync fan-out timeout** — 60s `AbortController` cap;
   partial-success reporting in the response shape and admin UI.
3. **`expo-server-sdk` location** — `packages/services/package.json`.
4. **Active-only audience** — all four audience branches inherit
   the existing `isNull(businesses.deleted_at)` filter from
   `resolveTargetUserIds`.
5. **Push payload `data` shape** — carries full
   `NotificationBody.business_broadcast` object.
6. **Receipt-polling follow-up** — written as part of F21's
   implementation report, not as a TODO comment.
7. **No "preview push" button** — out of v1 scope.
8. **No explicit re-prompt UI on mobile** — manual "Enable
   notifications" account-hub row handles the use case.
9. **Cleanup of `DeviceNotRegistered`-failed devices happens OUTSIDE
   the broadcast transaction** — broadcast commits regardless of
   Push Service errors; cleanup is best-effort, idempotent.
10. **`notification_delivery.status` stays `text`** with Zod
    validation; no Postgres enum.

## Implementation plan

Ordered tasks for `/mlabs-code` to execute top-to-bottom. 17
atomic commits across 6 phases. Order leaves the codebase in a
working state between tasks where possible.

### Phase 1 — Schema + validators (groundwork)

#### Task 1: Add `user_device` + `notification_delivery` tables

- **Files:**
  - `packages/db/src/schema/user-device.ts` (new)
  - `packages/db/src/schema/notification-delivery.ts` (new)
  - `packages/db/src/schema/index.ts` (edit — re-export)
  - `packages/db/drizzle/migrations/00XX_<auto>.sql` (new — generated)
- **What:** Schemas per the plan's "Data model changes" block
  (cascade on user_id + on notification_id + on user_device_id;
  unique on (user_id, expo_push_token); secondary indexes per
  spec). Generate the migration with
  `pnpm --filter @aira/db generate`. Apply with
  `pnpm --filter @aira/db migrate`.
- **Acceptance:**
  - Generated migration is purely additive: two `CREATE TABLE`
    statements + their indexes + their FK constraints. No
    touched columns on existing tables.
  - `pnpm --filter @aira/db migrate` applies cleanly.
  - `pnpm typecheck` passes (no consumer yet — type-only
    verification).
- **Pause if:** the generated migration contains anything other
  than `CREATE TABLE`/`CREATE INDEX`/`ALTER TABLE ADD
  CONSTRAINT` statements for the two new tables.

#### Task 2: Validators for devices + extended broadcast input

- **Files:**
  - `packages/validators/src/devices.ts` (new)
  - `packages/validators/src/admin.ts` (edit)
  - `packages/validators/src/index.ts` (edit — re-export devices)
- **What:** In `devices.ts`:
  - `RegisterPushTokenInputSchema = z.object({ expo_push_token,
    platform }).strict()` — `expo_push_token` is a non-empty
    string starting with `ExponentPushToken[` or `ExpoPushToken[`;
    `platform` is `z.enum(["ios", "android"])`.
  - `UnregisterPushTokenInputSchema = z.object({ expo_push_token })
    .strict()`.
  - `PushTokenMutationOutputSchema = z.object({ ok: z.literal(true) })`.
  - Inferred TS types.

  In `admin.ts`:
  - `BroadcastTargetSchema` — discriminated union:
    - `{ kind: z.literal("all_linked_owners") }`
    - `{ kind: z.literal("by_city"), city_id: z.string().min(1) }`
    - `{ kind: z.literal("by_categories"),
        category_ids: z.array(z.string().min(1)).min(1) }`
    - `{ kind: z.literal("by_businesses"),
        business_ids: z.array(z.string().min(1)).min(1) }`
  - Extend `BusinessOwnerBroadcastInputSchema` with
    `target: BroadcastTargetSchema.default({ kind: "all_linked_owners" })`.
    Default value keeps backward compatibility — existing modal
    submissions without `target` work unchanged.
  - Extend `BusinessOwnerBroadcastOutputSchema` with
    `devices_attempted: z.number().int().nonnegative()`,
    `devices_completed: z.number().int().nonnegative()`,
    `devices_pending: z.number().int().nonnegative()`.
- **Acceptance:**
  - `pnpm --filter @aira/validators typecheck` passes.
  - Sending `{ title, message }` without `target` to
    `BusinessOwnerBroadcastInputSchema.parse(...)` succeeds and
    yields the default.
  - Sending an unknown audience kind yields a Zod error.

### Phase 2 — Service layer

#### Task 3: Add `expo-server-sdk` dependency

- **Files:**
  - `packages/services/package.json` (edit)
  - `pnpm-lock.yaml` (edit — regenerated)
- **What:** Add `"expo-server-sdk": "^3.x"` to dependencies. Run
  `pnpm install` to refresh the lockfile.
- **Acceptance:**
  - `pnpm install` completes clean.
  - `pnpm --filter @aira/services typecheck` passes (no consumer
    yet).
- **Pause if:** `expo-server-sdk` ships peer deps that conflict
  with the workspace's existing Node version. (Unlikely — it's a
  zero-dep package — but documented for completeness.)

#### Task 4: Extract `resolveTargetUserIds` from `sendBusinessOwnerBroadcast`

- **Files:**
  - `packages/services/src/admin/service.ts` (edit)
- **What:** Refactor — extract the user-set resolution query (the
  `selectDistinct` block at lines 304–313) into a private helper
  `resolveTargetUserIds(db, target: BroadcastTarget): Promise<string[]>`
  in the same module. Implement four branches:
  - `all_linked_owners` — current behavior (active business +
    linked owner + non-banned user).
  - `by_city` — same as all_linked_owners + `eq(businesses.city_id,
    target.city_id)`.
  - `by_categories` — same + `inArray(businesses.category,
    target.category_ids)`.
  - `by_businesses` — same + `inArray(businesses.id,
    target.business_ids)`.

  Update `sendBusinessOwnerBroadcast` to take the new
  `BusinessOwnerBroadcastArgs` (with `target`), call the helper,
  carry on with audit + in-app fan-out unchanged. Output gains
  `devices_attempted: 0, devices_completed: 0, devices_pending: 0`
  placeholders (the wrapper in Task 6 will populate the real
  counts).
- **Acceptance:**
  - `pnpm --filter @aira/services typecheck` passes.
  - The existing call site (sendBusinessOwnerBroadcastOp) still
    works — the default `target: { kind: "all_linked_owners" }`
    from the validator (Task 2) feeds through, behavior is
    identical to today.
  - Manual: in dev DB, simulate
    `{ kind: "by_city", city_id: <atlanta> }` returns only the
    expected user_ids.

#### Task 5: Devices service queries

- **Files:**
  - `packages/services/src/devices/queries.ts` (new)
  - `packages/services/src/devices/index.ts` (new — barrel)
  - `packages/services/src/index.ts` (edit — `export * as devices`)
- **What:** Pure DB functions, no auth:
  - `registerDevice(db, userId, token, platform)` — upsert into
    `user_device` keyed on `(user_id, expo_push_token)` via
    `.onConflictDoUpdate({ target: [user_id, expo_push_token],
    set: { last_seen_at: new Date() }})`.
  - `unregisterDevice(db, userId, token)` — DELETE on
    `(user_id, expo_push_token)`. Idempotent.
  - `listDevicesForUserIds(db, userIds: string[])` — returns
    `Array<{ id, user_id, expo_push_token, platform }>` for the
    fan-out lookup. Empty array on empty input. Uses inArray.
  - `deleteDeviceById(db, deviceId)` — DELETE on id. Used by
    cleanup pass.
- **Acceptance:**
  - `pnpm --filter @aira/services typecheck` passes.
  - `registerDevice` called twice with same args leaves exactly
    one row; `last_seen_at` updates on the second call.
  - `unregisterDevice` on non-existent (user, token) succeeds with
    no error.

#### Task 6: Push broadcast orchestrator

- **Files:**
  - `packages/services/src/notifications/push.ts` (new)
  - `packages/services/src/notifications/index.ts` (edit — re-export
    `sendPushBroadcast`)
- **What:** New `sendPushBroadcast(db, ctx, args)` function:
  1. Calls `sendBusinessOwnerBroadcast(db, ctx, args)` — gets back
     `{ ok, recipient_count }` plus the resolved `userIds` array
     (refactor task 4's signature to return userIds too, or do a
     second `resolveTargetUserIds` call here — the second call is
     cheaper than reshaping signatures; pick one at code time).
  2. Calls `devices.listDevicesForUserIds(db, userIds)` to get
     `Array<{ id, expo_push_token }>`.
  3. Constructs the Expo Push messages:
     `{ to: expo_push_token, sound: "default", title: args.title,
     body: args.message, data: { kind: "business_broadcast",
     title: args.title, message: args.message } }` — payload
     mirrors the in-app notification body per Q-C.
  4. Uses `expo-server-sdk`'s `chunkPushNotifications()` to split
     into chunks of ≤100.
  5. Sends each chunk via `expo.sendPushNotificationsAsync(chunk)`
     wrapped in `AbortController` with 60s cap. Track
     completed/pending counts.
  6. For each ticket: insert one `notification_delivery` row
     keyed on `(notification_id, user_device_id)` with
     `status: "pending"` for `ok` tickets (including `ticket_id`)
     or `status: "error"` + `error_code` for rejected tickets.

     `notification_id` here is the in-app notification row
     created by `sendBusinessOwnerBroadcast` — that bulk-insert
     in Task 4 will need to return the inserted ids so we can
     join per user_id → notification_id → push delivery
     attempts. (Drizzle's `.returning({ id, user_id })` handles
     this.)
  7. **OUTSIDE the transaction:** find tickets with
     `error_code === "DeviceNotRegistered"` and call
     `devices.deleteDeviceById(db, …)` for each — best-effort
     cleanup, no rollback impact on the broadcast itself.
  8. Returns extended output:
     `{ ok: true, recipient_count, devices_attempted,
     devices_completed, devices_pending }`.
- **Acceptance:**
  - `pnpm typecheck` passes across all packages.
  - With a mocked `expo-server-sdk` (Vitest), the orchestrator:
    - Calls `sendBusinessOwnerBroadcast` once.
    - Calls `chunkPushNotifications` with the device-count messages.
    - Inserts the right `notification_delivery` rows per ticket.
    - Deletes devices where ticket returned
      `DeviceNotRegistered`.
  - Manual: in dev, fire a broadcast targeting a user with a
    fake `ExpoPushToken[abc]` token — get back `devices_attempted:
    1, devices_completed: 0, devices_pending: 0,
    error rows: 1, error_code: "DeviceNotRegistered"`. Device
    row deleted post-broadcast.
- **Pause if:** Drizzle's transaction signature blocks returning
  inserted ids in the bulk insert.

### Phase 3 — API ops + routes (web)

#### Task 7: Register/unregister push token ops

- **Files:**
  - `apps/web/src/server/operations/profile.ts` (edit — add new
    ops alongside existing profile ops) OR new
    `apps/web/src/server/operations/devices.ts` if profile is
    crowded (pick at code time; profile.ts is the more
    consistent location).
- **What:** Two ops, both `permission: "user"`:
  - `registerPushTokenOp` — input `RegisterPushTokenInputSchema`,
    output `PushTokenMutationOutputSchema`. Handler calls
    `devices.registerDevice(db, ctx.userId, input.expo_push_token,
    input.platform)`.
  - `unregisterPushTokenOp` — input
    `UnregisterPushTokenInputSchema`, output same. Handler calls
    `devices.unregisterDevice(db, ctx.userId,
    input.expo_push_token)`.
- **Acceptance:**
  - `pnpm --filter @aira/web typecheck` passes.

#### Task 8: API route handler

- **Files:**
  - `apps/web/src/app/api/v1/profile/push-token/route.ts` (new)
- **What:** Thin route handler matching the
  `community/posts/[id]/interests/route.ts` shape:
  ```ts
  export const runtime = "nodejs"
  export const POST = registerPushTokenOp.runFromRequest
  export const DELETE = unregisterPushTokenOp.runFromRequest
  ```
- **Acceptance:**
  - POST `/api/v1/profile/push-token` with valid body + session
    returns `{ ok: true }` and inserts a `user_device` row.
  - DELETE `/api/v1/profile/push-token` with valid body + session
    removes the row.
  - Anonymous calls return 401.

#### Task 9: Update broadcast op to use new wrapper + target

- **Files:**
  - `apps/web/src/server/operations/admin.ts` (edit)
- **What:** Update `sendBusinessOwnerBroadcastOp`:
  - Input schema already accepts the new `target` field (Task 2).
  - Output schema already includes `devices_*` counts (Task 2).
  - Handler switches from
    `admin.sendBusinessOwnerBroadcast(db, ctx, args)` to
    `notifications.sendPushBroadcast(db, ctx, args)` (the wrapper
    that calls the underlying admin function internally).
- **Acceptance:**
  - `pnpm --filter @aira/web typecheck` passes.
  - Hitting `POST /api/v1/admin/businesses/broadcast` without a
    target field returns the same shape as today plus the new
    `devices_*` fields.
  - Hitting it with `target: { kind: "by_city", city_id: <atlanta> }`
    fans out to only Atlanta-owner devices.

#### Task 10: Env var declaration + docs

- **Files:**
  - `apps/web/src/config/env.ts` (edit)
  - `.env.example` (edit)
- **What:** Add `EXPO_ACCESS_TOKEN: z.string().min(20).optional()`
  to the env schema. Optional at the type level — the server-side
  push code throws a clear error if it's missing AT FAN-OUT TIME
  (not at boot) so dev environments without push setup can still
  boot.

  `.env.example` gains a section explaining how to generate one
  at https://expo.dev/settings/access-tokens scoped to the
  `million-labs` org.
- **Acceptance:**
  - `pnpm --filter @aira/web typecheck` passes.
  - Without `EXPO_ACCESS_TOKEN` set, web app boots normally; firing
    a broadcast surfaces "Push delivery requires EXPO_ACCESS_TOKEN"
    error.
  - With the env set, broadcasts work end-to-end.

### Phase 4 — Admin UI

#### Task 11: Extend broadcast modal with audience picker + partial-success display

- **Files:**
  - `apps/web/src/features/admin/components/business-broadcast-modal.tsx`
    (edit)
- **What:** Two scope additions:
  1. **Audience picker** between the compose + confirm steps:
     - Radio group: "All linked owners" (default) / "By city" /
       "By categories" / "By businesses".
     - When "By city" selected: city dropdown from existing
       `listCitiesAdminOp` (already used elsewhere).
     - When "By categories" selected: multi-select using
       `listCategoriesTreeOp` (already used by /admin/businesses
       Edit Categories — same data source).
     - When "By businesses" selected: typeahead-style
       business multi-picker; reuse existing pattern from admin
       users page if available, otherwise simple multi-select of
       all businesses.
     - **Live recipient count preview** — debounced call to a
       new `previewBroadcastRecipientCountOp` (small addition
       to admin.ts ops) that just runs `resolveTargetUserIds`
       and returns the count. Updates as the audience selection
       changes.
     - **Send disabled** when count is 0.
  2. **Confirm step extension:** show "Will send to N owners"
     before the send button. After send, the success step shows
     the extended output: "Sent to N owners — M devices
     contacted, K still in flight (Expo Push delivery is
     async; full receipt confirmation arrives in ~15 minutes)."
- **Acceptance:**
  - `pnpm --filter @aira/web typecheck` + lint pass.
  - Modal opens → compose step → audience picker shows 4 radio
    options.
  - Selecting "By city = Atlanta" updates the count below the
    picker within ~500ms.
  - Send button greys out when count is 0.
  - After a successful broadcast, the success step shows the
    user_count + devices_attempted/completed/pending.
  - Existing "all linked owners" one-click flow (default audience)
    still completes in the same number of clicks as today.

### Phase 5 — Mobile

#### Task 12: `expo-notifications` dep + config plugin

- **Files:**
  - `apps/mobile/package.json` (edit)
  - `apps/mobile/app.config.ts` (edit)
  - `pnpm-lock.yaml` (edit)
- **What:**
  - Add `"expo-notifications": "~0.32.x"` (or run `pnpm expo
    install expo-notifications` for the SDK 55-pinned version).
  - Add `"expo-notifications"` (or `["expo-notifications", { ...
    config }]` if customising icon/color/sound) to
    `app.config.ts.plugins[]` near the other plugin entries.
  - Run `pnpm install` to refresh the lockfile.
- **Acceptance:**
  - `pnpm install` clean.
  - `pnpm --filter @aira/mobile typecheck` passes.
- **Pause if:** **ALWAYS PAUSE** after this task to remind the
  user that they need to fire a new EAS production build for
  both platforms before push notifications work on real devices.
  The plugin change is a native-code change; existing TestFlight +
  Play Internal Testing builds installed before this commit will
  NOT receive push even with the OS permission granted. The user
  acknowledges + continues; `/mlabs-code` doesn't automatically
  trigger the build (that's their call when ready).

#### Task 13: Push registration utility

- **Files:**
  - `apps/mobile/lib/push.ts` (new)
- **What:** `requestPermissionAndRegister()` exported function:
  1. Calls `Notifications.getPermissionsAsync()` to check current
     state.
  2. If `granted` — skip prompt, go to step 4.
  3. If not — calls `Notifications.requestPermissionsAsync()`.
     If user denies, return `{ granted: false }`.
  4. Calls `Notifications.getExpoPushTokenAsync({ projectId:
     <eas projectId from app.config.ts extra.eas.projectId> })`.
  5. POSTs the token + platform (`Platform.OS`) to
     `/api/v1/profile/push-token` via the existing `apiClient`.
  6. On success: write `pushRegistrationCompleted=true` to
     `expo-secure-store`.
  7. On any error: log + return `{ granted: false, error }`.
- **Acceptance:**
  - `pnpm --filter @aira/mobile typecheck` passes.
  - Manual flow on a dev build:
    - User taps the trigger, OS prompt fires.
    - On grant → POST succeeds, `user_device` row appears.
    - On deny → no API call, secure-store flag stays unset.

#### Task 14: Pre-prompt screen

- **Files:**
  - `apps/mobile/app/(auth)/notifications-pre-prompt.tsx` (new
    expo-router screen) OR `apps/mobile/components/notifications-pre-prompt-modal.tsx`
    if rendered as a modal in the post-login flow (pick at code
    time — modal is less route-shape disruption).
- **What:** Small screen / modal:
  - Title: "Stay in the loop"
  - Body: "AIRA admins occasionally send updates about your
    listings — payment confirmations, listing reviews, renewal
    reminders. Enable notifications to get them on your lock
    screen."
  - "Enable notifications" primary button → calls
    `requestPermissionAndRegister()` from Task 13. On either
    outcome (grant or deny), advance to the post-login
    destination.
  - "Maybe later" secondary button → sets
    `pushPrePromptDismissed=true` in secure-store, advances
    without firing the OS prompt.
  - Cancel-able via the back gesture (treats as "Maybe later").
- **Acceptance:**
  - `pnpm --filter @aira/mobile typecheck` + lint pass.
  - Visual: screen renders with both buttons, brand-aligned
    styling, no truncation on small screens (iPhone SE width).

#### Task 15: Post-login flow gating

- **Files:**
  - `apps/mobile/app/(app)/_layout.tsx` (edit — first signed-in
    layout) OR wherever the post-auth redirect lives.
- **What:** On first render after sign-in, check
  `pushRegistrationCompleted` + `pushPrePromptDismissed` in
  secure-store. If NEITHER is set, route to / show the pre-prompt
  screen before the home tab. Otherwise pass through.
- **Acceptance:**
  - Fresh install: sign in → pre-prompt screen → tap "Maybe
    later" → home tab. Subsequent sign-ins skip the pre-prompt.
  - Manual reset (clear secure-store) re-shows the pre-prompt on
    next sign-in.

#### Task 16: Account-hub "Enable notifications" row

- **Files:**
  - `apps/mobile/app/(app)/account.tsx` (edit) OR the account hub
    component location.
- **What:** Add a new menu row with `Bell` icon labeled "Enable
  notifications" that:
  - On tap, calls `requestPermissionAndRegister()` from Task 13.
  - If permission already granted: just refreshes the token
    (re-POSTs to `/profile/push-token`); shows toast "Notifications
    enabled".
  - If not yet granted: fires the OS prompt; on grant, registers
    + shows toast.
  - If user previously denied at the OS level: explain in toast
    "Enable in Settings → AIRA → Notifications" (Settings deeplink
    if iOS API supports it).

  Row is always visible (no conditional show/hide) — handles all
  user paths.
- **Acceptance:**
  - Manual: row visible in account hub. Tapping when not yet
    registered fires the OS prompt. Tapping after grant
    re-registers cleanly.

### Phase 6 — Docs

#### Task 17: FORK_CHECKLIST + roadmap updates

- **Files:**
  - `FORK_CHECKLIST.md` (edit — derived fork checklist)
  - `roadmap.md` (edit)
- **What:**
  - Add to `FORK_CHECKLIST.md`:
    - "Generate `EXPO_ACCESS_TOKEN` at expo.dev/settings/access-tokens
      scoped to the org; set in Replit prod secrets."
    - "After adding `expo-notifications` plugin to
      `app.config.ts`, run new EAS production builds for both
      platforms before push will work on real devices."
  - Roadmap update:
    - Flip F21 in Sprint 5 from ⬜ to ✅ in the sprint table.
    - Update "What's pending" callout — F21 no longer the
      outstanding S5 item.
    - Add a 2026-?? off-roadmap entry covering F21's ship
      (data tables, ops, mobile permission flow, audience
      expansion, runbook gotchas around the config-plugin
      build requirement).
    - Add a decision-log entry summarizing the 10 locked
      decisions from this review.
- **Acceptance:**
  - Both files updated; entries reference this review by slug.
  - `roadmap.md` "What's pending" callout flips S5 mention
    accordingly.

## Open questions

Anything still unresolved that `/mlabs-code` should escalate, not
guess.

- None. All six plan-level open questions + four new
  review-surfaced concerns resolved above. Task 12 carries a
  hard `Pause if` trigger for the EAS-rebuild-required
  reminder; Tasks 1 + 6 carry softer `Pause if` triggers for
  migration anomalies / Drizzle signature blockers.
