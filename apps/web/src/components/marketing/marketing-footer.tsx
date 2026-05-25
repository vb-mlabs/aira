import Link from "next/link"
import { brand } from "@mlabs/config"

const productLinks = [
  { href: "#why", label: "Why mstack" },
  { href: "#mstack", label: "mstack flow" },
  { href: "#packages", label: "Packages" },
  { href: "#start", label: "Start a feature" },
  { href: "/design", label: "Design system" },
]

const resourcesLinks = [
  { href: "/dev/states", label: "Component states" },
  { href: "/dev/emails", label: "Email previews" },
  { href: "/dev/notifications", label: "Notification previews" },
  { href: "/admin", label: "Admin" },
]

const companyLinks = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
]

export function MarketingFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-6 py-14 md:grid-cols-5">
        <div className="col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <span className="inline-block size-2.5 rounded-full bg-primary" />
            <span className="font-extrabold tracking-tight">{brand.name}</span>
          </div>
          <p className="max-w-xs text-[14px] leading-relaxed text-muted-foreground">
            {brand.tagline}.
          </p>
        </div>

        <FooterColumn title="Product" links={productLinks} />
        <FooterColumn title="Resources" links={resourcesLinks} />
        <FooterColumn title="Company" links={companyLinks} />
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-6 text-[12px] text-muted-foreground sm:flex-row">
          <div>
            © {new Date().getFullYear()} {brand.legalEntity} · All rights
            reserved.
          </div>
          <div className="flex items-center gap-5">
            <Link href="#" className="hover:text-foreground">
              Twitter
            </Link>
            <Link href="#" className="hover:text-foreground">
              GitHub
            </Link>
            <Link
              href={`mailto:${brand.supportEmail}`}
              className="hover:text-foreground"
            >
              Support
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

function FooterColumn({
  title,
  links,
}: {
  title: string
  links: ReadonlyArray<{ href: string; label: string }>
}) {
  return (
    <div>
      <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </div>
      <ul className="space-y-2.5 text-[14px] text-muted-foreground">
        {links.map((l) => (
          <li key={l.label}>
            <Link href={l.href} className="hover:text-foreground">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
