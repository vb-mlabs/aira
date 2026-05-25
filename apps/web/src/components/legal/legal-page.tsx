// Shared chrome for /privacy and /terms. Marketing nav + footer wrap a
// max-w-3xl prose body. Each section heading uses a consistent style.
//
// The `legal/` folder is in the ESLint brand-string allowlist, so
// placeholder copy may mention the brand verbatim if needed.

import type { ReactNode } from "react"
import { MarketingFooter } from "@/components/marketing/marketing-footer"
import { MarketingNav } from "@/components/marketing/marketing-nav"

type LegalPageProps = {
  title: string
  lastUpdated: string
  children: ReactNode
}

export function LegalPage({ title, lastUpdated, children }: LegalPageProps) {
  return (
    <>
      <MarketingNav />
      <main className="flex flex-1 flex-col">
        <div className="mx-auto w-full max-w-3xl px-6 py-16">
          <div className="mb-12 border-b border-border pb-8">
            <h1 className="text-4xl font-extrabold tracking-tight">{title}</h1>
            <p className="mt-3 text-[13px] uppercase tracking-[0.18em] text-muted-foreground">
              Last updated · {lastUpdated}
            </p>
          </div>
          <div className="space-y-10 text-[15px] leading-relaxed text-foreground">
            {children}
          </div>
          <div className="mt-16 rounded-2xl border border-dashed border-border bg-muted/40 p-6 text-[13px] text-muted-foreground">
            <strong className="font-semibold text-foreground">
              Template placeholder.
            </strong>{" "}
            This document is a starting point. Replace every TODO marker
            with copy reviewed by your legal counsel before launch.
          </div>
        </div>
      </main>
      <MarketingFooter />
    </>
  )
}

export function LegalSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section>
      <h2 className="mb-4 text-2xl font-bold tracking-tight">{title}</h2>
      <div className="space-y-4 text-muted-foreground">{children}</div>
    </section>
  )
}
