"use client"

// 3-tab bottom navigation for the mobile end-user app shell. Fixed to
// the viewport bottom on < md and replaced by the persistent sidebar on
// >= md. Active state derives from the URL; respects iOS safe-area
// inset so the bar doesn't sit under the home indicator.

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, LayoutGrid, User } from "lucide-react"
import { cn } from "@aira/ui-web/utils"

interface Tab {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const TABS: readonly Tab[] = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/categories", label: "Categories", icon: LayoutGrid },
  { href: "/account", label: "Account", icon: User },
] as const

export function BottomTabBar() {
  const pathname = usePathname() ?? ""

  // Home and Account match exactly so a deeper URL doesn't highlight them;
  // Categories also covers /listings/* (browse flow).
  const isActive = (href: string) => {
    if (href === "/categories") {
      return pathname === "/categories" || pathname.startsWith("/listings")
    }
    return pathname === href
  }

  return (
    <nav
      aria-label="Bottom navigation"
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {TABS.map((tab) => {
        const Icon = tab.icon
        const active = isActive(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2 text-[0.65rem]",
              active
                ? "font-bold text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-5" aria-hidden />
            <span>{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
