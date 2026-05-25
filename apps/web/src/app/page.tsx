import { getSession } from "@/lib/auth/server"
import { CtaBand } from "@/components/marketing/cta-band"
import { FeatureGrid } from "@/components/marketing/feature-grid"
import { Hero } from "@/components/marketing/hero"
import { LogoStrip } from "@/components/marketing/logo-strip"
import { MarketingFooter } from "@/components/marketing/marketing-footer"
import { MarketingNav } from "@/components/marketing/marketing-nav"
import { ProductMock } from "@/components/marketing/product-mock"
import { Testimonial } from "@/components/marketing/testimonial"
import { WhyMstack } from "@/components/marketing/why-mstack"

export default async function Home() {
  const session = await getSession()
  const signedIn = !!session?.user

  return (
    <>
      <MarketingNav signedIn={signedIn} />
      <main className="flex flex-1 flex-col">
        <Hero />
        <WhyMstack />
        <ProductMock />
        <LogoStrip />
        <FeatureGrid />
        <Testimonial />
        <CtaBand />
      </main>
      <MarketingFooter />
    </>
  )
}
