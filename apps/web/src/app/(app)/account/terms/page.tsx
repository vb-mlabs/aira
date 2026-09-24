// /account/terms — Legal & Policies for signed-in web users.
//
// Mirrors the mobile Legal & Policies screen
// (apps/mobile/app/(app)/account/terms.tsx): a scannable list of anchor
// links into the single source of truth at /legal. Keeps the app-shell
// chrome (BackLink, page header) but avoids maintaining a parallel
// condensed copy that would drift from /legal.
//
// Each entry deep-links to the section anchor on /legal (declared in
// apps/web/src/app/legal/page.tsx). Same anchors as the mobile screen,
// same order, same labels.

import type { Metadata } from "next"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { brand } from "@aira/config"
import { AccountBackLink } from "../_components/back-link"

export const metadata: Metadata = {
  title: "Legal & Policies",
}

type LegalLink = {
  anchor: string
  label: string
}

const LINKS: LegalLink[] = [
  { anchor: "terms", label: "Terms of Use" },
  { anchor: "privacy", label: "Privacy Policy" },
  { anchor: "listing-disclaimer", label: "Business Listing Disclaimer" },
  { anchor: "sponsored", label: "Sponsored Placement Policy" },
  { anchor: "verification", label: `How ${brand.name} Verification Works` },
  { anchor: "aira-review", label: `${brand.name} Stars & ${brand.name} Review Policy` },
  { anchor: "community", label: "Community Guidelines" },
  { anchor: "refunds", label: "Refund & Cancellation Policy" },
  { anchor: "deletion", label: "Account & Data Deletion" },
]

export default function TermsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-5 py-8 sm:px-8 sm:py-10">
      <AccountBackLink />
      <header>
        <h1 className="font-display text-2xl text-foreground">
          Legal & Policies
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review the policies that govern your use of {brand.name}, business
          listings, paid placements, verification, reviews, community
          content, payments, and account deletion.
        </p>
      </header>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {LINKS.map((item, idx) => (
          <Link
            key={item.anchor}
            href={`/legal#${item.anchor}`}
            className={
              idx === LINKS.length - 1
                ? "flex items-center justify-between gap-3 px-4 py-4 text-sm text-foreground hover:bg-muted/40"
                : "flex items-center justify-between gap-3 border-b border-border px-4 py-4 text-sm text-foreground hover:bg-muted/40"
            }
          >
            <span>{item.label}</span>
            <ChevronRight
              aria-hidden="true"
              className="h-4 w-4 shrink-0 text-muted-foreground"
            />
          </Link>
        ))}
      </div>

      <p className="text-center text-xs tracking-wide text-muted-foreground">
        Operated by {brand.legalEntity}
      </p>
    </div>
  )
}
