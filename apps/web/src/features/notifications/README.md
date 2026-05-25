# features/notifications

In-app notification inbox + nav bell. Composes:

- `lib/auth` — `requireUser()` on every entrypoint.
- `lib/db` — `notifications` table (W6 migration `0002_*`).
- `lib/ui` — `EmptyState`, `LoadingState`, `DataList` (typed; mandatory states).

## Routes

- `GET /notifications` — inbox (server-rendered; latest 50).
- `GET /api/notifications/unread-count` — bell polls every 5s.

## Server entry points

- `createNotification({ userId, body })` — typed creator. **Use this** from
  other features when an event should land in a user's inbox.
- `markRead(id)` — server action. Authz by `id + user_id` predicate, so
  cross-user attempts return "not found" (no enumeration signal).
- `markAllRead()` — server action.

## Polling vs realtime

This feature polls. The bell pauses polling when
`document.visibilityState !== "visible"` to keep idle tab cost negligible
(important on Neon free tier).

## To remove this feature

```bash
rm -rf src/features/notifications
rm -rf 'src/app/(app)/notifications'
rm -rf src/app/api/notifications
rm src/lib/db/schema/notifications.ts
# In src/lib/db/schema/index.ts — remove the ./notifications re-export.
# In src/app/(app)/layout.tsx — drop <NotificationBell />.
# In src/features/profile/components/notifications-section.tsx — restore the
#   "no inbox" copy.
# Drop the corresponding migration if no fork has run it yet, OR write a
#   DROP TABLE migration if it has shipped.
```

No env vars added; no third-party deps.
