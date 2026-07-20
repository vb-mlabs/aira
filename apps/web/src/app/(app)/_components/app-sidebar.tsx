"use client"

// The persistent left sidebar for the authenticated app shell. Green
// "paper" texture (var(--texture-paper-green)) painted over the olive
// --sidebar surface token. Used:
//   - As a fixed 280px column on >= md (rendered by (app)/layout.tsx)
//   - Slid in as a drawer on < md (wrapped by MobileSidebar)
//
// Categories render as a tree: a root with no children renders as a
// flat row; a root with children renders as an expandable group with
// indented child rows below. The group auto-opens when the current
// route lives inside it.

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import {
  ChevronDown,
  ChevronRight,
  Globe,
  Home,
  Mail,
  MessageSquare,
  Settings,
} from "lucide-react"
import { brand } from "@aira/config"
import { cn } from "@aira/ui-web/utils"
import { CATEGORIES_ORDERED, getCategoryMeta } from "@/features/listings"
import type {
  Category,
  CategoryTreeOutput,
} from "@aira/validators/categories"

// Parent-entity website — the Globe icon in the sidebar Contact strip points
// to the Nisarga corporate site rather than brand.url (the AIRA marketing
// site users are already inside).
const NISARGA_WEBSITE_URL = "https://nisargacorp.com"

interface AppSidebarProps {
  /** Render the close button in the header (mobile drawer mode). */
  onClose?: () => void
  /** Category tree for the current city. Each node is a root plus its
   *  children. When omitted/empty the sidebar falls back to the static
   *  CATEGORIES_ORDERED map (which is flat). */
  tree?: CategoryTreeOutput["tree"]
  /** Show the Admin link at the bottom of the footer. */
  isAdmin?: boolean
}

export function AppSidebar({ onClose, tree, isAdmin }: AppSidebarProps) {
  const pathname = usePathname() ?? ""

  // Each row's active state is "starts-with" matching so nested listing
  // routes (/listings/[category]/[id]) keep their parent category lit up.
  const isActive = (href: string) =>
    href === "/home" ? pathname === "/home" : pathname.startsWith(href)

  const useFallback = !tree || tree.length === 0

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
            by {brand.parentName}
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
        className="flex flex-1 flex-col overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Main"
      >
        <SidebarRow
          href="/home"
          label="Home"
          icon={Home}
          active={isActive("/home")}
        />
        <SidebarRow
          href="/community"
          label={`Post on ${brand.name}`}
          icon={MessageSquare}
          active={isActive("/community")}
        />
        {useFallback
          ? CATEGORIES_ORDERED.map((cat) => (
              <SidebarRow
                key={cat.slug}
                href={`/listings/${cat.slug}`}
                label={cat.displayName}
                icon={cat.icon}
                active={isActive(`/listings/${cat.slug}`)}
              />
            ))
          : tree.map(({ root, children: subs }) =>
              subs.length === 0 ? (
                <SidebarRow
                  key={root.id}
                  href={`/listings/${root.slug}`}
                  label={root.name}
                  icon={getCategoryMeta(root.slug).icon}
                  active={isActive(`/listings/${root.slug}`)}
                />
              ) : (
                <CategoryGroup
                  key={root.id}
                  root={root}
                  subs={subs}
                  isActive={isActive}
                />
              ),
            )}
      </nav>

      {isAdmin && (
        <Link
          href="/admin"
          className="flex items-center gap-3 border-t border-sidebar-border px-5 py-3 text-sm transition-colors hover:bg-sidebar-foreground/5"
        >
          <Settings className="size-4 flex-shrink-0 opacity-90" aria-hidden />
          <span className="flex-1">Admin Panel</span>
        </Link>
      )}

      <footer className="border-t border-sidebar-border px-5 pb-5 pt-6 text-center">
        <p className="mb-3 font-display text-base">Contact Us</p>
        <div className="mb-4 flex items-center justify-center gap-3">
          <a
            href={`mailto:${brand.supportEmail}`}
            className="flex size-9 items-center justify-center rounded-full border border-sidebar-border bg-sidebar-foreground/10 text-sidebar-foreground transition-colors hover:bg-sidebar-foreground/20"
            aria-label="Email support"
          >
            <Mail className="size-4" />
          </a>
          <a
            href={NISARGA_WEBSITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex size-9 items-center justify-center rounded-full border border-sidebar-border bg-sidebar-foreground/10 text-sidebar-foreground transition-colors hover:bg-sidebar-foreground/20"
            aria-label={`${brand.legalEntity} website`}
          >
            <Globe className="size-4" />
          </a>
        </div>
        <p className="text-xs tracking-wide text-sidebar-foreground/70">
          Operated by {brand.legalEntity}
        </p>
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
        "flex items-center gap-3 border-b border-sidebar-border px-5 py-2.5 text-sm transition-colors hover:bg-sidebar-foreground/5",
        active && "bg-sidebar-foreground/10 font-bold",
      )}
      aria-current={active ? "page" : undefined}
    >
      <Icon
        className="size-4 flex-shrink-0 opacity-90"
        aria-hidden
      />
      <span className="flex-1 truncate">{label}</span>
    </Link>
  )
}

