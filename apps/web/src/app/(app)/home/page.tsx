// End-user landing screen after sign-in. Brand-led: centered tree-of-life
// mark + wordmark + tagline, then a short About block, two community stat
// cards (both live counts via the /api/v1/* boundary — Businesses Listed
// and Community Members), and a Featured Businesses list — 5 random
// businesses drawn from the strict sponsored pool. Featured section is
// hidden when the pool is empty so the page doesn't render a hollow
// block.

import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { brand } from "@aira/config"
import { BusinessCard, StatCard } from "@/features/listings"
import { apiServerFetch } from "@aira/api/server"
import { getSession } from "@/lib/auth/server"
import {
  countActiveBusinessesOp,
  listBusinessesOp,
} from "@/server/operations/businesses"
import { countCommunityMembersOp } from "@/server/operations/users"
import { listMyFavoriteIdsOp } from "@/server/operations/favorites"

export const metadata: Metadata = {
  title: "Home",
}

const TAGLINE_CAPTION = brand.tagline.split(" & ").join(" · ")

export default async function HomePage() {
  const session = await getSession()
  const isSignedIn = !!session

  const [featuredRes, bizCountRes, memberCountRes, favIdsRes] =
    await Promise.all([
      apiServerFetch(listBusinessesOp, { input: { featured: true, limit: 5 } }),
      apiServerFetch(countActiveBusinessesOp, { input: {} }),
      apiServerFetch(countCommunityMembersOp, { input: {} }),
      // Skip the user-scoped fetch entirely when anonymous — the cards just
      // render without a heart.
      isSignedIn
        ? apiServerFetch(listMyFavoriteIdsOp, { input: {} })
        : Promise.resolve(null),
    ])

  const featured = featuredRes.data?.items ?? []
  const bizCount = bizCountRes.data?.count ?? 0
  const bizCountDisplay = bizCount > 0 ? `${bizCount}+` : "—"
  const memberCount = memberCountRes.data?.count ?? 0
  const memberCountDisplay = memberCount > 0 ? `${memberCount}+` : "—"
  const favIds = new Set(favIdsRes?.data?.ids ?? [])

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
      <section className="text-center">
        <Image
          src="/marketing-images/logo.png"
          alt={`${brand.name} tree-of-life logo`}
          width={140}
          height={140}
          priority
          className="mx-auto mb-5 size-24 sm:size-[140px]"
        />
        <h1 className="bg-[linear-gradient(180deg,oklch(0.42_0.09_80)_0%,oklch(0.66_0.10_80)_100%)] bg-clip-text font-display text-5xl font-bold text-transparent sm:text-6xl">
          {brand.name}
        </h1>
        <p className="mt-2 text-sm font-bold uppercase tracking-[0.3em] text-foreground sm:text-base">
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
        <StatCard value={memberCountDisplay} label="Community Members" />
      </section>

      {featured.length > 0 && (
        <section className="mt-12">
          <div className="mx-auto flex max-w-2xl items-center justify-between">
            <h3 className="font-display text-2xl text-foreground">
              Featured Businesses
            </h3>
            <Link
              href="/categories"
              className="text-sm text-primary hover:underline"
            >
              View All →
            </Link>
          </div>
          <ul className="mx-auto mt-4 max-w-2xl space-y-3">
            {featured.map((b) => (
              <li key={b.id}>
                <BusinessCard
                  business={b}
                  isSignedIn={isSignedIn}
                  isFavorited={favIds.has(b.id)}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
