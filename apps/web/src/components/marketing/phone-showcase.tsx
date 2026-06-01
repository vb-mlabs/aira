// "Built for the way you actually look for things" — two-phone tilted
// showcase. Uses next/image so the screenshots get optimized + lazy-loaded.
//
// The two screen exports live in apps/web/public/marketing-images/ — they're
// the same PNGs we use in .mstack/mockups/marketing-page/v4/ (the mockup
// loads via the dev symlink at /marketing-assets/, prod loads via the
// committed path at /marketing-images/).
//
// Marketing copy lives inline (allowlist per T9).

import Image from "next/image"

export function PhoneShowcase() {
  return (
    <section className="bg-[url('/marketing-images/textures/paper-cream.webp')] bg-cover bg-center pb-[120px] pt-[40px] md:pb-[120px]">
      <div className="mx-auto grid max-w-[1180px] grid-cols-1 items-center gap-[40px] px-6 md:grid-cols-[1.1fr_1fr] md:gap-[96px]">
        <div className="relative mx-auto flex h-[510px] w-full max-w-[400px] items-center justify-center md:h-[700px]">
          <PhoneFrame
            src="/marketing-images/home-screen.png"
            alt="AIRA mobile home screen — categories and featured businesses"
            tilt="left"
            priority
          />
          <PhoneFrame
            src="/marketing-images/business-listing.png"
            alt="AIRA mobile business-listing screen — sponsored and verified businesses"
            tilt="right"
            priority
          />
        </div>

        <div>
          <span className="block text-[11px] font-bold uppercase tracking-[3px] text-brand-gold">
            The app
          </span>
          <h2 className="mt-3.5 font-display text-[32px] font-semibold leading-[1.15] text-foreground md:text-[40px]">
            Built for the way you{" "}
            <em className="font-bold italic text-primary">actually</em> look
            for things.
          </h2>
          <p className="mt-4 text-[17px] leading-[1.65] text-muted-foreground">
            Tap a category. See businesses your neighbors trust, sorted by
            verification and quality. Call, WhatsApp, or open directions
            &mdash; one tap each.
          </p>
          <ul className="mt-7 space-y-[14px]">
            {bullets.map((bullet) => (
              <li key={bullet} className="flex gap-3 text-[15px] text-foreground">
                <span
                  aria-hidden="true"
                  className="font-display text-[22px] font-bold leading-none text-primary"
                >
                  ›
                </span>
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

const bullets = [
  "Search within a category — never an algorithm guessing",
  "Verified badge means we've checked — not user reports",
  "Save listings, share to WhatsApp, get directions in one tap",
]

function PhoneFrame({
  src,
  alt,
  tilt,
  priority = false,
}: {
  src: string
  alt: string
  tilt: "left" | "right"
  priority?: boolean
}) {
  const tiltClasses =
    tilt === "left"
      ? "z-[1] -translate-x-[55px] translate-y-[12px] -rotate-[7deg] md:-translate-x-[100px] md:translate-y-[24px]"
      : "z-[2] translate-x-[55px] -translate-y-[12px] rotate-[7deg] md:translate-x-[100px] md:-translate-y-[24px]"
  return (
    <div
      className={
        // aspect-[9/22] matches the actual screenshot proportions more
        // closely (home-screen ≈ 1:2.9, business-listing ≈ 1:3.6) so
        // less content is clipped by the phone-frame mask.
        "absolute aspect-[9/22] w-[190px] overflow-hidden rounded-[30px] bg-background shadow-[0_50px_100px_-30px_oklch(0.25_0.04_60_/_45%),_0_0_0_1px_oklch(0.50_0.07_80_/_25%)] md:w-[260px] " +
        tiltClasses
      }
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 900px) 190px, 260px"
        priority={priority}
        className="object-cover object-top"
      />
    </div>
  )
}
