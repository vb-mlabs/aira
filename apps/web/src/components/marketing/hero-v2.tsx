// 3-tier landing hero — "For Users | Phone | For Business Owners" with
// centered "Discover. Support. Grow." headline. Gated behind
// NEXT_PUBLIC_LANDING_HERO_V2 on page.tsx; falls back to the pre-launch
// Hero when the flag is off. Reuses GetListedDialog + LaunchOfferDialog
// from the sibling modules so both Owner CTAs open the same dialogs the
// BusinessPanel section uses (single source of truth for pricing + signup).
//
// Visual reference: .mstack/mockups/landing-hero-3tier/v1/index.html.

import Image from "next/image"
import { Check, ShieldCheck, Star, Store, TrendingUp, Users } from "lucide-react"
import { brand } from "@aira/config"
import { GetListedDialog } from "./business-cta-pair"
import { LaunchOfferDialog } from "./launch-offer-dialog"

const USER_BULLETS = [
  "Free to download",
  "One-time email login to get started",
  "Search by category, location & more",
  "Save favorites and stay connected",
] as const

const BENEFITS = [
  {
    Icon: ShieldCheck,
    title: "Verified Badge builds trust",
    body: "Stand out as a trusted business in the community.",
  },
  {
    Icon: Star,
    title: `${brand.name} Review boosts credibility`,
    body: `Genuine review by the ${brand.name} team to help build trust and visibility.`,
  },
  {
    Icon: TrendingUp,
    title: "Sponsorship Add-Ons increase visibility",
    body: "Featured placement and stronger reach for your business.",
  },
] as const

