// /account — end-user account hub. Profile header + Account and Support
// menu groups + Sign out + brand footer. Every menu row resolves to a
// real screen now: /profile, /account/notifications,
// /account/privacy-security, mailto:, /account/terms, /account/about.

import type { Metadata } from "next"
import Link from "next/link"
import {
  Bell,
  ChevronRight,
  FileText,
  Info,
  Lock,
  MessageCircle,
  ScrollText,
  UserCog,
} from "lucide-react"
import { brand } from "@aira/config"
import { cn } from "@aira/ui-web/utils"
import { requireUser } from "@/lib/auth/server"
import { SignOutButton } from "../_components/sign-out-button"

export const metadata: Metadata = {
  title: "My Account",
}

interface MenuItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const ACCOUNT_ITEMS: readonly MenuItem[] = [
  { href: "/profile", label: "Edit profile", icon: UserCog },
  { href: "/account/posts", label: "My posts", icon: FileText },
  { href: "/account/notifications", label: "Notifications", icon: Bell },
  {
    href: "/account/privacy-security",
    label: "Privacy & security",
    icon: Lock,
  },
] as const

const SUPPORT_ITEMS: readonly MenuItem[] = [
  {
    href: `mailto:${brand.supportEmail}`,
    label: "Contact us",
    icon: MessageCircle,
  },
  { href: "/account/terms", label: "Terms & privacy", icon: ScrollText },
  { href: "/account/about", label: `About ${brand.name}`, icon: Info },
] as const

export default async function AccountPage() {
  const user = await requireUser()
  const initial = (user.name?.charAt(0) ?? user.email.charAt(0)).toUpperCase()

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-8 sm:px-8 sm:py-10">
      <header className="mb-8 flex items-center gap-4">
        <span
          aria-hidden
          className="flex size-16 flex-shrink-0 items-center justify-center rounded-full bg-primary font-display text-2xl font-bold text-primary-foreground"
        >
          {initial}
        </span>
        <div className="min-w-0">
          <p className="truncate font-display text-2xl text-foreground">
            {user.name || user.email}
          </p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
      </header>

      <Group label="Account" items={ACCOUNT_ITEMS} />
      <Group label="Support" items={SUPPORT_ITEMS} />

      <SignOutButton className="mt-2 w-full rounded-xl border border-primary py-3 text-sm font-bold text-primary transition-colors hover:bg-primary/5 disabled:opacity-60" />

      <p className="mt-6 text-center text-[0.65rem] tracking-wide text-muted-foreground">
        Operated by {brand.legalEntity}
      </p>
    </div>
  )
}

function Group({
  label,
  items,
}: {
  label: string
  items: readonly MenuItem[]
}) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 px-1 text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </h2>
      <ul className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
        {items.map((item, i) => (
          <li
            key={item.label}
            className={cn(
              i < items.length - 1 && "border-b border-border",
            )}
          >
            <MenuLink item={item} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function MenuLink({ item }: { item: MenuItem }) {
  const Icon = item.icon
  const content = (
    <>
      <Icon className="size-4 flex-shrink-0 text-primary" aria-hidden />
      <span className="flex-1 text-sm text-foreground">{item.label}</span>
      <ChevronRight
        className="size-4 flex-shrink-0 text-muted-foreground"
        aria-hidden
      />
    </>
  )

  // mailto: should use a plain <a>; everything else routes via Next Link.
  const baseClassName =
    "flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-accent"
  if (item.href.startsWith("mailto:")) {
    return (
      <a href={item.href} className={baseClassName}>
        {content}
      </a>
    )
  }
  return (
    <Link href={item.href} className={baseClassName}>
      {content}
    </Link>
  )
}
