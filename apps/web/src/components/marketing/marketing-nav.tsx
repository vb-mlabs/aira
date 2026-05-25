// Sticky nav for the marketing landing page. Cream backdrop-blur, AIRA
// tree-of-life logo + wordmark left, quiet "Get notified at launch" anchor
// link (brass-gold underline, not a pill button — keeps the editorial
// register).
//
// The marketing page is fully unauthenticated pre-launch, so `signedIn` is
// no longer used to switch CTAs. Kept as an optional ignored prop so
// existing call sites (apps/web/src/app/page.tsx in pre-T11 state, plus
// legal-page.tsx which never passed it) still typecheck through the
// T10 → T11 transition. T11 drops the prop entirely.

import Image from "next/image"
import Link from "next/link"

type MarketingNavProps = {
  /** @deprecated — ignored. Removed in T11 cutover. */
  signedIn?: boolean
}

export function MarketingNav({}: MarketingNavProps = {}) {
  return (
    <nav className="sticky top-0 z-50 bg-[color:oklch(0.90_0.04_85_/_85%)] backdrop-blur-[10px]">
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
              by Nisarga
            </span>
          </span>
        </Link>

        <Link
          href="#notify"
          className="border-b border-[color:oklch(0.66_0.10_80_/_60%)] pb-[3px] text-[13px] font-bold uppercase tracking-[0.5px] text-foreground transition-colors hover:border-primary hover:text-primary"
        >
          Get notified at launch
        </Link>
      </div>
    </nav>
  )
}
