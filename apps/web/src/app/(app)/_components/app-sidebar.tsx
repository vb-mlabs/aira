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
        <div className="mb-4 flex flex-wrap items-center justify-center gap-3">
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
          <a
            href={brand.socials.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="flex size-9 items-center justify-center rounded-full border border-sidebar-border bg-sidebar-foreground/10 text-sidebar-foreground transition-colors hover:bg-sidebar-foreground/20"
            aria-label={`${brand.name} on Instagram`}
          >
            <InstagramGlyph />
          </a>
          <a
            href={brand.socials.facebook}
            target="_blank"
            rel="noopener noreferrer"
            className="flex size-9 items-center justify-center rounded-full border border-sidebar-border bg-sidebar-foreground/10 text-sidebar-foreground transition-colors hover:bg-sidebar-foreground/20"
            aria-label={`${brand.legalEntity} on Facebook`}
          >
            <FacebookGlyph />
          </a>
          <a
            href={brand.socials.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="flex size-9 items-center justify-center rounded-full border border-sidebar-border bg-sidebar-foreground/10 text-sidebar-foreground transition-colors hover:bg-sidebar-foreground/20"
            aria-label={`${brand.legalEntity} on LinkedIn`}
          >
            <LinkedInGlyph />
          </a>
        </div>
        <p className="text-xs tracking-wide text-sidebar-foreground/70">
          Operated by {brand.legalEntity}
        </p>
      </footer>
    </aside>
  )
}

// Brand-mark SVGs — Lucide doesn't ship trademarked Instagram/Facebook/
// LinkedIn glyphs. Path data mirrors the marketing footer at
// apps/web/src/components/marketing/marketing-footer.tsx so the two
// surfaces stay visually identical.

function InstagramGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 fill-current">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  )
}

function FacebookGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 fill-current">
      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.413c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
    </svg>
  )
}

function LinkedInGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 fill-current">
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.37V9h3.41v1.56h.05c.47-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" />
    </svg>
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
                // Match the parent row's height + font size so the
                // submenu reads as a first-class list, not a footnote.
                // Parent rows use `py-2.5 text-sm`; sub-items keep the
                // deeper pl-12 indent so the hierarchy still reads.
                "flex items-center gap-3 border-b border-sidebar-border py-2.5 pl-12 pr-5 text-sm transition-[filter] text-sponsored-mid-foreground hover:brightness-95",
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
