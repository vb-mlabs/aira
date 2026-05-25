// /notifications — full inbox. Server-rendered (latest 50). The bell handles
// the polling side; this page is a snapshot at request time, refreshed when
// the user marks rows read (revalidatePath in the actions).

import { notifications } from "@mlabs/services"
import { db } from "@/lib/db"
import { getCallerContext } from "@/lib/auth/server"
import { NotificationList } from "@/features/notifications"

export const metadata = { title: "Notifications" }
export const dynamic = "force-dynamic"

export default async function NotificationsPage() {
  const ctx = await getCallerContext()
  const { rows } = await notifications.listInbox(db, ctx)

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
