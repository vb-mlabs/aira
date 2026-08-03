# Review: Admin Notify Users (with per-platform diagnostics)

**Date:** 2026-08-03
**Slug:** 2026-08-03-admin-notify-users
**Plan reviewed:** [2026-08-03-admin-notify-users.md](../plans/2026-08-03-admin-notify-users.md)
**Status:** approved
**UI-Significant:** no
**Reviewer:** framer@millionlabs.co.uk

---

## Summary

Ready to implement. The plan's core shape — mirror the owner broadcast,
scope to `user_device` directly, expose per-platform diagnostics — is
right and matches the immediate iOS-delivery debug wedge. Review changed
one architectural decision (reuse the existing `generic` notification
kind instead of introducing `admin_message`) and one query shape (single
grouped SELECT for the preview instead of two round-trips). Net effect
is a ~4× reduction in files touched (from ~14 down to ~7) with no
functional loss.

## Findings

### Blockers (must fix before /mlabs-code)

None remaining — the two below were raised and resolved during review.

- ~~**Wrong assumption about mobile renderer default case.**~~ The plan
  said the mobile bell renderer likely has a default case for unknown
  notification kinds. It doesn't. `apps/mobile/app/(app)/account/notifications.tsx`
  (renderPreview) and `apps/mobile/app/(app)/account/notification/[id].tsx`
  (four separate switches: actorName, actionSentence, contextExcerpt,
  subjectLine) are all TypeScript-exhaustive with no default. Adding
  `admin_message` would compile-fail until every branch was added.
  **Resolved** via the kind-reuse decision below.

- ~~**Notification kind choice was unclear.**~~ New `admin_message` vs
  reuse `generic` was open. Resolved: reuse `generic`. See Decisions.

### Concerns (raised, decided, recorded)

- **Concern:** Reusing `generic` means the notification row's `type`
  column shows `generic` for both single-user admin nudges
  (`sendAdminNotification`) and admin fan-outs (`sendUserBroadcast`).
  Analytics/audit separation is via the `audit_log.action` string
  (`user.admin_notified` vs `admin.user_broadcast_sent`), not the
  notification row itself.
  **Decision:** Accept. A future analytics need can add a
  `body.source: 'admin_single' | 'admin_broadcast'` marker without a
  new discriminated variant. For v1 the audit trail is authoritative.

- **Concern:** `business_broadcast` renderer in
  `apps/web/src/features/notifications/components/notification-item.tsx:120`
  hard-codes href = `/account/listings`. Reusing that kind for user
  blasts would land recipients on their (possibly empty) listings page.
  **Decision:** Confirms the plan's original rejection of that reuse.
  We use `generic` with `href: undefined` so no navigation happens on
  tap — recipients land on the notification detail modal via
  `notification-tap.ts`'s standard path.

- **Concern:** `KNOWN_AUDIT_ACTIONS` has a compile-time bidirectional
  coverage check (`_ActionsCoverage` in `audit-meta.ts:277`) AND
  `render-detail.tsx` has a `never`-typed default (line 288). Adding
  the new audit action requires updates in **both** files or
  `pnpm typecheck` fails.
  **Decision:** Explicit Task 1 covers both in one commit so the tree
  stays green.

- **Concern:** Preview query shape — two SELECTs
  (`resolveUserIds` → `listDevicesForUserIds`) vs one grouped SELECT.
  **Decision:** One SELECT for the preview path. Returns
  `(user_id, platform)` tuples; aggregate in TS to
  `{ user_count, device_count, by_platform: { ios, android } }`.
  The **send** path still uses the existing two-step
  (resolve → list devices) because the fan-out needs full device rows
  for the Expo token + platform bucketing.

- **Concern:** Banned-user filter policy.
  **Decision:** Filter banned users out via `isNull(user.banned_at)`
  join, consistent with owner broadcast's `resolveTargetUserIds`.

- **Concern:** `sendPushBroadcast`'s existing DeviceNotRegistered
  cleanup + AbortController + notification_delivery pattern is ~100
  lines of stable production code. Refactoring it to add per-platform
  bucketing risks destabilising the owner broadcast.
  **Decision:** Copy the loop into a new file
  `packages/services/src/notifications/push-users.ts` rather than
  refactor. A follow-up "extract shared core" refactor is deferrable.

### Suggestions (taken or deferred)

