// /notifications — full inbox. Server-rendered (latest INBOX_LIMIT). The
// bell handles the polling side; this page is a snapshot at request time,
// refreshed by router.refresh() in the Client Components when mark-read
// fires.

import { apiServerFetch } from "@aira/api/server"
import { listInboxOp } from "@/server/operations/notifications"
import { NotificationList } from "@/features/notifications"

export const metadata = { title: "Notifications" }
export const dynamic = "force-dynamic"

export default async function NotificationsPage() {
  const res = await apiServerFetch(listInboxOp, { input: {} })
  const rows = res.data?.items ?? []

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Recent activity — newest first.
        </p>
      </header>
      <NotificationList rows={rows} />
    </div>
  )
}
