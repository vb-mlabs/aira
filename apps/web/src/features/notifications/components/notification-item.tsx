"use client"

import Link from "next/link"
import { useTransition } from "react"
import { cn } from "@mlabs/ui-web/utils"
import type { NotificationRow } from "@mlabs/services/notifications"
import { markRead } from "@/features/notifications/server-actions"

interface NotificationItemProps {
  row: NotificationRow
}

export function NotificationItem({ row }: NotificationItemProps) {
  const [pending, startTransition] = useTransition()
  const unread = row.read_at === null
  const { body } = row
  const view = renderBody(body)

  function onMarkRead(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    startTransition(async () => {
      await markRead(row.id)
    })
  }

  const inner = (
    <div
      className={cn(
        "flex items-start justify-between gap-4 rounded-md border border-border bg-card p-4 transition-colors",
        unread && "border-primary/40 bg-primary/5",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {unread && (
            <span
              aria-label="Unread"
              className="size-2 shrink-0 rounded-full bg-primary"
            />
          )}
          <p className="truncate text-sm font-medium">{view.title}</p>
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
          {view.message}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          {formatRelative(row.created_at)}
        </p>
      </div>
      {unread && (
        <button
          type="button"
          onClick={onMarkRead}
          disabled={pending}
          className="shrink-0 text-xs text-muted-foreground hover:text-foreground disabled:opacity-60"
        >
          {pending ? "…" : "Mark read"}
        </button>
      )}
    </div>
  )

  if (view.href) {
    return (
      <Link href={view.href} className="block">
        {inner}
      </Link>
    )
  }
  return inner
}

interface RenderedBody {
  title: string
  message: string
  href?: string
}

function renderBody(body: NotificationRow["body"]): RenderedBody {
  switch (body.kind) {
    case "generic":
      return { title: body.title, message: body.message, href: body.href }
    case "message":
      return {
        title: `${body.sender_name} sent you a message`,
        message: body.preview,
        href: `/messages/${body.conversation_id}`,
      }
  }
}

function formatRelative(d: Date): string {
  const ms = Date.now() - new Date(d).getTime()
  const m = Math.floor(ms / 60_000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const days = Math.floor(h / 24)
  if (days < 7) return `${days}d ago`
  return new Date(d).toLocaleDateString()
}
