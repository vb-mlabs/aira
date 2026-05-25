// AIRA marketing footer. 4-column grid: brand block / For users /
// For businesses / Legal. Bottom bar shows © + Nisarga signature.
//
// Branded values come from @aira/config (brand.name, brand.legalEntity,
// brand.supportEmail). Marketing prose ("Roots & Reach", "For users",
// etc.) lives inline per the allowlist widened in T9.

import Image from "next/image"
import Link from "next/link"
import { brand } from "@aira/config"

const forUsersLinks = [
  { href: "#categories", label: "Browse categories" },
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
  const year = new Date().getFullYear()
  return (
    <footer className="border-t border-[color:oklch(0.50_0.07_80_/_30%)] px-6 pb-10 pt-20">
      <div className="mx-auto max-w-[1180px]">
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

          <FooterColumn title="For users" links={forUsersLinks} />
          <FooterColumn title="For businesses" links={forBusinessesLinks} />
          <FooterColumn title="Legal" links={legalLinks} />
        </div>

        <div className="flex flex-col items-start justify-between gap-3 border-t border-border/25 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <span>
            © {year} {brand.legalEntity}. All rights reserved.
          </span>
          <span>Operated by {brand.legalEntity} ✦</span>
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
