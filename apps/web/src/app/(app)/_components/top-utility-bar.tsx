// Thin utility bar at the top of the main content column on desktop
// (>= md). Houses the notification bell and an avatar link to /account.

import Link from "next/link"
import { Avatar } from "@aira/ui-web/avatar"
import { NotificationBell } from "@/features/notifications"

interface TopUtilityBarProps {
  user: { name: string; email: string; image: string | null }
}

export function TopUtilityBar({ user }: TopUtilityBarProps) {
  return (
    <header className="hidden h-14 items-center justify-end gap-4 border-b border-border bg-card/40 px-6 backdrop-blur-sm md:flex">
      <NotificationBell />
      <Link
        href="/account"
        aria-label="My Account"
        className="rounded-full transition-opacity hover:opacity-80"
      >
        <Avatar
          size="sm"
          src={user.image}
          name={user.name || user.email}
          className="ring-1 ring-primary/20"
        />
      </Link>
    </header>
  )
}
