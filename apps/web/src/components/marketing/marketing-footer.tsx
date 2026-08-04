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
import { GetListedDialog } from "./business-cta-pair"

const NISARGA_LINKEDIN_URL = "https://www.linkedin.com/company/nisarga-group/"
const NISARGA_FACEBOOK_URL =
  "https://www.facebook.com/share/19DWYyxsJr/?mibextid=LQQJ4d"
const AIRA_INSTAGRAM_URL =
  "https://www.instagram.com/airabynisarga?igsh=b2wweTEybW95aTg1"
const NISARGA_WEBSITE_URL = "https://nisargacorp.com"
const NISARGA_CONTACT_URL = "https://www.nisargacorp.com/"

const forUsersLinks = [
  { href: "#notify", label: "Get notified at launch" },
  { href: "#about", label: "About AIRA" },
]

const forBusinessesContactLink = {
  href: NISARGA_CONTACT_URL,
  label: "Contact us",
  external: true,
}

// One /legal source of truth — anchor fragments jump to the right
// section. The old /privacy and /terms routes 308-redirect to their
// section anchors so any external links stay live.
const legalLinks = [
  { href: "/legal", label: "Legal" },
  { href: "/legal#privacy", label: "Privacy" },
  { href: "/legal#terms", label: "Terms" },
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
          <GetListedColumn />
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
        <Link
          href={NISARGA_CONTACT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-display text-[15px] tracking-wide text-foreground no-underline transition-colors hover:text-primary"
        >
          Contact Us
        </Link>
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
          <li>
            <ContactIcon
              href={NISARGA_FACEBOOK_URL}
              label={`${brand.legalEntity} on Facebook`}
              external
            >
              <FacebookGlyph />
            </ContactIcon>
          </li>
          <li>
            <ContactIcon
              href={AIRA_INSTAGRAM_URL}
              label={`${brand.name} on Instagram`}
              external
            >
              <InstagramGlyph />
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

function FacebookGlyph() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-[18px] fill-current"
    >
      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.413c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
    </svg>
  )
}

function InstagramGlyph() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-[18px] fill-current"
    >
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
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
      <div className="mb-4 text-xs font-bold uppercase tracking-[2px] text-muted-foreground">
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

function GetListedColumn() {
  return (
    <div>
      <div className="mb-4 text-xs font-bold uppercase tracking-[2px] text-muted-foreground">
        Get listed
      </div>
      <ul className="space-y-1">
        <li>
          <GetListedDialog triggerClassName="block w-full py-1 text-left text-sm text-foreground no-underline transition-colors hover:text-primary">
            Get listed
          </GetListedDialog>
        </li>
        <li>
          <Link
            href={forBusinessesContactLink.href}
            target="_blank"
            rel="noopener noreferrer"
            className="block py-1 text-sm text-foreground no-underline transition-colors hover:text-primary"
          >
            {forBusinessesContactLink.label}
          </Link>
        </li>
      </ul>
    </div>
  )
}
