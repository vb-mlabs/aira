"use client"

// Admin shell sidebar — mirrors the user-facing AppSidebar visually so
// admins moving between /home and /admin feel one product. Same green
// "paper" texture, same row pattern, just a different nav list.
//
// The nav list is split into three semantic groups: Operate (day-to-day
// admin work), Setup (a single row pointing into the tabbed /admin/settings
// hub), and System (audit log + cron). A row's `requires` field declares
// the minimum privilege; the rendering pass filters rows the current admin
// can't access. Plain admins effectively see only Operate; super_admins see
// all three groups with a thin divider + extra padding between them.

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ClipboardList,
  Clock,
  LayoutDashboard,
  MessageSquare,
  PhoneCall,
  Settings2,
  Store,
  Users,
} from "lucide-react"
import { brand } from "@aira/config"
import { hasPermission, type Permission } from "@aira/api"
import { cn } from "@aira/ui-web/utils"

interface AdminSidebarProps {
  /** Render the close button in the header (mobile drawer mode). */
  onClose?: () => void
  /** Current admin's raw DB role — drives which nav rows are visible.
   *  Accepts the full DB enum so the sidebar can decide. */
  userRole: string
}

type NavRow = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  requires: Permission
  /** When set, render a group-separator before this row (only if visible
   *  AND a previous group's rows were also visible). */
  startsGroup?: boolean
}

const ADMIN_NAV: NavRow[] = [
  // Operate
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, requires: "admin" },
  { href: "/admin/businesses", label: "Businesses", icon: Store, requires: "admin" },
  { href: "/admin/renewals", label: "Renewals", icon: PhoneCall, requires: "admin" },
  { href: "/admin/community", label: "Community", icon: MessageSquare, requires: "admin" },
  { href: "/admin/users", label: "Users", icon: Users, requires: "admin" },
  // Setup
  { href: "/admin/settings", label: "Setup", icon: Settings2, requires: "super_admin", startsGroup: true },
  // System
  { href: "/admin/audit", label: "Audit log", icon: ClipboardList, requires: "super_admin", startsGroup: true },
  { href: "/admin/cron", label: "Cron", icon: Clock, requires: "super_admin" },
]

function toPermission(role: string): Permission {
  if (role === "super_admin") return "super_admin"
  if (role === "admin") return "admin"
  return "user"
}

export function AdminSidebar({ onClose, userRole }: AdminSidebarProps) {
  const pathname = usePathname() ?? ""
  const callerPermission = toPermission(userRole)

  // /admin uses exact match so it stays lit only on the dashboard;
  // every other route uses starts-with so nested edit pages keep
  // their parent row active.
  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href)

  // Filter rows in one pass; collect the boolean run so we know whether to
  // render the separator before each row that opens a group.
  const visibleRows = ADMIN_NAV.filter((row) =>
    hasPermission(callerPermission, row.requires),
  )

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

      <nav
        // Hide the scrollbar (matches the user-facing AppSidebar). On
        // shorter viewports the nav still scrolls — without the visible
        // bar cluttering the texture.
        className="flex flex-1 flex-col overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Admin"
      >
        {visibleRows.map((row, idx) => (
          <SidebarRow
            key={row.href}
            href={row.href}
            label={row.label}
            icon={row.icon}
            active={isActive(row.href)}
            // Only draw a separator when the row opens a group AND it's not
            // the first visible row (no separator above the very top item).
            separatorAbove={Boolean(row.startsGroup) && idx > 0}
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
  separatorAbove: boolean
}

function SidebarRow({
  href,
  label,
  icon: Icon,
  active,
  separatorAbove,
}: SidebarRowProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3.5 border-b border-sidebar-border px-5 py-3.5 text-sm transition-colors hover:bg-sidebar-foreground/5",
        // Thin separator + extra padding before each group's first row.
        // The base border-b on every row already gives a visual divider;
        // for the group boundary we add a heavier rule via border-t and a
        // top margin to create breathing room.
        separatorAbove && "mt-2 border-t border-sidebar-border/80 pt-4",
        active && "bg-sidebar-foreground/10 font-bold",
      )}
      aria-current={active ? "page" : undefined}
    >
      <Icon className="size-5 flex-shrink-0 opacity-90" aria-hidden />
      <span className="flex-1 truncate">{label}</span>
    </Link>
  )
}
