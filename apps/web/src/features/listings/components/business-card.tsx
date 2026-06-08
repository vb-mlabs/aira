import Link from "next/link"
import { BadgeCheck, Phone } from "lucide-react"
import { cn } from "@aira/ui-web/utils"
import { CATEGORY_META } from "../category-meta"
import { SocialLinks } from "./social-icons"
import type { Business } from "../types"

interface BusinessCardProps {
  business: Business
  /** Show the tier pill in the row (used on category list, hidden on home). */
  showTier?: boolean
}

// Whole-card link via the `::after` overlay technique — keeps the inner
// Call button independently clickable without nesting anchors. The Call
// anchor sits at `z-10` so its hitbox wins over the overlay.
export function BusinessCard({ business, showTier = false }: BusinessCardProps) {
  const category = CATEGORY_META[business.category]
  const Icon = category.icon
  const location = locationLabel(business.address)

  return (
    <article
      className={cn(
        "relative flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)] transition-colors hover:border-primary",
      )}
    >
      <div
        aria-hidden
        className="flex size-11 flex-shrink-0 items-center justify-center rounded-full border-2 border-border bg-background text-foreground"
      >
        <Icon className="size-5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
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

      {showTier && <TierPill tier={business.tier} />}

      {business.phone && (
        <a
          href={`tel:${business.phone}`}
          className="relative z-10 inline-flex size-10 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-primary-glow)] transition-opacity hover:opacity-90"
          aria-label={`Call ${business.name}`}
        >
          <Phone className="size-5" aria-hidden />
        </a>
      )}
    </article>
  )
}

function TierPill({ tier }: { tier: Business["tier"] }) {
  const labels: Record<Business["tier"], string> = {
    tier1: "Tier 1",
    tier2: "Tier 2",
    tier3: "Tier 3",
  }
  const bg: Record<Business["tier"], string> = {
    tier1: "bg-tier1 text-tier1-foreground",
    tier2: "bg-tier2 text-tier2-foreground",
    tier3: "bg-tier3 text-tier3-foreground",
  }
  return (
    <span
      className={cn(
        "flex-shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider",
        bg[tier],
      )}
    >
      {labels[tier]}
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
