import Link from "next/link"
import { BadgeCheck } from "lucide-react"
import { brand } from "@aira/config"
import { cn } from "@aira/ui-web/utils"
import { getCategoryMeta } from "../category-meta"
import { FavoriteButton } from "./favorite-button"
import { RatingPill } from "./rating-pill"
import { SocialLinks } from "./social-icons"
import type { Business } from "../types"

interface BusinessCardProps {
  business: Business
  /** Anonymous callers get no heart at all. Defaults false so existing
   *  call sites that don't yet pipe through the session continue to
   *  render the card without the new control. */
  isSignedIn?: boolean
  /** Initial favorited state for the FavoriteButton. Defaults false. */
  isFavorited?: boolean
  /** When false, renders a visually-identical but non-routing card —
   *  name + More Info become spans, FavoriteButton is suppressed, and
   *  SocialLinks render as decorative badges (no href). Used by
   *  marketing-page previews where any /listings/* navigation would
   *  route an anonymous user through the auth gate and land them on
   *  /login. Defaults true. */
  interactive?: boolean
  /** Show the category text under the business name. Defaults true.
   *  The category-listing page (TierSection) passes false because every
   *  card in the section is the same category — the label is redundant
   *  there. Featured / favorites / mixed-category surfaces keep it. */
  showCategory?: boolean
}

// Whole-card link via the `::after` overlay technique — keeps inner
// social anchors independently clickable without nesting. Each anchor
// inside SocialLinks sits at `z-10` so its hitbox wins over the overlay.
export function BusinessCard({
  business,
  isSignedIn = false,
  isFavorited = false,
  interactive = true,
  showCategory = true,
}: BusinessCardProps) {
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
          {interactive ? (
            <Link
              href={`/listings/${business.category}/${business.id}`}
              className="font-display text-lg leading-tight text-foreground after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-offset-2"
            >
              {business.name}
            </Link>
          ) : (
            <span className="font-display text-lg leading-tight text-foreground">
              {business.name}
            </span>
          )}
          {business.verified && (
            <BadgeCheck
              aria-label="Verified"
              className="size-5 flex-shrink-0 fill-info text-info-foreground"
            />
          )}
        </div>
        {(showCategory ||
          (business.rating !== null && business.rating > 0)) && (
          <div className="mt-0.5 flex items-center gap-2">
            {showCategory && (
              <p className="truncate text-xs text-muted-foreground">
                {category.displayName}
              </p>
            )}
            {business.rating !== null && business.rating > 0 && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                {brand.name} Stars
                <RatingPill rating={business.rating} showValue={false} />
              </span>
            )}
          </div>
        )}
        <SocialLinks
          facebook_url={business.facebook_url}
          instagram_url={business.instagram_url}
          whatsapp_number={business.whatsapp_number}
          phone={business.phone}
          website={business.website}
          address={business.address}
          compact
          interactive={interactive}
          className="mt-1.5"
        />
      </div>

      <div className="flex flex-shrink-0 flex-col items-end gap-2">
        {interactive && (
          <FavoriteButton
            businessId={business.id}
            isFavorited={isFavorited}
            isSignedIn={isSignedIn}
          />
        )}
        <SponsoredPill slot={business.sponsored_slot} />
        {interactive ? (
          <Link
            href={`/listings/${business.category}/${business.id}`}
            aria-label={`More info about ${business.name}`}
            className="relative z-10 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            More Info
          </Link>
        ) : (
          <span className="relative z-10 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-primary-foreground">
            More Info
          </span>
        )}
      </div>
    </article>
  )
}

function SponsoredPill({ slot }: { slot: Business["sponsored_slot"] }) {
  if (slot === null || slot === "regular") return null
  // Top-slot cards get the sponsoredTop color pair; mid-slot get
  // sponsoredMid. Label is always "Sponsored" — users never see
  // "Level 2" / "Top" / "Mid" as text; the color cue is the entire
  // signal of within-Sponsored hierarchy.
  const bg =
    slot === "top"
      ? "bg-sponsored-top text-sponsored-top-foreground"
      : "bg-sponsored-mid text-sponsored-mid-foreground"
  return (
    <span
      className={cn(
        "flex-shrink-0 rounded-full px-1.5 py-px text-[0.55rem] font-bold tracking-wide",
        bg,
      )}
    >
      Sponsored
    </span>
  )
}