export function HeroV2() {
  return (
    <section className="bg-[url('/marketing-images/textures/paper-cream.webp')] bg-cover bg-center px-6 pb-24 pt-14">
      {/* Centered masthead */}
      <div className="mx-auto max-w-[900px] text-center">
        <span className="mb-4 inline-block font-sans text-xs font-bold uppercase tracking-[2px] text-muted-foreground">
          {brand.tagline}
        </span>
        <h1 className="m-0 font-display text-[clamp(38px,5.5vw,64px)] font-bold leading-[1.02] tracking-tight">
          <span className="text-primary">Discover.</span>{" "}
          <span className="text-primary">Support.</span>{" "}
          <span className="text-primary">Grow.</span>
        </h1>
        <p className="mt-5 font-display text-xl font-bold text-foreground">
          America&rsquo;s South Asian Business Directory
        </p>
        <p className="mx-auto mt-1 max-w-[560px] text-[15px] leading-[1.55] text-muted-foreground">
          Built for communities across the USA. Now serving Atlanta and growing
          city by city.
        </p>
        <div
          aria-hidden="true"
          className="mx-auto mt-6 h-px w-[60px] bg-brand-gold/70"
        />
      </div>

      {/* 3-column grid — phone in center */}
      <div className="mx-auto mt-10 grid max-w-[1240px] grid-cols-1 items-start gap-14 md:mt-12 md:grid-cols-[1fr_minmax(280px,360px)_1fr] md:gap-12">
        {/* -------- LEFT: For Users -------- */}
        <div className="order-2 flex flex-col items-center gap-5 md:order-1">
          <div className="flex flex-col items-center gap-3 text-center">
            <span
              aria-hidden="true"
              className="grid size-[68px] place-items-center rounded-full border border-border/30 bg-card text-primary shadow-[var(--shadow-card)]"
            >
              <Users className="size-[34px]" strokeWidth={1.6} />
            </span>
            <h2 className="font-display text-[28px] font-bold leading-tight text-foreground">
              For Users
            </h2>
            <p className="max-w-[32ch] text-[15px] text-muted-foreground">
              Free to download and easy to get started. Create your login once
              with your email.
            </p>
          </div>

          <ul className="mt-1 flex w-full flex-col gap-2.5">
            {USER_BULLETS.map((bullet) => (
              <li
                key={bullet}
                className="flex items-start gap-2.5 text-[14px] text-foreground"
              >
                <Check
                  aria-hidden="true"
                  className="mt-0.5 size-[18px] shrink-0 text-primary"
                  strokeWidth={2.2}
                />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>

          <div className="mt-3 w-full">
            <h3 className="mb-3 text-center font-display text-lg font-bold text-foreground">
              Scan to Download the App
            </h3>
            <div className="grid grid-cols-2 gap-3.5">
              <QrPlaceholder label="Google Play" />
              <QrPlaceholder label="App Store" />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <StoreBadge
                href="#"
                topline="Get it on"
                store="Google Play"
                iconPath="M3 3.3v17.4c0 .5.6.8 1 .5l12-8.7c.4-.3.4-.9 0-1.2L4 3c-.4-.3-1 0-1 .3z"
                srLabel="Get AIRA on Google Play (link coming soon)"
              />
              <StoreBadge
                href="#"
                topline="Download on the"
                store="App Store"
                iconPath="M16.4 13.1c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.9-1.4-.1-2.8.9-3.6.9-.7 0-1.9-.8-3.1-.8-1.6 0-3.1.9-3.9 2.4-1.7 2.9-.4 7.2 1.2 9.5.8 1.1 1.7 2.4 2.9 2.4 1.2-.1 1.6-.8 3-.8s1.8.8 3.1.7c1.3 0 2.1-1.2 2.9-2.3.9-1.3 1.3-2.6 1.3-2.6s-2.4-.9-2.4-3.6zM14.2 6.2c.6-.8 1.1-1.9 1-3-.9 0-2.1.6-2.7 1.4-.6.7-1.1 1.8-1 2.9 1 .1 2.1-.5 2.7-1.3z"
                srLabel="Download AIRA on the App Store (link coming soon)"
              />
            </div>
          </div>
        </div>

        {/* -------- CENTER: Phone -------- */}
        <div className="order-1 flex justify-center md:order-2">
          <div className="relative w-full max-w-[320px]">
            {/* Ornamental leaves — desktop only, taste-review during PR */}
            <svg
              aria-hidden="true"
              viewBox="0 0 100 120"
              className="pointer-events-none absolute -left-[46px] bottom-[40px] hidden w-[90px] -rotate-[18deg] opacity-70 md:block"
            >
              <path
                d="M50 5 Q90 40 55 115 Q10 60 50 5Z"
                fill="oklch(0.46 0.07 132 / 55%)"
              />
              <path
                d="M50 15 L52 105"
                stroke="oklch(0.94 0.02 80 / 40%)"
                strokeWidth="1.5"
              />
            </svg>
            <svg
              aria-hidden="true"
              viewBox="0 0 100 120"
              className="pointer-events-none absolute -right-[46px] top-[40px] hidden w-[90px] rotate-[24deg] opacity-70 md:block"
            >
              <path
                d="M50 5 Q10 40 45 115 Q90 60 50 5Z"
                fill="oklch(0.62 0.13 55 / 55%)"
              />
              <path
                d="M50 15 L48 105"
                stroke="oklch(0.94 0.02 80 / 40%)"
                strokeWidth="1.5"
              />
            </svg>

            {/* Phone frame */}
            <div className="relative aspect-[320/660] rounded-[44px] border border-[oklch(0.30_0.03_60)] bg-[oklch(0.20_0.03_60)] p-3 shadow-[0_40px_60px_-20px_oklch(0.25_0.04_60_/_35%)]">
              <div
                aria-hidden="true"
                className="absolute left-1/2 top-[14px] z-10 h-[22px] w-[110px] -translate-x-1/2 rounded-[12px] bg-[oklch(0.15_0.02_60)]"
              />
              <Image
                src="/marketing-images/home-screen.png"
                alt={`${brand.name} home screen preview`}
                width={320}
                height={660}
                sizes="(max-width: 767px) 320px, 320px"
                priority
                className="block size-full rounded-[32px] bg-card object-cover"
              />
            </div>
          </div>
        </div>

        {/* -------- RIGHT: For Business Owners -------- */}
        <div className="order-3 flex flex-col items-center gap-5">
          <div className="flex flex-col items-center gap-3 text-center">
            <span
              aria-hidden="true"
              className="grid size-[68px] place-items-center rounded-full border border-border/30 bg-card text-primary shadow-[var(--shadow-card)]"
            >
              <Store className="size-[34px]" strokeWidth={1.6} />
            </span>
            <h2 className="font-display text-[28px] font-bold leading-tight text-foreground">
              For Business Owners
            </h2>
            <p className="max-w-[32ch] text-[15px] text-muted-foreground">
              List your business for free and grow your visibility.
            </p>
          </div>

          <div className="mt-1 flex w-full flex-col gap-2.5">
            <GetListedDialog triggerClassName="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 font-sans text-sm font-bold tracking-[0.3px] text-primary-foreground shadow-[var(--shadow-primary-glow)] transition-transform hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
              Get Listed on {brand.name}
            </GetListedDialog>
            <LaunchOfferDialog triggerClassName="inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-primary bg-transparent px-5 py-[10px] font-sans text-sm font-bold tracking-[0.3px] text-foreground transition-transform hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
              View Pricing &amp; Add-Ons
            </LaunchOfferDialog>
          </div>

          <ul className="mt-4 flex w-full flex-col gap-4">
            {BENEFITS.map(({ Icon, title, body }) => (
              <li
                key={title}
                className="grid grid-cols-[42px_1fr] items-start gap-3"
              >
                <span
                  aria-hidden="true"
                  className="grid size-[42px] place-items-center rounded-full border border-border/30 bg-card text-primary"
                >
                  <Icon className="size-[22px]" strokeWidth={1.8} />
                </span>
                <div className="min-w-0">
                  <strong className="mb-0.5 block text-[14px] font-bold text-foreground">
                    {title}
                  </strong>
                  <span className="block text-[13px] leading-[1.5] text-muted-foreground">
                    {body}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

// ---- Local building blocks ------------------------------------------------

// CSS-only QR placeholder — ships until real QR PNGs land in
// public/marketing-images/ (see .mstack/reviews/... open questions).
function QrPlaceholder({ label }: { label: string }) {
  return (
    <div
      aria-hidden="true"
      className="grid aspect-square place-items-center rounded-[var(--radius)] border border-border/25 bg-card p-2.5"
    >
      <div className="grid size-full place-items-center rounded-md bg-foreground bg-[conic-gradient(from_0deg_at_50%_50%,transparent_0_25%,oklch(0.94_0.02_80_/_12%)_25%_50%,transparent_50%_75%,oklch(0.94_0.02_80_/_12%)_75%)] bg-[size:12px_12px] text-center font-display text-[11px] font-bold tracking-[1px] text-brand-cream-bright">
        {label}
      </div>
    </div>
  )
}

function StoreBadge({
  href,
  topline,
  store,
  iconPath,
  srLabel,
}: {
  href: string
  topline: string
  store: string
  iconPath: string
  srLabel: string
}) {
  return (
    <a
      href={href}
      aria-label={srLabel}
      className="flex items-center gap-2.5 rounded-[10px] bg-foreground px-3 py-2 text-brand-cream-bright no-underline transition-transform hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-[22px] shrink-0 fill-current"
      >
        <path d={iconPath} />
      </svg>
      <span className="leading-[1.1]">
        <span className="block text-[9px] uppercase tracking-[0.5px] opacity-85">
          {topline}
        </span>
        <span className="block font-display text-[15px] font-bold">
          {store}
        </span>
      </span>
    </a>
  )
}
