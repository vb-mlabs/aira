"use client"

import { useTransition } from "react"
import { Button } from "@mlabs/ui-web/button"
import { DataList, EmptyState } from "@/lib/ui"
import type { NotificationRow } from "@mlabs/services/notifications"
import { markAllRead } from "@/features/notifications/server-actions"
import { NotificationItem } from "./notification-item"

interface NotificationListProps {
  rows: NotificationRow[]
}

export function NotificationList({ rows }: NotificationListProps) {
  const [pending, startTransition] = useTransition()
  const anyUnread = rows.some((r) => r.read_at === null)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!anyUnread || pending}
          onClick={() => {
            startTransition(async () => {
              await markAllRead()
            })
          }}
        >
          {pending ? "Marking…" : "Mark all read"}
        </Button>
      </div>
      <DataList
        data={rows}
        loading={false}
        error={null}
        keyExtractor={(r) => r.id}
        empty={
          <EmptyState
            title="No notifications yet"
            description="When something needs your attention, it'll land here."
          />
        }
        renderItem={(row) => <NotificationItem row={row} />}
      />
    </div>
  )
}