interface CategoryGroupProps {
  root: Category
  subs: Category[]
  isActive: (href: string) => boolean
}

/**
 * Collapsible parent row + indented children. The parent itself is a
 * link (tapping the row still navigates to /listings/<parent-slug>) so
 * users who don't care about the children can ignore the disclosure.
 * The chevron is a separate toggle button to keep the link target and
 * the expand affordance from overlapping.
 *
 * Interaction model:
 *   - Hovering the row auto-opens the subs (QA feedback #14 — users
 *     shouldn't have to click the arrow to peek at what's inside).
 *   - Mouse-out auto-closes UNLESS the current route lives inside the
 *     group, in which case the group stays open as before.
 *   - The chevron still toggles a persistent `open` state — useful for
 *     touch / no-hover devices and keyboard users.
 */
function CategoryGroup({ root, subs, isActive }: CategoryGroupProps) {
  const Icon = getCategoryMeta(root.slug).icon
  const parentActive = isActive(`/listings/${root.slug}`)
  const anyChildActive = subs.some((c) => isActive(`/listings/${c.slug}`))
  const routeActive = parentActive || anyChildActive
  // Persistent open state — toggled by the chevron and pre-set to true
  // when a route in this group is active. Hover flips a separate state.
  const [clickOpen, setClickOpen] = useState(routeActive)
  const [hoverOpen, setHoverOpen] = useState(false)
  const open = clickOpen || hoverOpen || routeActive

  return (
    <div
      onMouseEnter={() => setHoverOpen(true)}
      onMouseLeave={() => setHoverOpen(false)}
    >
      <div
        className={cn(
          "flex items-center border-b border-sidebar-border text-sm transition-colors hover:bg-sidebar-foreground/5",
          routeActive && "bg-sidebar-foreground/10",
        )}
      >
        <Link
          href={`/listings/${root.slug}`}
          className={cn(
            "flex flex-1 items-center gap-3 px-5 py-2.5",
            parentActive && "font-bold",
          )}
          aria-current={parentActive ? "page" : undefined}
        >
          <Icon
            className="size-4 flex-shrink-0 opacity-90"
            aria-hidden
          />
          <span className="flex-1 truncate">{root.name}</span>
        </Link>
        <button
          type="button"
          onClick={() => setClickOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? `Hide ${root.name} subcategories` : `Show ${root.name} subcategories`}
          className="flex size-9 shrink-0 items-center justify-center pr-3 text-sidebar-foreground/70 hover:text-sidebar-foreground"
        >
          {open ? (
            <ChevronDown className="size-3.5" aria-hidden />
          ) : (
            <ChevronRight className="size-3.5" aria-hidden />
          )}
        </button>
      </div>
      {open &&
        subs.map((sub) => {
          const childActive = isActive(`/listings/${sub.slug}`)
          return (
            <Link
              key={sub.id}
              href={`/listings/${sub.slug}`}
              className={cn(
                "flex items-center gap-3 border-b border-sidebar-border py-2 pl-12 pr-5 text-xs transition-[filter] text-sponsored-mid-foreground hover:brightness-95",
                childActive && "font-bold",
              )}
              // Same tier2-texture the mid-slot "Sponsored" section
              // header uses on the mobile category screen
              // (apps/mobile/app/(app)/listings/[category]/index.tsx:28).
              // Sidebar submenu shares that visual identity with the
              // mid-tier section header.
              style={{
                backgroundImage: "url(/textures/tier2-texture.webp)",
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
              aria-current={childActive ? "page" : undefined}
            >
              <span
                aria-hidden
                className="size-1.5 shrink-0 rounded-full bg-sponsored-mid-foreground/60"
              />
              <span className="flex-1 truncate">{sub.name}</span>
            </Link>
          )
        })}
    </div>
  )
}
