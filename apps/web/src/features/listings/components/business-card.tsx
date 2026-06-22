import Link from "next/link"
import { BadgeCheck } from "lucide-react"
import { brand } from "@aira/config"
import { cn } from "@aira/ui-web/utils"
import { TIER_LABELS } from "@aira/validators"
import { getCategoryMeta } from "../category-meta"
import { RatingPill } from "./rating-pill"
import { SocialLinks } from "./social-icons"
import type { Business } from "../types"

interface BusinessCardProps {
  business: Business
}

// Whole-card link via the `::after` overlay technique — keeps inner
// social anchors independently clickable without nesting. Each anchor
// inside SocialLinks sits at `z-10` so its hitbox wins over the overlay.
export function BusinessCard({ business }: BusinessCardProps) {
  const category = getCategoryMeta(business.category)
  const Icon = category.icon

  return (
    <article
      className={cn(
        "relative flex items-start gap-3 rounded-xl bg-card p-4 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-card-hover)]",
      )}
    >
      <div
        aria-hidden
        className="flex size-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted text-muted-foreground"
      >
        {business.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={business.image_url}
            alt=""
            loading="lazy"
            className="size-full object-cover"
          />
        ) : (
          <Icon className="size-4" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link
            href={`/listings/${business.category}/${business.id}`}
            className="font-display text-lg leading-tight text-foreground after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-offset-2"
          >
            {business.name}
          </Link>
          {business.verified && (
            <BadgeCheck
              aria-label="Verified"
              className="size-5 flex-shrink-0 fill-info text-info-foreground"
            />
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <p className="truncate text-xs text-muted-foreground">
            {category.displayName}
          </p>
          {business.rating !== null && business.rating > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              {brand.name} Stars
              <RatingPill rating={business.rating} showValue={false} />
            </span>
          )}
        </div>
        <SocialLinks
          facebook_url={business.facebook_url}
          instagram_url={business.instagram_url}
          whatsapp_number={business.whatsapp_number}
          phone={business.phone}
          website={business.website}
          address={business.address}
          className="mt-1.5"
        />
      </div>

      <div className="flex flex-shrink-0 flex-col items-end gap-2">
        <TierPill tier={business.tier} />
        <Link
          href={`/listings/${business.category}/${business.id}`}
          aria-label={`More info about ${business.name}`}
          className="relative z-10 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          More Info
        </Link>
      </div>
    </article>
  )
}

function TierPill({ tier }: { tier: Business["tier"] }) {
  if (tier === "tier3") return null
  // Label comes from the shared TIER_LABELS map so the badge matches the
  // tier-section heading exactly. Previously tier2 said "Featured" here
  // while tier-section said "Sponsored Level 2" — a long-standing
  // inconsistency this collapses.
  const bg = tier === "tier1" ? "bg-tier1 text-tier1-foreground" : "bg-tier2 text-tier2-foreground"
  return (
    <span
      className={cn(
        "flex-shrink-0 rounded-full px-1.5 py-px text-[0.55rem] font-bold tracking-wide",
        bg,
      )}
    >
      {TIER_LABELS[tier]}
    </span>
  )
}

