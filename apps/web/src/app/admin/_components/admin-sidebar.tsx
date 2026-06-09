"use client"

// Admin shell sidebar — mirrors the user-facing AppSidebar visually so
// admins moving between /home and /admin feel one product. Same green
// "paper" texture, same row pattern, just a different nav list.

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  MapPin,
  Settings2,
  Store,
  Tag,
  Users,
} from "lucide-react"
import { brand } from "@aira/config"
import { cn } from "@aira/ui-web/utils"

interface AdminSidebarProps {
  /** Render the close button in the header (mobile drawer mode). */
  onClose?: () => void
}

const ADMIN_NAV: Array<{
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}> = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/businesses", label: "Businesses", icon: Store },
  { href: "/admin/categories", label: "Categories", icon: Tag },
  { href: "/admin/cities", label: "Cities", icon: MapPin },
  { href: "/admin/settings", label: "Settings", icon: Settings2 },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/audit", label: "Audit log", icon: ClipboardList },
]

export function AdminSidebar({ onClose }: AdminSidebarProps) {
  const pathname = usePathname() ?? ""

  // /admin uses exact match so it stays lit only on the dashboard;
  // every other route uses starts-with so nested edit pages keep
  // their parent row active.
  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href)

  return (
    <aside
      style={{ backgroundImage: "var(--texture-paper-green)" }}
      className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground"
    >
      <header className="flex items-center gap-3 border-b border-sidebar-border px-5 pb-5 pt-6">
        <Image
          src="/marketing-images/logo.png"
          alt={`${brand.name} logo`}
          width={48}
          height={48}
          priority
          className="size-12 flex-shrink-0"
        />
        <div className="min-w-0 flex-1">
          <p className="font-display text-2xl leading-none">{brand.name}</p>
          <p className="mt-1 text-xs italic text-sidebar-foreground/70">
            Admin
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-2xl text-sidebar-foreground/80 hover:text-sidebar-foreground"
            aria-label="Close menu"
          >
            ✕
          </button>
        )}
      </header>

      <nav className="flex flex-1 flex-col overflow-y-auto" aria-label="Admin">
        {ADMIN_NAV.map((item) => (
          <SidebarRow
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={isActive(item.href)}
          />
        ))}
      </nav>

      <footer className="border-t border-sidebar-border px-5 pb-5 pt-6">
        <Link
          href="/home"
          className="block w-full rounded-md border border-sidebar-border bg-sidebar-foreground/10 px-3 py-2 text-center text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-foreground/20"
        >
          Exit admin
        </Link>
      </footer>
    </aside>
  )
}

interface SidebarRowProps {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  active: boolean
}

function SidebarRow({ href, label, icon: Icon, active }: SidebarRowProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3.5 border-b border-sidebar-border px-5 py-3.5 text-sm transition-colors hover:bg-sidebar-foreground/5",
        active && "bg-sidebar-foreground/10 font-bold",
      )}
      aria-current={active ? "page" : undefined}
    >
      <Icon className="size-5 flex-shrink-0 opacity-90" aria-hidden />
      <span className="flex-1 truncate">{label}</span>
      <ChevronRight
        className="size-4 flex-shrink-0 opacity-55"
        aria-hidden
      />
    </Link>
  )
}
