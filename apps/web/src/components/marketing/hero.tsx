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
    <section className="flex min-h-[calc(100svh-80px)] flex-col items-center justify-center bg-[url('/marketing-images/textures/paper-cream.webp')] bg-cover bg-center px-6 pb-20 pt-15 text-center">
      <Image
        src="/marketing-images/logo.png"
        alt="AIRA tree-of-life"
        width={190}
        height={190}
        priority
        className="mb-5 size-[180px] drop-shadow-[0_16px_32px_oklch(0.25_0.04_60_/_25%)] md:size-[190px]"
      />
      <p className="mb-7 font-display text-[20px] italic text-muted-foreground md:text-[22px]">
        Roots &amp;{" "}
        <em className="font-bold not-italic text-brand-gold">
          Reach
        </em>
      </p>
      <h1 className="m-0 max-w-[640px] font-display text-[30px] font-semibold leading-[1.2] tracking-tight text-foreground md:text-[3.6vw] md:[font-size:clamp(28px,3.6vw,44px)]">
        Atlanta&rsquo;s Indian business directory,{" "}
        <em className="font-bold italic text-primary">curated with care</em>
      </h1>

      <WaitlistCard />
    </section>
  )
}
