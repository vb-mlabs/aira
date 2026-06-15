"use client"

// Tab strip for /admin/settings. Each tab is a real route so server-side
// data fetching stays per-tab and deep links work. Active styling is driven
// by usePathname() so the sticky strip survives soft navigation between
// tabs without a full page reload.

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@aira/ui-web/utils"

const TABS = [
  { href: "/admin/settings/categories", label: "Categories" },
  { href: "/admin/settings/cities", label: "Cities" },
  { href: "/admin/settings/membership-plans", label: "Membership plans" },
  { href: "/admin/settings/sponsorship-tiers", label: "Sponsorship tiers" },
  { href: "/admin/settings/renewals", label: "Renewals" },
]

export function SettingsTabs() {
  const pathname = usePathname() ?? ""

  return (
    <nav
      aria-label="Settings"
      className="-mx-1 flex gap-1 overflow-x-auto border-b border-border [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative whitespace-nowrap px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
            {active && (
              <span
                aria-hidden
                className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-primary"
              />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
