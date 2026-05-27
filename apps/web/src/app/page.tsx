// AIRA marketing landing page. Pre-launch — waitlist mode. Visual reference:
// .mstack/mockups/marketing-page/v4/index.html. Section order is locked.

import { brand } from "@aira/config"
import { AboutEditorial } from "@/components/marketing/about-editorial"
import { BusinessPanel } from "@/components/marketing/business-panel"
import { Hero } from "@/components/marketing/hero"
import { MarketingFooter } from "@/components/marketing/marketing-footer"
import { MarketingNav } from "@/components/marketing/marketing-nav"
import { PhoneShowcase } from "@/components/marketing/phone-showcase"
import { generateMetadata as buildMetadata } from "@/config/seo"

const PAGE_TITLE = `${brand.name} — A directory of Atlanta's Indian community, curated with care`
const PAGE_DESCRIPTION = `${brand.name} is a hand-curated directory of trusted Indian-owned businesses across metro Atlanta. Operated by ${brand.legalEntity}. Launching soon — get notified.`

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
        alt: `${brand.name} — Atlanta's Indian community directory`,
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
  return (
    <>
      <MarketingNav />
      <main className="flex flex-1 flex-col">
        <Hero />
        <AboutEditorial />
        <PhoneShowcase />
        <BusinessPanel />
      </main>
      <MarketingFooter />
    </>
  )
}
