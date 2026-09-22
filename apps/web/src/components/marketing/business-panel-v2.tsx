// "Why Businesses Choose AIRA" — 3-column: Membership video (left) ·
// Customer benefits (center, stacked) · Verified Badge video (right).
// Same shape as the video/content/video layout from earlier iterations;
// the center now carries the 3 customer-facing benefits (Easy Search /
// Trusted Businesses / Save Favorites) as icon + title + body cards
// stacked vertically.
//
// Kept `id="businesses"` so MarketingNav's "Get Listed Early" anchor and
// the two HeroV2 Owner CTAs (GetListedDialog / LaunchOfferDialog) still
// land here. Gated on NEXT_PUBLIC_LANDING_HERO_V2 via page.tsx — the
// original BusinessPanel renders when the flag is off.

import { Heart, Search, ShieldCheck } from "lucide-react"
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

        {/* 3-column: video · benefits (stacked) · video */}
        <div className="mt-14 grid grid-cols-1 items-center gap-12 md:grid-cols-[1.15fr_1fr_1.15fr] md:gap-10">
          {/* -------- LEFT: Membership video -------- */}
          <div className="order-2 flex flex-col items-center gap-3 md:order-1">
            <LiteYouTube
              videoId="dLipSrr3tBY"
              title="Membership & Sponsorship, explained"
              posterAlt={`Play: how ${brand.name} membership and sponsorship work`}
              caption="How membership & sponsorship work."
              captionClassName="text-muted-foreground"
            />
          </div>

          {/* -------- CENTER: 3 customer-benefit cards stacked -------- */}
          <ul className="order-1 flex flex-col items-center gap-8 md:order-2">
            {BENEFITS.map(({ Icon, title, body }) => (
              <li
                key={title}
                className="flex flex-col items-center gap-2 text-center"
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
                <p className="max-w-[26ch] text-[14px] leading-[1.55] text-muted-foreground">
                  {body}
                </p>
              </li>
            ))}
          </ul>

          {/* -------- RIGHT: Verified badge video -------- */}
          <div className="order-3 flex flex-col items-center gap-3">
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
