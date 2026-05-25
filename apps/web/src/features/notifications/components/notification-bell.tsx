"use client"

import Link from "next/link"
import { cn } from "@mlabs/ui-web/utils"
import { usePolledFetch } from "@/lib/hooks/use-polled-fetch"

const POLL_INTERVAL_MS = 5_000

// Bell + unread count badge. Polls every 5s via the shared visibility-gated
// fetcher (also used by the messages inbox + thread). Polling, no realtime, per
// the outside-voice critique about idle Neon load.
export function NotificationBell() {
  const { data } = usePolledFetch<{ count: number }>({
    url: "/api/v1/notifications/unread-count",
    intervalMs: POLL_INTERVAL_MS,
  })
  const count = data?.count ?? null

  const showBadge = count !== null && count > 0
  const display = count !== null && count > 99 ? "99+" : count

  return (
    <Link
      href="/notifications"
      aria-label={
        count && count > 0
          ? `Notifications, ${count} unread`
          : "Notifications"
      }
      className="relative inline-flex items-center text-muted-foreground hover:text-foreground"
    >
      <BellIcon className="size-5" />
      {showBadge && (
        <span
          className={cn(
            "absolute -right-1 -top-1 inline-flex min-w-[1.1rem] items-center justify-center rounded-full bg-primary px-1 text-[0.65rem] font-semibold leading-4 text-primary-foreground",
          )}
        >
          {display}
        </span>
      )}
    </Link>
  )
}

// Tiny inline icon — avoids reaching for lucide-react for a single glyph.
function BellIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  )
}
