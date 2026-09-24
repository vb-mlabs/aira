// Minimal olive-green footer strip: [Globe · Instagram · Facebook ·
// LinkedIn] centered on a single row with brand-cream text and hairline
// dividers between items. Replaces the elaborate 4-column footer in the
// new landing flow. Gated on NEXT_PUBLIC_LANDING_HERO_V2 via page.tsx —
// original MarketingFooter still renders when the flag is off.
//
// Visual reference: attached_assets/image_1790084699775.png.

import Link from "next/link"
import { Globe } from "lucide-react"
import { brand } from "@aira/config"

// `brand.url` is https://<host>; the footer displays the bare host.
const SITE_HOST = brand.url.replace(/^https?:\/\//, "").replace(/\/+$/, "")

const ITEMS = [
  {
    Icon: GlobeIcon,
    label: SITE_HOST,
    href: brand.url,
    external: false,
    srLabel: `${brand.name} website`,
  },
  {
    Icon: InstagramGlyph,
    label: brand.socialHandle,
    href: brand.socials.instagram,
    external: true,
    srLabel: `${brand.name} on Instagram`,
  },
  {
    Icon: FacebookGlyph,
    label: brand.socialHandle,
    href: brand.socials.facebook,
    external: true,
    srLabel: `${brand.name} on Facebook`,
  },
  {
    Icon: LinkedInGlyph,
    label: `${brand.name} by ${brand.parentName}`,
    href: brand.socials.linkedin,
    external: true,
    srLabel: `${brand.legalEntity} on LinkedIn`,
  },
] as const

function GlobeIcon() {
  return (
    <Globe aria-hidden="true" className="size-[18px]" strokeWidth={1.6} />
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

export function MarketingFooterV2() {
  return (
    <footer className="bg-[color:oklch(0.42_0.06_130)] bg-[url('/marketing-images/textures/paper-green.webp')] bg-cover bg-center py-5 text-brand-cream-bright">
      <ul className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-center px-6 text-[14px]">
        {ITEMS.map((item, i) => (
          <li key={item.srLabel} className="flex items-center">
            {i > 0 ? (
              <span
                aria-hidden="true"
                className="mx-6 hidden h-4 w-px bg-brand-cream-bright/25 md:inline-block"
              />
            ) : null}
            <Link
              href={item.href}
              aria-label={item.srLabel}
              {...(item.external
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              className="inline-flex items-center gap-2 py-1.5 no-underline transition-colors hover:text-brand-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-[color:oklch(0.42_0.06_130)]"
            >
              <item.Icon />
              <span>{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </footer>
  )
}
