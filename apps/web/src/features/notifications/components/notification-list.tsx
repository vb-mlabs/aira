"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { ApiError } from "@aira/api"
import { Button } from "@aira/ui-web/button"
import type { NotificationRow } from "@aira/validators/notifications"
import { apiClient } from "@/lib/api-client"
import { DataList, EmptyState } from "@/lib/ui"
import { NotificationItem } from "./notification-item"

interface NotificationListProps {
  rows: NotificationRow[]
}

export function NotificationList({ rows }: NotificationListProps) {
  const router = useRouter()
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
              try {
                await apiClient.post<{ ok: true; changed: number }>(
                  "/api/v1/notifications/mark-all-read",
                  {},
                )
                router.refresh()
              } catch (err) {
                // Swallow ApiError — the bell will reflect actual state on
                // the next poll; nothing useful to surface inline here.
                if (!(err instanceof ApiError)) throw err
              }
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
