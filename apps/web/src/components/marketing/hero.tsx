// Centered editorial hero. Tree-of-life logo at 140px, Cormorant headline,
// italic tagline ("Roots & Reach" with REACH in brass-gold), then the
// embedded <WaitlistCard> for the pre-launch email-capture conversion.
//
// Marketing copy lives inline (allowlist per T9). brand.name imported so
// the prose stays in sync if the brand display name ever rotates — but the
// surrounding sentences read AIRA literally because that's the brand voice.

import Image from "next/image"
import { WaitlistCard } from "./waitlist-card"

export function Hero() {
  return (
    <section className="flex min-h-[calc(100svh-80px)] flex-col items-center justify-center px-6 pb-20 pt-15 text-center">
      <Image
        src="/marketing-images/logo.png"
        alt="AIRA tree-of-life"
        width={140}
        height={140}
        priority
        className="mb-9 size-[140px] drop-shadow-[0_16px_32px_oklch(0.25_0.04_60_/_25%)]"
      />
      <h1 className="m-0 max-w-[900px] font-display text-[40px] font-semibold leading-[1.02] tracking-tight text-foreground md:text-[6.8vw] md:[font-size:clamp(40px,6.8vw,80px)]">
        A directory of Atlanta&rsquo;s Indian community,
        <br />
        <em className="font-bold italic text-primary">curated with care.</em>
      </h1>
      <p className="mt-7 font-display text-[24px] italic text-muted-foreground">
        Roots &amp;{" "}
        <em className="font-bold not-italic text-brand-gold">
          Reach
        </em>
      </p>

      <WaitlistCard />
    </section>
  )
}
