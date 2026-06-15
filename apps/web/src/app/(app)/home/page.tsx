// End-user landing screen after sign-in. Brand-led: centered tree-of-life
// mark + wordmark + tagline, then a short About block, two community stat
// cards (live Businesses count via the /api/v1/* boundary, Community
// Members from the brand layer), and a Featured Businesses list pulled
// from the directory (tier1 + tier2, max 6). Featured section is hidden
// when the directory is still empty so the page doesn't render a hollow
// block.

import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { brand } from "@aira/config"
import { BusinessCard, StatCard } from "@/features/listings"
import { apiServerFetch } from "@aira/api/server"
import {
  countActiveBusinessesOp,
  listBusinessesOp,
} from "@/server/operations/businesses"

export const metadata: Metadata = {
  title: "Home",
}

const TAGLINE_CAPTION = brand.tagline.split(" & ").join(" · ")

export default async function HomePage() {
  const [featuredRes, countRes] = await Promise.all([
    apiServerFetch(listBusinessesOp, { input: { featured: true, limit: 6 } }),
    apiServerFetch(countActiveBusinessesOp, { input: {} }),
  ])

  const featured = featuredRes.data?.items ?? []
  const bizCount = countRes.data?.count ?? 0
  const bizCountDisplay = bizCount > 0 ? String(bizCount) : "—"

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
      <section className="text-center">
        <Image
          src="/marketing-images/logo.png"
          alt={`${brand.name} tree-of-life logo`}
          width={88}
          height={88}
          priority
          className="mx-auto mb-4 size-16 sm:size-[88px]"
        />
        <h1 className="font-display text-4xl text-foreground sm:text-5xl">
          {brand.name}
        </h1>
        <p className="mt-1 text-xs font-bold uppercase tracking-[0.3em] text-primary">
          {TAGLINE_CAPTION}
        </p>
      </section>

      <section className="mx-auto mt-10 max-w-2xl text-center">
        <h2 className="font-display text-3xl text-foreground">
          {brand.homepage.aboutTitle}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-foreground/80 sm:text-base">
          {brand.homepage.aboutBody}
        </p>
      </section>

      <section className="mx-auto mt-8 grid max-w-md grid-cols-2 gap-4">
        <StatCard value={bizCountDisplay} label="Businesses Listed" />
        <StatCard
          value={brand.homepage.communityMembers}
          label="Community Members"
        />
      </section>

      {featured.length > 0 && (
        <section className="mt-12">
          <div className="mx-auto flex max-w-2xl items-center justify-between">
            <h3 className="font-display text-2xl text-foreground">
              Featured Businesses
            </h3>
            <Link
              href="/directory"
              className="text-sm text-primary hover:underline"
            >
              View All →
            </Link>
          </div>
          <ul className="mx-auto mt-4 max-w-2xl space-y-3">
            {featured.map((b) => (
              <li key={b.id}>
                <BusinessCard business={b} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
