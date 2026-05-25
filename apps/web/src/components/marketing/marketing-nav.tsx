// Sticky nav for the marketing landing page. Cream backdrop-blur, AIRA
// tree-of-life logo + wordmark left, three CTAs on the right:
//   1. "Get notified at launch" — quiet brass-gold anchor → waitlist card
//      (kept for low-commit visitors; hidden on small screens)
//   2. "Sign in" — quiet text link → /login (for returning users)
//   3. "Get Started" — primary olive pill → /signup (the real auth route,
//      available now that Better Auth ships in the template)

import Image from "next/image"
import Link from "next/link"

export function MarketingNav() {
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

        <div className="flex items-center gap-5 sm:gap-6">
          <Link
            href="#notify"
            className="hidden border-b border-brand-gold/60 pb-[3px] text-[13px] font-bold uppercase tracking-[0.5px] text-foreground transition-colors hover:border-primary hover:text-primary sm:inline-block"
          >
            Get notified at launch
          </Link>
          <Link
            href="/login"
            className="text-[13px] font-bold uppercase tracking-[0.5px] text-muted-foreground no-underline transition-colors hover:text-primary"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center rounded-full bg-primary px-5 py-2.5 text-[13px] font-bold uppercase tracking-[0.5px] text-primary-foreground no-underline transition-transform hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  )
}
