// AIRA marketing landing page. Hero swap gated on
// env.NEXT_PUBLIC_LANDING_HERO_V2 — off (default) renders the pre-launch
// centered Hero + WaitlistCard + "Launching soon" OG; on renders the
// 3-tier HeroV2 (Discover · Support · Grow) + app-live OG. Both flows
// share MarketingNav + AboutEditorial + PhoneShowcase + BusinessPanel +
// MarketingFooter. Cleanup PR after sign-off deletes the flag + old Hero.

import { brand } from "@aira/config"
import { AboutEditorial } from "@/components/marketing/about-editorial"
import { BusinessPanel } from "@/components/marketing/business-panel"
import { Hero } from "@/components/marketing/hero"
import { HeroV2 } from "@/components/marketing/hero-v2"
import { MarketingFooter } from "@/components/marketing/marketing-footer"
import { MarketingNav } from "@/components/marketing/marketing-nav"
import { PhoneShowcase } from "@/components/marketing/phone-showcase"
import { env } from "@/config/env"
import { generateMetadata as buildMetadata } from "@/config/seo"

const LANDING_HERO_V2 = env.NEXT_PUBLIC_LANDING_HERO_V2 === "1"

const PRE_LAUNCH_TITLE = `${brand.name} — Atlanta's South Asian business directory, curated with care`
const PRE_LAUNCH_DESCRIPTION = `${brand.name} is a hand-curated directory of trusted South Asian-owned businesses across metro Atlanta. Operated by ${brand.legalEntity}. Launching soon — get notified.`

const APP_LIVE_TITLE = `${brand.name} — America's South Asian business directory. Discover. Support. Grow.`
const APP_LIVE_DESCRIPTION = `Discover trusted South Asian-owned businesses across the USA. ${brand.name} is a curated community directory — free to download, free to be listed. Now serving Atlanta and growing city by city.`

const PAGE_TITLE = LANDING_HERO_V2 ? APP_LIVE_TITLE : PRE_LAUNCH_TITLE
const PAGE_DESCRIPTION = LANDING_HERO_V2 ? APP_LIVE_DESCRIPTION : PRE_LAUNCH_DESCRIPTION

export const metadata = buildMetadata({
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: `${brand.name} — Atlanta's South Asian business directory`,
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: ["/og-image.png"],
  },
})

export default function Home() {
  const HeroComponent = LANDING_HERO_V2 ? HeroV2 : Hero
  return (
    <>
      <MarketingNav />
      <main className="flex flex-1 flex-col">
        <HeroComponent />
        <AboutEditorial />
        <PhoneShowcase />
        <BusinessPanel />
      </main>
      <MarketingFooter />
    </>
  )
}
