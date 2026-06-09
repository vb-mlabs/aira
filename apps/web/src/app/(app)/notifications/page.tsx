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
    <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 sm:py-10">
      <header className="mb-6">
        <h1 className="font-display text-3xl text-foreground sm:text-4xl">Notifications</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Recent activity — newest first.
        </p>
      </header>
      <NotificationList rows={rows} />
    </div>
  )
}
