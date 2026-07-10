// Sticky nav for the marketing landing page. Cream backdrop-blur, AIRA
// tree-of-life logo + wordmark left, "Waitlist" pill on the right that
// scrolls to the #businesses section. Sign-in / Sign-up links are hidden
// until the app is live; consumer email capture lives on the Hero's
// WaitlistCard.

import Image from "next/image"
import Link from "next/link"
import { brand } from "@aira/config"

export function MarketingNav() {
  return (
    <nav className="sticky top-0 z-50 bg-[url('/marketing-images/textures/paper-cream.webp')] bg-cover bg-center">
      <div className="mx-auto flex h-20 max-w-[1180px] items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-[14px]">
          <Image
            src="/marketing-images/logo.png"
            alt="AIRA tree-of-life logo"
            width={44}
            height={44}
            priority
            className="size-11 rounded-full"
          />
          <span className="leading-[1.1]">
            <span className="block font-display text-[22px] font-bold tracking-[1.5px] text-foreground">
              AIRA
            </span>
            <span className="block text-[11px] tracking-[0.5px] text-muted-foreground">
              by {brand.parentName}
            </span>
          </span>
        </Link>

        <a
          href="#businesses"
          className="inline-flex items-center rounded-full bg-primary px-5 py-2.5 text-[13px] font-bold uppercase tracking-[0.5px] text-primary-foreground transition-transform hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Waitlist
        </a>
      </div>
    </nav>
  )
}
