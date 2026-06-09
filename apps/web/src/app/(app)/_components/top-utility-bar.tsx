// Thin utility bar at the top of the main content column on desktop
// (>= md). Houses the notification bell and an avatar link to /account.

import Link from "next/link"
import { NotificationBell } from "@/features/notifications"

interface TopUtilityBarProps {
  user: { name: string; email: string }
}

function getInitials(user: { name: string; email: string }): string {
  if (user.name?.trim()) {
    const parts = user.name.trim().split(/\s+/)
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0][0].toUpperCase()
  }
  return user.email[0].toUpperCase()
}

export function TopUtilityBar({ user }: TopUtilityBarProps) {
  const initials = getInitials(user)
  return (
    <header className="hidden h-14 items-center justify-end gap-4 border-b border-border bg-card/40 px-6 backdrop-blur-sm md:flex">
      <NotificationBell />
      <Link
        href="/account"
        aria-label="My Account"
        className="flex size-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-80"
      >
        {initials}
      </Link>
    </header>
  )
}
