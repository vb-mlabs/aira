import Link from "next/link"
import { ChevronRight, Image as ImageIcon, Mail } from "lucide-react"
import { AdminPageHeader } from "../_components/page-header"

export const metadata = { title: "Admin · Settings" }
export const dynamic = "force-dynamic"

interface SettingsLink {
  href: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}

const LINKS: SettingsLink[] = [
  {
    href: "/admin/settings/homepage",
    title: "Homepage",
    description:
      "About title + body and the businesses / community count overrides on /home.",
    icon: ImageIcon,
  },
  {
    href: "/admin/settings/renewal-schedule",
    title: "Renewal schedule",
    description:
      "When the renewal-reminder cron emails the admin about expiring subscriptions (e.g. 30, 14, 7).",
    icon: Mail,
  },
]

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Settings"
        subtitle="Site-wide configuration the admin controls without a deploy."
      />
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {LINKS.map(({ href, title, description, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="group flex items-start gap-4 rounded-xl bg-card p-5 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-card-hover)] sm:p-6"
            >
              <div
                aria-hidden
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"
              >
                <Icon className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg text-foreground">{title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
              </div>
              <ChevronRight
                aria-hidden
                className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
