import Link from "next/link"
import { BadgeCheck, Phone } from "lucide-react"
import { cn } from "@aira/ui-web/utils"
import { CATEGORY_META } from "../category-meta"
import { RatingPill } from "./rating-pill"
import { SocialLinks } from "./social-icons"
import type { Business } from "../types"

interface BusinessCardProps {
  business: Business
}

// Whole-card link via the `::after` overlay technique — keeps the inner
// Call button independently clickable without nesting anchors. The Call
// anchor sits at `z-10` so its hitbox wins over the overlay.
export function BusinessCard({ business }: BusinessCardProps) {
  const category = CATEGORY_META[business.category]
  const Icon = category.icon
  const location = locationLabel(business.address)

  return (
    <article
      className={cn(
        "relative flex items-start gap-3 rounded-xl bg-card p-4 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-card-hover)]",
      )}
    >
      <div
        aria-hidden
        className="flex size-9 flex-shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground"
      >
        <Icon className="size-4" />
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
              className="size-4 flex-shrink-0 fill-info text-info-foreground"
            />
          )}
          {business.rating !== null && business.rating > 0 && (
            <RatingPill rating={business.rating} />
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {category.displayName}
          {location && <> · {location}</>}
        </p>
        <SocialLinks
          facebook_url={business.facebook_url}
          instagram_url={business.instagram_url}
          whatsapp_number={business.whatsapp_number}
          className="mt-1.5"
        />
      </div>

      {/* Right column: chip pinned to top, phone pinned to bottom */}
      <div className="flex flex-shrink-0 flex-col items-end justify-between self-stretch gap-2">
        <TierPill tier={business.tier} />
        {business.phone && (
          <a
            href={`tel:${business.phone}`}
            className="relative z-10 inline-flex size-10 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-primary-glow)] transition-opacity hover:opacity-90"
            aria-label={`Call ${business.name}`}
          >
            <Phone className="size-5" aria-hidden />
          </a>
        )}
      </div>
    </article>
  )
}

function TierPill({ tier }: { tier: Business["tier"] }) {
  if (tier === "tier3") return null
  const label = tier === "tier1" ? "Sponsored" : "Featured"
  const bg = tier === "tier1" ? "bg-tier1 text-tier1-foreground" : "bg-tier2 text-tier2-foreground"
  return (
    <span
      className={cn(
        "flex-shrink-0 rounded-full px-1.5 py-px text-[0.55rem] font-bold tracking-wide",
        bg,
      )}
    >
      {label}
    </span>
  )
}

function locationLabel(address: string | null): string | null {
  if (!address) return null
  // Prefer the city segment if comma-separated; otherwise the first 24 chars.
  const parts = address.split(",").map((s) => s.trim())
  if (parts.length >= 2) return parts[parts.length - 2] || parts[0]
  return parts[0].length > 24 ? parts[0].slice(0, 24) + "…" : parts[0]
}
