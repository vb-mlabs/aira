// "For business owners" — olive bg + green paper-grain texture, 2-col
// section with copy + 4 checkmark perks + cream mailto CTA on the left,
// listing-card preview on the right.
//
// mailto uses brand.supportEmail (airabynisarga.com via T9 swap) so the
// linked address stays consistent if it ever changes.
//
// No pricing copy — admin-configurable, finalized Sprint 4+ per roadmap.

import { brand } from "@aira/config"

const perks = [
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
]

export function BusinessPanel() {
  const mailto = `mailto:${brand.supportEmail}?subject=Listing%20AIRA`
  return (
    <section
      id="businesses"
      className="bg-[color:oklch(0.42_0.06_130)] bg-[image:var(--texture-paper-green)] bg-repeat py-[120px] text-brand-cream-bright"
      style={{ backgroundSize: "320px 320px" }}
    >
      <div className="mx-auto grid max-w-[1100px] grid-cols-1 items-center gap-[40px] px-6 md:grid-cols-[1.1fr_1fr] md:gap-[80px]">
        <div>
          <span className="block text-[11px] font-bold uppercase tracking-[3px] text-brand-gold">
            For business owners
          </span>
          <h2 className="mt-3.5 font-display text-4xl font-semibold leading-[1.1] text-brand-cream-bright md:text-5xl">
            List your business{" "}
            <em className="font-bold italic text-brand-gold">
              where Atlanta&rsquo;s Indian community looks first.
            </em>
          </h2>
          <p className="mt-4 text-[17px] leading-[1.7] text-brand-cream-muted">
            Get in front of a curated, growing audience. Verified members get
            the blue tick. Sponsored placement puts you at the top of your
            category.
          </p>

          <ul className="my-9 space-y-[18px]">
            {perks.map((perk) => (
              <li key={perk.title} className="flex items-start gap-[14px]">
                <span
                  aria-hidden="true"
                  className="mt-[3px] flex size-[22px] flex-shrink-0 items-center justify-center rounded-full bg-brand-cream-bright text-[11px] font-bold text-[color:oklch(0.42_0.06_130)]"
                >
                  ✓
                </span>
                <p className="text-[15px] leading-[1.55] text-brand-cream-muted">
                  <strong className="text-brand-cream-bright">
                    {perk.title}
                  </strong>{" "}
                  &mdash; {perk.body}
                </p>
              </li>
            ))}
          </ul>

          <a
            href={mailto}
            className="inline-flex items-center gap-2 rounded-full bg-brand-cream-bright px-7 py-[14px] font-sans text-sm font-bold tracking-[0.3px] text-[color:oklch(0.42_0.06_130)] no-underline transition-transform hover:-translate-y-px"
          >
            Get in touch about being listed →
          </a>
        </div>

        <ListingCardPreview />
      </div>
    </section>
  )
}

// A non-interactive mock of the listing card pattern from the app. Shows
// the verified blue tick + tier-orange "More info" pill so the business
// owner can see exactly what a listing looks like.
function ListingCardPreview() {
  return (
    <div className="px-2">
      <div className="mx-auto flex max-w-[380px] items-center gap-[14px] rounded-2xl bg-card p-5 text-card-foreground shadow-[0_20px_40px_-20px_oklch(0.25_0.04_60_/_25%)]">
        <div className="flex size-14 flex-shrink-0 items-center justify-center rounded-[10px] bg-muted font-display text-[22px] font-bold text-muted-foreground">
          U
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-base font-bold">Urbanroots FL</span>
            <span
              aria-hidden="true"
              className="flex size-[18px] items-center justify-center rounded-full bg-[color:var(--info)] text-[11px] font-bold text-[color:var(--info-foreground)]"
            >
              ✓
            </span>
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">★ 4.6</div>
          <div className="mt-2 flex gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                aria-hidden="true"
                className="size-6 rounded-full bg-muted"
              />
            ))}
          </div>
        </div>
        <button
          type="button"
          className="flex-shrink-0 rounded-full bg-[image:var(--gradient-tier2)] px-3 py-1.5 text-[11px] font-bold text-brand-cream-bright"
        >
          More info
        </button>
      </div>
      <p className="mt-3.5 text-center font-display text-sm italic text-brand-cream-muted">
        A listing on AIRA &mdash; verified tick, quick actions, sponsored
        placement.
      </p>
    </div>
  )
}
