import Link from "next/link"
import {
  ArrowLeft,
  BadgeCheck,
  Clock,
  ExternalLink,
  Globe,
  Phone,
} from "lucide-react"
import { brand } from "@aira/config"
import { buttonVariants } from "@aira/ui-web/button"
import { getCategoryMeta } from "../category-meta"
import { RatingPill } from "./rating-pill"
import { SocialLinks, GoogleMapsPinIcon } from "./social-icons"
import { BusinessImageCarousel } from "./business-image-carousel"
import type { Business } from "../types"

interface BusinessDetailProps {
  business: Business
}

export function BusinessDetail({ business }: BusinessDetailProps) {
  const category = getCategoryMeta(business.category)
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
            className="h-72 w-full object-cover md:h-96"
          />
        ) : (
          <div className="flex h-72 items-center justify-center bg-muted text-muted-foreground md:h-96">
            <Icon className="size-16 opacity-30" aria-hidden />
          </div>
        )}

        <div className="p-6 sm:p-8">
          {/* Name + verified + category + rating + socials */}
          <div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h1 className="font-display text-2xl leading-tight text-foreground md:text-3xl">
                {business.name}
              </h1>
              {business.verified && (
                <BadgeCheck
                  aria-label="Verified"
                  className="size-6 flex-shrink-0 fill-info text-info-foreground md:size-7"
                />
              )}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className="text-xs text-muted-foreground">
                {category.displayName}
              </p>
              {business.rating !== null && business.rating > 0 && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  {brand.name} Stars
                  <RatingPill rating={business.rating} />
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
              className="mt-2"
            />
          </div>

          {/* CTAs */}
          {business.address && (
            <div className="mt-5">
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(business.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants()}
              >
                <GoogleMapsPinIcon className="size-4" />
                Get Directions
              </a>
            </div>
          )}
        </div>
      </div>

      {/* ── Card 2: Gallery + About Us ── */}
      {(business.images.length > 0 || business.description) && (
        <div className="overflow-hidden rounded-xl bg-card shadow-[var(--shadow-card)]">
          {business.images.length > 0 && (
            <BusinessImageCarousel
              images={business.images}
              businessName={business.name}
            />
          )}
          {business.description && (
            <div className="p-6 sm:p-8">
              <h2 className="font-display text-xl text-foreground">About Us</h2>
              <p className="mt-3 text-sm leading-relaxed text-foreground">
                {business.description}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Card 4: Contact ── */}
      {(business.address || business.hours || business.phone || business.website) && (
        <div className="rounded-xl bg-card p-6 shadow-[var(--shadow-card)] sm:p-8">
          <div className="space-y-4">
            {business.address && (
              <ContactRow icon={GoogleMapsPinIcon}>
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
