import Link from "next/link"
import {
  ArrowLeft,
  BadgeCheck,
  Clock,
  ExternalLink,
  Globe,
  MapPin,
  Phone,
} from "lucide-react"
import { buttonVariants } from "@aira/ui-web/button"
import { CATEGORY_META } from "../category-meta"
import { RatingPill } from "./rating-pill"
import { SocialLinks } from "./social-icons"
import { BusinessImageCarousel } from "./business-image-carousel"
import type { Business } from "../types"

interface BusinessDetailProps {
  business: Business
}

export function BusinessDetail({ business }: BusinessDetailProps) {
  const category = CATEGORY_META[business.category]
  const Icon = category.icon

  return (
    <article className="space-y-4">

      {/* ── Card 1: Hero + identity + social + CTAs ── */}
      <div className="overflow-hidden rounded-xl bg-card shadow-[var(--shadow-card)]">

        {/* Hero */}
        {business.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={business.image_url}
            alt={business.name}
            className="h-52 w-full object-cover"
          />
        ) : (
          <div className="flex h-52 items-center justify-center bg-muted text-muted-foreground">
            <Icon className="size-16 opacity-30" aria-hidden />
          </div>
        )}

        <div className="p-6 sm:p-8">
          {/* Avatar + name + verified + tier */}
          <div className="flex items-start gap-4">
            <div
              aria-hidden
              className="flex size-16 flex-shrink-0 items-center justify-center rounded-full border-2 border-border bg-background text-foreground"
            >
              <Icon className="size-7" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h1 className="font-display text-lg leading-tight text-foreground">
                  {business.name}
                </h1>
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

              <p className="mt-0.5 text-xs text-muted-foreground">
                {category.displayName}
              </p>

              <SocialLinks
                facebook_url={business.facebook_url}
                instagram_url={business.instagram_url}
                whatsapp_number={business.whatsapp_number}
                className="mt-2"
              />
            </div>
          </div>

          {/* CTAs */}
          {(business.phone || business.website) && (
            <div className="mt-5 flex flex-wrap gap-3">
              {business.phone && (
                <a href={`tel:${business.phone}`} className={buttonVariants()}>
                  <Phone className="size-4" aria-hidden />
                  Call Now
                </a>
              )}
              {business.website && (
                <a
                  href={business.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants()}
                >
                  <ExternalLink className="size-4" aria-hidden />
                  Visit Website
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Card 2: Gallery carousel (when gallery images exist) ── */}
      {business.images.length > 0 && (
        <BusinessImageCarousel
          images={business.images}
          businessName={business.name}
        />
      )}

      {/* ── Card 3: About Us ── */}
      {business.description && (
        <div className="rounded-xl bg-card p-6 shadow-[var(--shadow-card)] sm:p-8">
          <h2 className="font-display text-xl text-foreground">About Us</h2>
          <p className="mt-3 text-sm leading-relaxed text-foreground">
            {business.description}
          </p>
        </div>
      )}

      {/* ── Card 4: Contact ── */}
      {(business.address || business.hours || business.phone || business.website) && (
        <div className="rounded-xl bg-card p-6 shadow-[var(--shadow-card)] sm:p-8">
          <div className="space-y-4">
            {business.address && (
              <ContactRow icon={MapPin}>
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(business.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {business.address}
                </a>
              </ContactRow>
            )}
            {business.hours && (
              <ContactRow icon={Clock}>
                {business.hours}
              </ContactRow>
            )}
            {business.phone && (
              <ContactRow icon={Phone}>
                <a
                  href={`tel:${business.phone}`}
                  className="text-primary hover:underline"
                >
                  {business.phone}
                </a>
              </ContactRow>
            )}
            {business.website && (
              <ContactRow icon={Globe}>
                <a
                  href={business.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  {prettyHost(business.website)}
                  <ExternalLink className="size-3" aria-hidden />
                </a>
              </ContactRow>
            )}
          </div>
        </div>
      )}

      {/* ── Card 5: AIRA Review ── */}
      {business.aira_review && (
        <div className="rounded-xl bg-card p-6 shadow-[var(--shadow-card)] sm:p-8">
          <h2 className="font-display text-xl text-foreground">AIRA Review</h2>
          <p className="mt-3 text-sm leading-relaxed text-foreground">
            {business.aira_review}
          </p>
        </div>
      )}

      {/* ── Go back ── */}
      <div className="pt-2">
        <Link
          href={`/listings/${business.category}`}
          className={buttonVariants()}
        >
          <ArrowLeft className="size-4" aria-hidden />
          Go back
        </Link>
      </div>

    </article>
  )
}

function ContactRow({
  icon: Icon,
  children,
}: {
  icon: React.ElementType
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <Icon
        className="mt-0.5 size-4 flex-shrink-0 text-muted-foreground"
        aria-hidden
      />
      <span className="text-foreground">{children}</span>
    </div>
  )
}

function prettyHost(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "")
  } catch {
    return url
  }
}
