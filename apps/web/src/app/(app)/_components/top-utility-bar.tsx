// Thin utility bar at the top of the main content column on desktop
// (>= md). Houses the notification bell, an Account link, and the
// sign-out control — the menu/navigation lives in the persistent sidebar.

import Link from "next/link"
import { NotificationBell } from "@/features/notifications"
import { SignOutButton } from "./sign-out-button"

export function TopUtilityBar() {
  return (
    <header className="hidden h-14 items-center justify-end gap-5 border-b border-border bg-card/40 px-6 backdrop-blur-sm md:flex">
      <NotificationBell />
      <span className="h-5 w-px bg-border" aria-hidden />
      <Link
        href="/account"
        className="text-sm text-foreground hover:text-primary"
      >
        My Account
      </Link>
      <SignOutButton />
    </header>
  )
}
