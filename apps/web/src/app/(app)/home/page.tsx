// End-user landing screen after sign-in. Brand-led: centered tree-of-life
// mark + wordmark + tagline, then a short About block, two community stat
// cards (live counts from DB or admin overrides), and a Featured Businesses
// list pulled from the directory (tier1 + tier2, max 6). Featured section is
// hidden when the directory is still empty so the page doesn't render a
// hollow block.

import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { brand } from "@aira/config"
import { BusinessCard, StatCard } from "@/features/listings"
import { apiServerFetch } from "@aira/api/server"
import { listBusinessesOp } from "@/server/operations/businesses"
import { getAppSettingsPublicOp } from "@/server/operations/app-settings"
import { businesses as businessesService } from "@aira/services"
import { db } from "@/lib/db"

export const metadata: Metadata = {
  title: "Home",
}

const TAGLINE_CAPTION = brand.tagline.split(" & ").join(" · ")

export default async function HomePage() {
  const [featuredRes, settingsRes] = await Promise.all([
    apiServerFetch(listBusinessesOp, { input: { featured: true, limit: 6 } }),
    apiServerFetch(getAppSettingsPublicOp, { input: {} }),
  ])

  const featured = featuredRes.data?.items ?? []
  const settings = Object.fromEntries(
    (settingsRes.data?.settings ?? []).map((s) => [s.key, s.value]),
  )

  const aboutTitle =
    settings.homepage_about_title ??
    `About ${brand.name}`
  const aboutBody =
    settings.homepage_about_body ??
    `${brand.name} is Atlanta's community directory connecting local Indian businesses, services, and resources with the people who care about them.`

  const bizCountSetting = settings.homepage_stat_businesses ?? "auto"
  const userCountSetting = settings.homepage_stat_users ?? "auto"

  const bizCount =
    bizCountSetting === "auto"
      ? await businessesService.countActiveBusinesses(db)
      : Number.parseInt(bizCountSetting, 10)

  const bizCountDisplay =
    Number.isFinite(bizCount) && bizCount > 0 ? `${bizCount}` : "—"
  const userCountDisplay =
    userCountSetting === "auto" ? "—" : userCountSetting

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
        <h2 className="font-display text-3xl text-foreground">{aboutTitle}</h2>
        <p className="mt-3 text-sm leading-relaxed text-foreground/80 sm:text-base">
          {aboutBody}
        </p>
      </section>

      <section className="mx-auto mt-8 grid max-w-md grid-cols-2 gap-4">
        <StatCard value={bizCountDisplay} label="Businesses Listed" />
        <StatCard value={userCountDisplay} label="Community Members" />
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
