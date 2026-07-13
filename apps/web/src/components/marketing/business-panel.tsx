// "For business owners" — olive bg + green paper-grain texture, 2-col
// section with copy + 4 checkmark perks + dual CTA on the left,
// listing-card preview on the right.
//
// CTAs are a client island (see business-cta-pair.tsx) so this section
// can stay SSR; the popup uses @base-ui/react Dialog.
//
// No pricing copy — admin-configurable, finalized Sprint 4+ per roadmap.

import { BusinessCard } from "@/features/listings"
import type { Business } from "@/features/listings"
import { BusinessCtaPair, GetListedDialog } from "./business-cta-pair"
import { LiteYouTube } from "./lite-youtube"

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
  return (
    <section
      id="businesses"
      className="scroll-mt-20 bg-[color:oklch(0.42_0.06_130)] bg-[url('/marketing-images/textures/paper-green.webp')] bg-cover bg-center py-[120px] text-brand-cream-bright"
    >
      <div className="mx-auto grid max-w-[1180px] grid-cols-1 items-center gap-[40px] px-6 md:grid-cols-[1.1fr_1fr] md:gap-[80px]">
        <div>
          <span className="block text-[15px] font-bold uppercase tracking-[4px] text-brand-cream-bright">
            For business owners
          </span>
          <h2 className="mt-4 font-display text-5xl font-bold leading-[1.05] text-brand-cream-bright md:text-[68px]">
            List your business{" "}
            <em className="font-bold italic text-brand-gold">
              where Atlanta&rsquo;s Indian community looks first.
            </em>
          </h2>
          <p className="mt-6 text-[21px] font-medium leading-[1.55] text-brand-cream-bright">
            Get in front of a curated, growing audience. AIRA membership lists
            your business in the regular category listings for the selected
            duration. Sponsorship and trust features are optional add-ons for
            stronger visibility and credibility. Verified businesses get the
            blue tick. Sponsored placement puts you at the top of your
            category.
          </p>

          <ul className="my-10 space-y-[20px]">
            {perks.map((perk) => (
              <li key={perk.title} className="flex items-start gap-[16px]">
                <span
                  aria-hidden="true"
                  className="mt-[3px] flex size-[26px] flex-shrink-0 items-center justify-center rounded-full bg-brand-cream-bright text-[13px] font-bold text-[color:oklch(0.42_0.06_130)]"
                >
                  ✓
                </span>
                <p className="text-[17px] leading-[1.55] text-brand-cream-muted">
                  <strong className="font-bold text-brand-cream-bright">
                    {perk.title}
                  </strong>{" "}
                  &mdash; {perk.body}
                </p>
              </li>
            ))}
          </ul>

          <BusinessCtaPair />
        </div>

        <div className="flex flex-col gap-10">
          <ListingCardPreview />
          <div className="mx-auto flex w-full max-w-[380px] flex-col gap-6">
            <LiteYouTube
              videoId="dLipSrr3tBY"
              title="Membership & Sponsorship, explained"
              posterAlt="Play: how AIRA membership and sponsorship work"
              caption="How membership & sponsorship work."
              className="mx-auto"
              captionClassName="text-brand-cream-muted"
            />
            <LiteYouTube
              videoId="snDcgvdaSQg"
              title="The Verified Badge & Stars"
              posterAlt="Play: what the blue tick and stars mean on AIRA"
              caption="The blue tick & stars, explained."
              className="mx-auto"
              captionClassName="text-brand-cream-muted"
            />
          </div>
        </div>
      </div>
    </section>
  )
}

// Uses the real BusinessCard component from features/listings so the
// preview matches whatever the live directory currently renders. The
// business object is a static mock — no DB call from the marketing page.
const PREVIEW_BUSINESS: Business = {
  id: "preview",
  name: "Urbanroots FL",
  slug: "urbanroots-fl",
  category: "restaurants",
  description: null,
  phone: "+14041234567",
  website: "https://example.com",
  address: "Atlanta, GA",
  image_url: null,
  facebook_url: "https://facebook.com/urbanrootsfl",
  instagram_url: "https://instagram.com/urbanrootsfl",
  whatsapp_number: "+14041234567",
  hours: null,
  aira_review: null,
  rating: 4.6,
  sponsored_slot: "top" as const,
  verified: true,
  city_id: null,
  business_type: null,
  years_operating: null,
  owner_user_id: null,
  deleted_at: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  images: [],
  extra_category_ids: [],
}

function ListingCardPreview() {
  // The preview card was previously a real BusinessCard with intact
  // /listings/* hrefs; anonymous click would route through the (app)
  // auth gate and dump the user at /login. Wrap in GetListedDialog +
  // pass interactive={false} so the click opens the business signup
  // form (the section's actual CTA) instead.
  return (
    <div className="px-2">
      <div className="mx-auto max-w-[380px]">
        <GetListedDialog
          triggerClassName="block w-full text-left"
          triggerAriaLabel="Get your business listed on AIRA"
        >
          <BusinessCard business={PREVIEW_BUSINESS} interactive={false} />
        </GetListedDialog>
      </div>
      <p className="mt-3.5 text-center font-display text-sm italic text-brand-cream-muted">
        A listing on AIRA &mdash; verified tick, quick actions, sponsored
        placement.
      </p>
    </div>
  )
}
