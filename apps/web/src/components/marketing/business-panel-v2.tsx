// "Why Businesses Choose AIRA" — repurposed BusinessPanel for the new
// landing flow. Same olive/green surface as the original, but restructured
// into three columns: video LEFT · pitch + perks + CTAs CENTER · video
// RIGHT. Both existing marketing videos (Membership & Sponsorship,
// The Verified Badge & Stars) flank the value-prop content.
//
// Kept `id="businesses"` so MarketingNav's "Get Listed Early" anchor
// (href="#businesses") and the primary/secondary Owner CTAs from HeroV2
// (which reuse GetListedDialog / LaunchOfferDialog) all still land here.
//
// Gated behind NEXT_PUBLIC_LANDING_HERO_V2 via page.tsx — the original
// BusinessPanel keeps rendering when the flag is off.

import { brand } from "@aira/config"
import { BusinessCtaPair } from "./business-cta-pair"
import { LiteYouTube } from "./lite-youtube"

const PERKS = [
  {
    title: "Verified badge",
    body: "the blue tick that tells customers we've checked you're real.",
  },
  {
    title: "Sponsored placement",
    body: "top of your category for a fixed monthly tier.",
  },
  {
    title: "Multi-category listing",
    body: "show up in every category that fits.",
  },
  {
    title: "Broadcast to your audience",
    body: "opt-in push notifications when there's news for your category.",
  },
] as const

export function BusinessPanelV2() {
  return (
    <section
      id="businesses"
      className="scroll-mt-20 bg-[color:oklch(0.42_0.06_130)] bg-[url('/marketing-images/textures/paper-green.webp')] bg-cover bg-center py-[120px] text-brand-cream-bright"
    >
      <div className="mx-auto max-w-[1240px] px-6">
        {/* Centered heading */}
        <div className="mx-auto max-w-[720px] text-center">
          <span className="block text-[13px] font-bold uppercase tracking-[4px] text-brand-cream-muted">
            For business owners
          </span>
          <h2 className="mt-4 font-display text-4xl font-bold leading-[1.05] text-brand-cream-bright md:text-5xl">
            Why Businesses Choose{" "}
            <em className="not-italic text-brand-gold">{brand.name}</em>
          </h2>
          <p className="mx-auto mt-5 max-w-[560px] text-[16px] leading-[1.6] text-brand-cream-muted">
            Curated placement, real credibility, and a growing community that
            comes back. Watch how membership and the verified badge work.
          </p>
        </div>

        {/* 3-column: video · content · video */}
        <div className="mt-14 grid grid-cols-1 items-center gap-12 md:grid-cols-[1fr_1.15fr_1fr] md:gap-10">
          {/* -------- LEFT: Membership video -------- */}
          <div className="order-2 flex flex-col items-center gap-3 md:order-1">
            <LiteYouTube
              videoId="dLipSrr3tBY"
              title="Membership & Sponsorship, explained"
              posterAlt={`Play: how ${brand.name} membership and sponsorship work`}
              caption="How membership & sponsorship work."
              captionClassName="text-brand-cream-muted"
            />
          </div>

          {/* -------- CENTER: perks + CTAs -------- */}
          <div className="order-1 flex flex-col items-center gap-8 md:order-2">
            <ul className="w-full max-w-[420px] space-y-4">
              {PERKS.map((perk) => (
                <li key={perk.title} className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 grid size-[26px] flex-shrink-0 place-items-center rounded-full bg-brand-cream-bright text-[13px] font-bold text-[color:oklch(0.42_0.06_130)]"
                  >
                    ✓
                  </span>
                  <p className="text-[15px] leading-[1.55] text-brand-cream-muted">
                    <strong className="font-bold text-brand-cream-bright">
                      {perk.title}
                    </strong>{" "}
                    &mdash; {perk.body}
                  </p>
                </li>
              ))}
            </ul>

            <div className="flex w-full justify-center">
              <BusinessCtaPair />
            </div>
          </div>

          {/* -------- RIGHT: Verified badge video -------- */}
          <div className="order-3 flex flex-col items-center gap-3">
            <LiteYouTube
              videoId="snDcgvdaSQg"
              title="The Verified Badge & Stars"
              posterAlt={`Play: what the blue tick and stars mean on ${brand.name}`}
              caption="The blue tick & stars, explained."
              captionClassName="text-brand-cream-muted"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
