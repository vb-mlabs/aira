// /account/about — brand mission + identity card. Static SSR. All brand
// strings flow through @aira/config so no-brand-string-literal passes.

import type { Metadata } from "next"
import { brand } from "@aira/config"
import { SectionCard } from "@/features/profile/components/section-card"
import { AccountBackLink } from "../_components/back-link"

export const metadata: Metadata = {
  title: `About ${brand.name}`,
}

// Tagline pull-quote: split on the highlight substring so the accent word
// renders in text-primary. Mirrors the marketing hero's behaviour.
function TaglinePullQuote() {
  const idx = brand.tagline.indexOf(brand.taglineHighlight)
  if (idx === -1) {
    return (
      <p className="text-center font-display text-3xl tracking-wide text-foreground">
        {brand.tagline}
      </p>
    )
  }
  const before = brand.tagline.slice(0, idx)
  const after = brand.tagline.slice(idx + brand.taglineHighlight.length)
  return (
    <p className="text-center font-display text-3xl tracking-wide text-foreground">
      {before}
      <span className="text-primary">{brand.taglineHighlight}</span>
      {after}
    </p>
  )
}

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-5 py-8 sm:px-8 sm:py-10">
      <AccountBackLink />
      <header>
        <h1 className="font-display text-2xl text-foreground">
          About {brand.name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {brand.name} by {brand.parentName}.
        </p>
      </header>

      <SectionCard title="Our mission">
        <div className="space-y-4">
          <TaglinePullQuote />
          <p className="text-sm text-muted-foreground">
            {brand.name} connects the community to trusted local businesses,
            events, and each other. Built by people who use it.
          </p>
        </div>
      </SectionCard>

      <SectionCard title="Get in touch">
        <dl className="space-y-3 text-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <dt className="text-muted-foreground">Support</dt>
            <dd>
              <a
                href={`mailto:${brand.supportEmail}`}
                className="text-primary underline-offset-2 hover:underline"
              >
                {brand.supportEmail}
              </a>
            </dd>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <dt className="text-muted-foreground">Social</dt>
            <dd className="text-foreground">{brand.socialHandle}</dd>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <dt className="text-muted-foreground">Operated by</dt>
            <dd className="text-foreground">{brand.legalEntity}</dd>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <dt className="text-muted-foreground">Version</dt>
            <dd className="text-foreground">MVP</dd>
          </div>
        </dl>
      </SectionCard>
    </div>
  )
}
