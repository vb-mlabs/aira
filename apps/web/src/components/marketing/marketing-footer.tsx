// AIRA marketing footer. 4-column grid (brand block / Browse / Get listed /
// About) above a slim contact strip: ✦ ornament + "Contact Us" label +
// 3 olive-green icon buttons (Mail / Globe / LinkedIn) + Nisarga signature.
//
// Branded values come from @aira/config (brand.name, brand.legalEntity,
// brand.supportEmail). Marketing prose lives inline per the allowlist in T9.

import Image from "next/image"
import Link from "next/link"
import { Globe, Mail } from "lucide-react"
import { brand } from "@aira/config"

// TODO: replace with the real Nisarga LinkedIn URL once it exists.
const NISARGA_LINKEDIN_URL = "#"
const NISARGA_WEBSITE_URL = "https://nisargacorp.com"

const forUsersLinks = [
  { href: "#notify", label: "Get notified at launch" },
  { href: "#about", label: "About AIRA" },
]

const forBusinessesLinks = [
  { href: "#businesses", label: "Get listed" },
  { href: `mailto:${brand.supportEmail}`, label: "Contact us" },
]

const legalLinks = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: `mailto:${brand.supportEmail}`, label: "Support" },
]

export function MarketingFooter() {
  return (
    <footer className="border-t border-[color:oklch(0.50_0.07_80_/_30%)] bg-[url('/marketing-images/textures/paper-cream.webp')] bg-cover bg-center pb-10 pt-20">
      <div className="mx-auto max-w-[1180px] px-6">
        <div className="mb-12 grid grid-cols-1 gap-12 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div className="flex items-start gap-[14px]">
            <Image
              src="/marketing-images/logo.png"
              alt={`${brand.name} tree-of-life logo`}
              width={56}
              height={56}
              className="size-14 rounded-full"
            />
            <div>
              <div className="font-display text-[24px] font-bold tracking-[1.5px] text-foreground">
                {brand.name}
              </div>
              <div className="mt-1 font-display text-[15px] italic text-muted-foreground">
                Roots &amp; Reach
              </div>
            </div>
          </div>

          <FooterColumn title="Browse" links={forUsersLinks} />
          <FooterColumn title="Get listed" links={forBusinessesLinks} />
          <FooterColumn title="About" links={legalLinks} />
        </div>

        <ContactStrip />
      </div>
    </footer>
  )
}

function ContactStrip() {
  return (
    <div className="flex justify-center pt-2">
      <div className="flex flex-col items-center gap-5 rounded-full bg-card px-8 py-4 text-muted-foreground shadow-[0_10px_30px_-18px_oklch(0.25_0.04_60_/_30%)] ring-1 ring-border/20 sm:flex-row sm:gap-7">
      <div className="flex items-center gap-5">
        <hr className="hidden h-px w-10 border-0 bg-brand-gold/50 sm:block" />
        <span aria-hidden="true" className="font-display text-lg text-brand-gold">
          ✦
        </span>
        <span className="font-display text-[15px] tracking-wide text-foreground">
          Contact Us
        </span>
        <ul className="flex items-center gap-2.5">
          <li>
            <ContactIcon
              href={`mailto:${brand.supportEmail}`}
              label={`Email ${brand.name}`}
            >
              <Mail aria-hidden="true" className="size-[18px]" />
            </ContactIcon>
          </li>
          <li>
            <ContactIcon
              href={NISARGA_WEBSITE_URL}
              label={`${brand.legalEntity} website`}
              external
            >
              <Globe aria-hidden="true" className="size-[18px]" />
            </ContactIcon>
          </li>
          <li>
            <ContactIcon
              href={NISARGA_LINKEDIN_URL}
              label={`${brand.legalEntity} on LinkedIn`}
              external
            >
              <LinkedInGlyph />
            </ContactIcon>
          </li>
        </ul>
      </div>
      <div className="flex items-center gap-5">
        <span aria-hidden="true" className="hidden h-5 w-px bg-border/40 sm:block" />
        <span className="font-display text-[15px] text-foreground">
          Operated by {brand.legalEntity} ✦
        </span>
      </div>
      </div>
    </div>
  )
}

function LinkedInGlyph() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-[18px] fill-current"
    >
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.37V9h3.41v1.56h.05c.47-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" />
    </svg>
  )
}

function ContactIcon({
  href,
  label,
  external = false,
  children,
}: {
  href: string
  label: string
  external?: boolean
  children: React.ReactNode
}) {
  const externalProps = external
    ? { target: "_blank", rel: "noopener noreferrer" }
    : {}
  return (
    <Link
      href={href}
      aria-label={label}
      {...externalProps}
      className="flex size-10 items-center justify-center rounded-full bg-primary text-brand-cream-bright no-underline transition-transform hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {children}
    </Link>
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
      <div className="mb-4 text-[11px] font-bold uppercase tracking-[2px] text-muted-foreground">
        {title}
      </div>
      <ul className="space-y-1">
        {links.map((l) => (
          <li key={l.label}>
            <Link
              href={l.href}
              className="block py-1 text-sm text-foreground no-underline transition-colors hover:text-primary"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
