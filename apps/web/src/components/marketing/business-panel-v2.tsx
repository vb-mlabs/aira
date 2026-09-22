// "Why Businesses Choose AIRA" — landing section framing the value prop
// from the customer angle (businesses choose AIRA because these are the
// reasons customers keep coming back). Two-part layout:
//
//   1. Centered heading
//   2. 4-column benefits strip: Easy Search · Trusted Businesses ·
//      Save Favorites · Stay Updated — icon over title over body,
//      matches the client brief crop (image_1790087420089.png).
//   3. Two videos side-by-side underneath: "Membership & Sponsorship"
//      and "The Verified Badge & Stars".
//
// Kept `id="businesses"` so MarketingNav's "Get Listed Early" anchor and
// the two HeroV2 Owner CTAs (GetListedDialog / LaunchOfferDialog) still
// land here. Gated on NEXT_PUBLIC_LANDING_HERO_V2 via page.tsx — the
// original BusinessPanel renders when the flag is off.

import { Bell, Heart, Search, ShieldCheck } from "lucide-react"
import { brand } from "@aira/config"
import { LiteYouTube } from "./lite-youtube"

const BENEFITS = [
  {
    Icon: Search,
    title: "Easy Search",
    body: "Find businesses by category, location & more.",
  },
  {
    Icon: ShieldCheck,
    title: "Trusted Businesses",
    body: `Look for Verified Badge and ${brand.name} Reviews.`,
  },
  {
    Icon: Heart,
    title: "Save Favorites",
    body: "Save and revisit your favorite businesses.",
  },
  {
    Icon: Bell,
    title: "Stay Updated",
    body: "Get updates on offers, events & new businesses.",
  },
] as const

export function BusinessPanelV2() {
  return (
    <section
      id="businesses"
      className="scroll-mt-20 bg-[url('/marketing-images/textures/paper-cream.webp')] bg-cover bg-center py-[120px] text-foreground"
    >
      <div className="mx-auto max-w-[1240px] px-6">
        {/* Centered heading */}
        <div className="mx-auto max-w-[720px] text-center">
          <h2 className="font-display text-4xl font-bold leading-[1.05] text-foreground md:text-5xl">
            Why Businesses Choose{" "}
            <em className="not-italic text-primary">{brand.name}</em>
          </h2>
        </div>

        {/* 4-column benefits strip */}
        <ul className="mx-auto mt-14 grid max-w-[1100px] grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-4 md:gap-8">
          {BENEFITS.map(({ Icon, title, body }) => (
            <li
              key={title}
              className="flex flex-col items-center gap-3 text-center"
            >
              <span
                aria-hidden="true"
                className="grid size-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-primary-glow)]"
              >
                <Icon className="size-6" strokeWidth={1.8} />
              </span>
              <h3 className="font-display text-lg font-bold leading-tight text-foreground">
                {title}
              </h3>
              <p className="max-w-[24ch] text-[14px] leading-[1.55] text-muted-foreground">
                {body}
              </p>
            </li>
          ))}
        </ul>

        {/* Videos underneath — 2-column, side-by-side on desktop */}
        <div className="mx-auto mt-16 grid max-w-[900px] grid-cols-1 gap-10 md:grid-cols-2 md:gap-12">
          <div className="flex flex-col items-center gap-3">
            <LiteYouTube
              videoId="dLipSrr3tBY"
              title="Membership & Sponsorship, explained"
              posterAlt={`Play: how ${brand.name} membership and sponsorship work`}
              caption="How membership & sponsorship work."
              captionClassName="text-muted-foreground"
            />
          </div>
          <div className="flex flex-col items-center gap-3">
            <LiteYouTube
              videoId="snDcgvdaSQg"
              title="The Verified Badge & Stars"
              posterAlt={`Play: what the blue tick and stars mean on ${brand.name}`}
              caption="The blue tick & stars, explained."
              captionClassName="text-muted-foreground"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
