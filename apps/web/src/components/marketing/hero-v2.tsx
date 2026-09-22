// 3-tier landing hero — "For Users | Discover. Support. Grow. | For
// Business Owners" as three parallel columns starting from the same top
// band. Each column gets a matching editorial header (brand-tagline
// eyebrow + Cormorant title + blurb + brass-gold hairline). Center
// column's title carries the value prop and the phone sits underneath;
// left/right column bodies (bullets+QR / CTAs+benefits) drop under
// their matching headers.
//
// Gated behind NEXT_PUBLIC_LANDING_HERO_V2 on page.tsx; falls back to
// the pre-launch Hero when the flag is off. Reuses GetListedDialog +
// LaunchOfferDialog from the sibling modules so both Owner CTAs open
// the same dialogs the BusinessPanel section uses.
//
// Visual reference: .mstack/mockups/landing-hero-3tier/v1/index.html
// (v1 mockup + user feedback 2026-09-22 to hoist column headers up
// alongside the center masthead).

import Image from "next/image"
import {
  Check,
  ShieldCheck,
  Star,
  Store,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react"
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
      <div className="mx-auto grid max-w-[1240px] grid-cols-1 items-start gap-14 md:grid-cols-[1fr_minmax(380px,460px)_1fr] md:items-end md:gap-10">
        {/* -------- CENTER: Value prop + Phone (DOM-first so <h1> leads screen-reader flow) -------- */}
        <div className="flex flex-col items-center gap-8 md:order-2">
          <div className="w-full">
            <h1 className="m-0 text-center font-display text-[clamp(30px,3.4vw,40px)] font-bold leading-[1.02] tracking-tight md:whitespace-nowrap">
              <span className="text-primary">Discover.</span>{" "}
              <span className="text-foreground">Support.</span>{" "}
              <span className="text-primary">Grow.</span>
            </h1>
            <p className="mt-4 text-center font-display text-lg font-bold text-foreground">
              America&rsquo;s South Asian Business Directory
            </p>
            <p className="mx-auto mt-1 max-w-[46ch] text-center text-[14px] leading-[1.55] text-muted-foreground">
              Built for communities across the USA. Now serving Atlanta and
              growing city by city.
            </p>
            <div
              aria-hidden="true"
              className="mx-auto mt-5 h-px w-[60px] bg-brand-gold/70"
            />
          </div>

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

        {/* -------- LEFT: For Users -------- */}
        <div className="flex flex-col items-center gap-6 md:order-1">
          <ColumnHeader
            Icon={Users}
            titleLead="For"
            titleAccent="Users"
            blurb="Free to download and easy to get started. Create your login once with your email."
          />

          <ul className="mx-auto w-full max-w-[300px] space-y-2.5">
            {USER_BULLETS.map((bullet) => (
              <li
                key={bullet}
                className="flex items-start gap-2.5 text-[14px] text-foreground"
              >
                <span
                  aria-hidden="true"
                  className="mt-0.5 grid size-[22px] shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-primary-glow)]"
                >
                  <Check className="size-[14px]" strokeWidth={2.6} />
                </span>
                <span>{bullet}</span>
              </li>
            ))}
          </ul>

          <div className="mx-auto w-full max-w-[340px]">
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
                src="/marketing-images/store-google-play.svg"
                alt={`Get ${brand.name} on Google Play (link coming soon)`}
              />
              <StoreBadge
                href="#"
                src="/marketing-images/store-appstore.svg"
                alt={`Download ${brand.name} on the App Store (link coming soon)`}
              />
            </div>
          </div>
        </div>

        {/* -------- RIGHT: For Business Owners -------- */}
        <div className="order-3 flex flex-col items-center gap-6">
          {/* Audience separator on mobile only — For Users and For Business
              Owners visually merge without a boundary when the columns stack. */}
          <hr
            aria-hidden="true"
            className="mx-auto -mb-2 h-px w-20 border-0 bg-brand-gold/40 md:hidden"
          />
          <ColumnHeader
            Icon={Store}
            titleLead="For"
            titleAccent="Business Owners"
            blurb="List your business for free and grow your visibility."
          />

          <div className="mx-auto flex w-full max-w-[320px] flex-col gap-2.5">
            <GetListedDialog triggerClassName="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 font-sans text-sm font-bold tracking-[0.3px] text-primary-foreground shadow-[var(--shadow-primary-glow)] transition-transform hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
              Get Listed on {brand.name}
            </GetListedDialog>
            <LaunchOfferDialog triggerClassName="inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-primary bg-transparent px-5 py-[10px] font-sans text-sm font-bold tracking-[0.3px] text-foreground transition-transform hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
              View Pricing &amp; Add-Ons
            </LaunchOfferDialog>
          </div>

          <ul className="mx-auto mt-2 flex w-full max-w-[340px] flex-col gap-4">
            {BENEFITS.map(({ Icon, title, body }) => (
              <li
                key={title}
                className="grid grid-cols-[42px_1fr] items-start gap-3"
              >
                <span
                  aria-hidden="true"
                  className="grid size-[42px] place-items-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-primary-glow)]"
                >
                  <Icon className="size-[22px]" strokeWidth={2} />
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

// Editorial column header — parallel to the center masthead. Optional
// `Icon` renders as a solid brand-color circle above the title (as shown
// in the client brief image). Title reads in `--primary`; blurb sits
// under; gold hairline closes the block. Center column doesn't use this —
// it renders its own richer header with a second lede + wider max-width.
function ColumnHeader({
  Icon,
  titleLead,
  titleAccent,
  blurb,
}: {
  Icon?: LucideIcon
  titleLead: string
  titleAccent: string
  blurb: string
}) {
  return (
    <div className="flex w-full flex-col items-center">
      {Icon ? (
        <span
          aria-hidden="true"
          className="mb-4 grid size-[68px] place-items-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-primary-glow)]"
        >
          <Icon className="size-[34px]" strokeWidth={1.8} />
        </span>
      ) : null}
      <h2 className="m-0 text-center font-display text-[clamp(28px,3.2vw,36px)] font-bold leading-[1.05] tracking-tight text-primary">
        {titleLead} {titleAccent}
      </h2>
      <p className="mx-auto mt-3 max-w-[32ch] text-center text-[14px] leading-[1.55] text-muted-foreground">
        {blurb}
      </p>
      <div
        aria-hidden="true"
        className="mx-auto mt-5 h-px w-[60px] bg-brand-gold/70"
      />
    </div>
  )
}

// QR placeholder — cream card + dashed border + labeled "coming soon" so
// users don't mistake the tile for a broken QR image. Real PNGs land at
// public/marketing-images/qr-{play,appstore}.png in a follow-up.
function QrPlaceholder({ label }: { label: string }) {
  return (
    <div
      aria-hidden="true"
      className="grid aspect-square place-items-center rounded-[var(--radius)] border border-dashed border-border/50 bg-card p-3 text-center"
    >
      <div className="flex flex-col items-center gap-1">
        <span className="font-display text-[13px] font-bold text-foreground">
          {label}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[1.5px] text-muted-foreground">
          QR coming soon
        </span>
      </div>
    </div>
  )
}

// Official store badges — SVGs live in public/marketing-images/. Anchor stays
// href="#" until real Play Store + App Store URLs land (follow-up ticket
// tracked in the review's open questions).
function StoreBadge({
  href,
  src,
  alt,
}: {
  href: string
  src: string
  alt: string
}) {
  return (
    <a
      href={href}
      aria-label={alt}
      className="block transition-transform hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- static SVG, no LCP concern */}
      <img
        src={src}
        alt={alt}
        width={135}
        height={41}
        className="block h-auto w-full"
      />
    </a>
  )
}
