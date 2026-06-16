// "<- Account" affordance rendered at the top of every /account/* sub-page
// AND /profile. The /account hub itself does NOT render this (the
// sidebar / bottom-tab bar already handles outward navigation from the
// hub). Server component — no client JS.

import Link from "next/link"
import { ChevronLeft } from "lucide-react"

export function AccountBackLink() {
  return (
    <Link
      href="/account"
      className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ChevronLeft className="size-4" aria-hidden />
      <span>Account</span>
    </Link>
  )
}
