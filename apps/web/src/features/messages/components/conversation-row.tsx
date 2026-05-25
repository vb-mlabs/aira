import Link from "next/link"
import { cn } from "@mlabs/ui-web/utils"
import type { ConversationListItem } from "@/features/messages/types"

interface ConversationRowProps {
  item: ConversationListItem
}

export function ConversationRow({ item }: ConversationRowProps) {
  const hasUnread = item.unread_count > 0

  return (
    <Link
      href={`/messages/${item.id}`}
      className={cn(
        "flex items-start gap-3 rounded-md border border-border bg-card p-4 transition-colors hover:bg-accent",
        hasUnread && "border-primary/40 bg-primary/5",
      )}
    >
      <Avatar
        url={item.other_user.image}
        name={item.other_user.name}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium">
            {item.other_user.name}
          </p>
          {item.last_message_at && (
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatRelative(item.last_message_at)}
            </span>
          )}
        </div>
        <p
          className={cn(
            "mt-1 line-clamp-1 text-sm",
            hasUnread ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {item.last_message_preview ?? "No messages yet"}
        </p>
      </div>
      {hasUnread && (
        <span
          aria-label={`${item.unread_count} unread`}
          className="ml-2 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground"
        >
          {item.unread_count > 99 ? "99+" : item.unread_count}
        </span>
      )}
    </Link>
  )
}

function Avatar({ url, name }: { url: string | null; name: string }) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={`${name}'s avatar`}
        width={40}
        height={40}
        className="size-10 shrink-0 rounded-full object-cover ring-1 ring-border"
      />
    )
  }
  return (
    <div
      aria-hidden="true"
      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground"
    >
      {initials(name)}
    </div>
  )
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const m = Math.floor(ms / 60_000)
  if (m < 1) return "now"
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const days = Math.floor(h / 24)
  if (days < 7) return `${days}d`
  return new Date(iso).toLocaleDateString()
}