- **Taken:** Extract the `activeUserPredicate` (`isNull(banned_at)`
  guard) into a tiny helper if the same predicate appears in both
  `resolveTargetUserIds` and the new `resolveUserBroadcastAudience`.
  Only worth doing if it stays two lines; if the shape diverges
  (e.g. one joins businesses, the other doesn't), keep them separate.
  Deferrable to Task 3 author's discretion.

- **Deferred:** Extracting the shared Expo fan-out loop between
  `sendPushBroadcast` and `sendUserPushBroadcast`. Follow-up ticket
  when both are proven.

- **Deferred:** A "self smoke-test" button (send only to `ctx.userId`'s
  devices). Not needed for v1 — the platform filter + a single-user
  future picker cover it.

- **Deferred:** Dedicated `/admin/audit/broadcast/<id>` per-device
  delivery-log page. Aggregate Sent-step counts cover the debug wedge.

## Decisions locked

Net new decisions made during review:

1. **Notification kind: reuse `generic`.** No new
   `NotificationBodySchema` variant, no changes to
   `packages/db/src/types.ts`, no changes to the 5 exhaustive renderer
   switches (1 web + 4 mobile). `body.kind: 'generic'` with `title`,
   `message`, `href: undefined`. The mobile renderer already prefixes
   `${brand.name}: ` on `generic` (per `notification/[id].tsx:44`),
   which is the correct actor label for an admin blast.
2. **Audit distinguishes broadcasts from per-user nudges** via the
   `audit_log.action` string, not the notification row.
3. **Preview query: single grouped SELECT.** Send query: existing
   two-step pattern.
4. **Banned users: filtered out** via
   `isNull(user.banned_at)`.
5. **Copy-not-refactor** for the Expo fan-out loop; new file
   `push-users.ts`.
6. **Platform picker default:** `all` (matches owner broadcast
   default; iOS-only is one click away).
7. **Audit meta shape:**
   `{ kind: 'admin.user_broadcast_sent', title: string,
   recipient_count: number, platform_filter: 'all' | 'ios' | 'android' }`.
   No user_ids in meta — consistent with owner broadcast.
8. **Route paths:**
   `POST /api/v1/admin/users/broadcast` (send) and
   `POST /api/v1/admin/users/broadcast/preview` (count). No clash with
   existing `/api/v1/admin/users/[id]/*` per-user routes.

## Implementation plan

Ordered tasks for `/mlabs-code`. Each task is one commit. Every task
leaves the tree in a `pnpm typecheck` + `pnpm lint` green state.

### Task 1: Add audit action + render-detail branch

- **Files:** `packages/validators/src/audit-meta.ts` (edit) ·
  `apps/web/src/features/admin/audit/render-detail.tsx` (edit)
- **What:**
  1. Append to `AuditMeta` union:
     `{ kind: 'admin.user_broadcast_sent', title: string,
        recipient_count: number,
        platform_filter: 'all' | 'ios' | 'android' }`
  2. Append `'admin.user_broadcast_sent'` to `KNOWN_AUDIT_ACTIONS`
     (order: adjacent to `'business.broadcast_sent'`, line 269).
  3. Add label override in `AUDIT_ACTION_LABEL_OVERRIDES`:
     `'admin.user_broadcast_sent': 'User broadcast sent'`.
  4. In `render-detail.tsx`, add a case above the `default` gate:
     ```tsx
     case "admin.user_broadcast_sent":
       return (
         <>
           User broadcast &ldquo;{truncate(m.title, 60)}&rdquo; to{" "}
           {m.recipient_count}{" "}
           {m.recipient_count === 1 ? "user" : "users"} (
           {m.platform_filter === "all" ? "all platforms" : m.platform_filter})
         </>
       )
     ```
- **Acceptance:**
  - `pnpm typecheck` green (the `_ActionsCoverage` assertion and the
    `never`-typed default both hold).
  - The `/admin/audit` page renders a preview row correctly if seeded
    (or at least renders without runtime crash for an existing kind).

### Task 2: Validator schemas for user broadcast

- **Files:** `packages/validators/src/admin.ts` (edit)
- **What:**
  1. Add `UserBroadcastTargetSchema`:
     ```ts
     export const UserBroadcastTargetSchema = z.discriminatedUnion("kind", [
       z.object({ kind: z.literal("all_users_with_device") }).strict(),
       z.object({
         kind: z.literal("by_platform"),
         platform: z.enum(["ios", "android"]),
       }).strict(),
     ])
     export type UserBroadcastTarget = z.infer<typeof UserBroadcastTargetSchema>
     ```
  2. `SendUserBroadcastInputSchema` — `{ title (1..120), message (1..2000), target }`
  3. `PreviewUserBroadcastInputSchema` — `{ target }`
  4. `PreviewUserBroadcastOutputSchema`:
     ```ts
     {
       user_count: number,
       device_count: number,
       by_platform: {
         ios: { users: number, devices: number },
         android: { users: number, devices: number },
       },
     }
     ```
  5. `SendUserBroadcastOutputSchema`:
     ```ts
     {
       ok: literal(true),
       recipient_count: number,
       by_platform: {
         ios: { devices_attempted, devices_completed, devices_pending },
         android: { devices_attempted, devices_completed, devices_pending },
       },
       error_code_counts: Record<string, number>,   // DeviceNotRegistered: 2, MessageTooBig: 1, ...
     }
     ```
- **Acceptance:**
  - `pnpm typecheck` green in `@aira/validators` and every consumer.
  - Schemas exported from `packages/validators/src/index.ts`
    (or the barrel that `@aira/validators` re-exports — reviewer to
    confirm which; grep for `BroadcastTargetSchema` to see the pattern).

### Task 3: Service layer — audience resolution + fan-out

- **Files:**
  `packages/services/src/admin/service.ts` (edit) ·
  `packages/services/src/admin/index.ts` (edit) ·
  `packages/services/src/notifications/push-users.ts` (new) ·
  `packages/services/src/notifications/index.ts` (edit) ·
  `packages/services/src/notifications/__tests__/push-users.test.ts` (new)
- **What:**
  1. In `admin/service.ts`, add three functions:
     - `previewUserBroadcastCounts(db, target)` — single grouped
       SELECT joining `user_device` → `user` (WHERE `banned_at IS NULL`
       and, if `target.kind === 'by_platform'`, `platform = ?`).
       Returns `(user_id, platform)` tuples; aggregate in TS to the
       `PreviewUserBroadcastOutput` shape.
     - `resolveUserBroadcastAudience(db, target)` — same query but
       returns distinct `user_id[]` (drops platform column, dedups).
       Used by the send path.
     - `sendUserBroadcast(db, ctx, args)` — audit
       (`admin.user_broadcast_sent` with
       `{ title, recipient_count, platform_filter }`) + bulk-insert
       notifications with `type: 'generic'`, `body: { kind: 'generic',
       title, message }`. Returns
       `{ recipient_count, notifications: [{user_id, notification_id}] }`.
       Follows the same shape as `sendBusinessOwnerBroadcast` — audit
       fires even on zero recipients.
  2. Export the three from `admin/index.ts`.
  3. Create `push-users.ts` by adapting the ~100-line body of
     `push.ts::sendPushBroadcast`:
     - Signature:
       `sendUserPushBroadcast(db, ctx, args, options)` where `args`
       includes `target` (so the payload can be echoed back to the audit
       flow if needed).
     - Fan-out flow: call `sendUserBroadcast` first (audit + in-app
       rows), then `listDevicesForUserIds`, chunk via Expo SDK, same
       60s AbortController, same DeviceNotRegistered cleanup pattern
       outside the transaction.
     - **Delta from `sendPushBroadcast`:** track two counters
       (`iosBuckets`, `androidBuckets`) with
       `{ attempted, completed, pending }`, incrementing based on
       `item.device.platform`. Also track an `error_code_counts:
       Record<string, number>` map incremented on every ticket with
       `status: 'error'`.
     - Return the `SendUserBroadcastOutput` shape.
  4. Export from `notifications/index.ts`.
  5. Unit test in `push-users.test.ts` mirroring `push-to-user.test.ts`:
     mock a mixed-platform device list (2 iOS, 1 Android) and a mixed
     Expo response (iOS ok, iOS DeviceNotRegistered, Android ok);
     assert `by_platform.ios.devices_completed === 2`,
     `by_platform.android.devices_completed === 1`,
     `error_code_counts.DeviceNotRegistered === 1`, and one
     `deleteDeviceById` call for the stale iOS device.
- **Acceptance:**
  - `pnpm typecheck` green.
  - `pnpm test --filter=@aira/services` passes; the new test asserts
    all four counters above.
  - No changes to `push.ts` (owner broadcast unchanged).
- **Pause if:** `EXPO_ACCESS_TOKEN` is unavailable in the test
  environment — the new sender should mirror `sendPushBroadcast`'s
  behaviour and throw, not log-and-return. Tests should stub Expo, not
  the env; if the existing test rig needs the env set, note it and
  proceed.

### Task 4: Operations + routes

- **Files:**
  `apps/web/src/server/operations/admin.ts` (edit) ·
  `apps/web/src/app/api/v1/admin/users/broadcast/route.ts` (new) ·
  `apps/web/src/app/api/v1/admin/users/broadcast/preview/route.ts` (new)
- **What:**
  1. Add two ops in `operations/admin.ts`:
     ```ts
     export const sendUserBroadcastOp = defineOperation({
       name: "admin.users.broadcast",
       input: SendUserBroadcastInputSchema,
       output: SendUserBroadcastOutputSchema,
       permission: "admin",
       handler: (db, ctx, args) =>
         notifications.sendUserPushBroadcast(db, ctx, args, {
           expoAccessToken: env.EXPO_ACCESS_TOKEN,
         }),
     })

     export const previewUserBroadcastRecipientCountOp = defineOperation({
       name: "admin.users.broadcast.preview",
       input: PreviewUserBroadcastInputSchema,
       output: PreviewUserBroadcastOutputSchema,
       permission: "admin",
       handler: (db, _ctx, { target }) =>
         admin.previewUserBroadcastCounts(db, target),
     })
     ```
  2. Two one-liner route files exporting `.runFromRequest`,
     `export const runtime = "nodejs"` at top (matches owner broadcast
     route).
- **Acceptance:**
  - `pnpm typecheck` and `pnpm lint` green.
  - `curl -X POST http://localhost:3000/api/v1/admin/users/broadcast/preview -d '{"target":{"kind":"all_users_with_device"}}'` (with admin cookie) returns the expected shape.

### Task 5: UI — UserBroadcastButton + Modal component

- **Files:**
  `apps/web/src/features/admin/components/user-broadcast-modal.tsx` (new)
- **What:**
  1. Copy `business-broadcast-modal.tsx` as the starting point.
  2. Rename the exported component to `UserBroadcastButton` (label:
     "Notify users").
  3. Strip city/category/business picker branches. Keep audience
     picker with two radios: "All users" (default) and "By platform".
     When "By platform" selected, show a `select` with `ios` /
     `android` options.
  4. Preview text (bottom of compose step) becomes:
     "42 users match — 30 iOS, 12 Android (55 devices)". Match
     `previewLoading` / `previewCount === null` semantics of the
     original.
  5. Wire the debounced preview call to
     `/api/v1/admin/users/broadcast/preview` with the new
     `target` shape.
  6. Wire submit to `/api/v1/admin/users/broadcast`.
  7. Sent step: render a per-platform table (two rows: iOS, Android)
     with columns "attempted / completed / pending", plus an
     "Error codes" line iterating `error_code_counts` entries.
     Hide platforms that had zero attempted (keeps a
     "iOS only" send from showing an all-zero Android row).
  8. Keep compose → confirm → sent step semantics identical.
- **Acceptance:**
  - `pnpm typecheck` and `pnpm lint` green.
  - Component renders in isolation (no runtime error), audience
    picker toggles between the two branches, preview call fires
    debounced when either input changes.
- **Pause if:** `apiClient.post`'s return type on the send call
  doesn't match `SendUserBroadcastOutput` at compile time — investigate
  before adding a cast.

### Task 6: Mount + verify end-to-end

- **Files:** `apps/web/src/app/admin/users/page.tsx` (edit)
- **What:**
  1. Import `UserBroadcastButton` from
     `@/features/admin/components/user-broadcast-modal`.
  2. Mount it in the header, right-aligned. Mirror the pattern from
     `apps/web/src/app/admin/businesses/page.tsx:64` — likely as a
     `right` slot on `AdminPageHeader`, or as a sibling `<div>` above
     `<UserList>` if the header doesn't take slots yet. Grep both
     files to confirm the exact convention.
  3. Run `pnpm typecheck`, `pnpm lint`, `pnpm test`.
- **Acceptance:**
  - Button appears on `/admin/users` for admin users.
  - Clicking opens the modal.
  - Preview count matches an ad-hoc SQL run:
    `SELECT COUNT(DISTINCT user_id) FROM user_device;`
    (adjust for banned filter + platform filter).
  - Send flow completes; a `generic` notification appears in the
    recipient's `/account/notifications`; an `audit_log` row
    (`action = 'admin.user_broadcast_sent'`) is written.
  - iOS and Android device on the same Expo account each receive the
    push (this is the actual acceptance for the debug use case).
- **Pause if:** Header layout on `/admin/users` differs materially
  from `/admin/businesses` in a way that makes the button placement
  ambiguous — take a screenshot and ask.

## Open questions

- **Should the "Sent" step also link to `/admin/audit?action=admin.user_broadcast_sent`?**
  A one-line convenience link would help the admin correlate to the
  audit row. Trivial add, defer to the Task 5 implementer's discretion.

- **Rollback story if the broadcast triggers cascading customer complaints.**
  Notifications are one-way; no unsend. Copy in the confirm step
  should be adequate ("This will send to N users. It cannot be
  recalled."). Task 5 must include that warning phrasing.

---

**Handoff:** Review written to
`.mstack/reviews/2026-08-03-admin-notify-users.md`. Run `/mlabs-code`
next.
