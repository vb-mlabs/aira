"use client"

// The persistent left sidebar for the authenticated app shell. Green
// "paper" texture (var(--texture-paper-green)) painted over the olive
// --sidebar surface token. Used:
//   - As a fixed 280px column on >= md (rendered by (app)/layout.tsx)
//   - Slid in as a drawer on < md (wrapped by MobileSidebar)

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, Globe, Home, Mail, Store } from "lucide-react"
import { brand } from "@aira/config"
import { cn } from "@aira/ui-web/utils"
import { CATEGORIES_ORDERED, CATEGORY_META } from "@/features/listings"
import type { Category } from "@aira/validators/categories"

interface AppSidebarProps {
  /** Render the close button in the header (mobile drawer mode). */
  onClose?: () => void
  /** DB categories for Atlanta. When provided replaces static CATEGORIES_ORDERED. */
  categories?: Category[]
}

export function AppSidebar({ onClose, categories }: AppSidebarProps) {
  const pathname = usePathname() ?? ""

  // Each row's active state is "starts-with" matching so nested listing
  // routes (/listings/[category]/[id]) keep their parent category lit up.
  const isActive = (href: string) =>
    href === "/home" ? pathname === "/home" : pathname.startsWith(href)

  const useFallback = !categories || categories.length === 0

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
          : categories.map((cat) => {
              const meta = CATEGORY_META[cat.slug as keyof typeof CATEGORY_META]
              return (
                <SidebarRow
                  key={cat.id}
                  href={`/listings/${cat.slug}`}
                  label={cat.name}
                  icon={meta?.icon ?? Store}
                  active={isActive(`/listings/${cat.slug}`)}
                />
              )
            })}
      </nav>

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
            href={brand.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex size-9 items-center justify-center rounded-full border border-sidebar-border bg-sidebar-foreground/10 text-sidebar-foreground transition-colors hover:bg-sidebar-foreground/20"
            aria-label="Visit website"
          >
            <Globe className="size-4" />
          </a>
        </div>
        <p className="text-[0.65rem] tracking-wide text-sidebar-foreground/70">
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
      <ChevronRight
        className="size-3.5 flex-shrink-0 opacity-55"
        aria-hidden
      />
    </Link>
  )
}
