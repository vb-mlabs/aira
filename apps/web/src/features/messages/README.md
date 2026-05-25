# features/messages

User-to-user direct messages (1:1) with polling-based delivery. Composes:

- `lib/auth` — `requireUser()` + custom `requireParticipant()` returns 404 on
  mismatch (no enumeration).
- `lib/db` — 3 tables: `conversations`, `conversation_participants`,
  `messages` (W7 migration `0003_*`).
- `lib/ui` — `EmptyState`, `LoadingState`, `DataList`.
- `lib/hooks/use-polled-fetch` — visibility-gated polling shared with the
  notifications bell.
- `features/notifications` — sending a DM also writes a `kind: "message"`
  notification so the bell badge reflects DM unread.

## Polling cadence

| Surface | Interval | Why |
|---|---|---|
| Inbox conversation list | 10s | "is there a new conversation or unread bump?" |
| Open thread | 2s | "did the other side reply?" |
| Bell (already exists) | 5s | unified unread count |

All visibility-gated — paused when `document.visibilityState !== "visible"`.

## Routes

- `GET /messages` — inbox (auth required)
- `GET /messages/[id]` — thread (auth + participant required)
- `GET /api/v1/messages/conversations` — inbox list JSON
- `GET /api/v1/messages/conversations/[id]/messages?after=<cursor>` — thread polling
- `POST /api/v1/messages/conversations/[id]/messages` — send

## Server entry points

- `openOrCreate1to1(meId, otherUserId)` — race-safe via `pair_key` UNIQUE.
- `listForUser(userId)` — inbox listing, single aggregated query.
- `send(convId, senderId, body)` — transaction: insert message + update
  conversation timestamps + (best-effort) create notification.
- `markConversationRead(convId, userId)` — updates `last_read_at` AND marks
  all `kind: "message"` notifications for this conversation as read.

## Coupling with features/notifications

DMs land in the bell via a `kind: "message"` notification row. **If you
remove `features/notifications` from a fork, also remove the
`createNotification` import + call in `server/messages.ts` and the cascade
in `markConversationRead`.** A removed-notifications fork should still send
DMs successfully (the notification write is best-effort and never blocks).

## To remove this feature

```bash
rm -rf src/features/messages
rm -rf 'src/app/(app)/messages'
rm -rf src/app/api/v1/messages
rm src/lib/db/schema/messages.ts
# In src/lib/db/schema/index.ts — remove the ./messages re-export.
# In src/app/(app)/layout.tsx — drop the "Messages" nav link.
# In src/features/notifications/types.ts — drop the "message" variant
#   from the NotificationBody union (or leave it; harmless if unused).
# Drop the migration if no fork has run it; otherwise write a
#   DROP TABLE migration.
```

No env vars added; no third-party deps.
