import Link from "next/link"
import {
  ArrowLeft,
  BadgeCheck,
  ExternalLink,
  MapPin,
  Phone,
} from "lucide-react"
import { buttonVariants } from "@aira/ui-web/button"
import { cn } from "@aira/ui-web/utils"
import { CATEGORY_META } from "../category-meta"
import type { Business } from "../types"

interface BusinessDetailProps {
  business: Business
}

export function BusinessDetail({ business }: BusinessDetailProps) {
  const category = CATEGORY_META[business.category]
  const Icon = category.icon

  const tierBg: Record<Business["tier"], string> = {
    tier1: "bg-tier1 text-tier1-foreground",
    tier2: "bg-tier2 text-tier2-foreground",
    tier3: "bg-tier3 text-tier3-foreground",
  }
  const tierLabel: Record<Business["tier"], string> = {
    tier1: "Tier 1",
    tier2: "Tier 2",
    tier3: "Tier 3",
  }

  return (
    <article className="space-y-6">
      <Link
        href={`/listings/${business.category}`}
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to {category.displayName}
      </Link>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="flex h-48 items-center justify-center bg-muted text-muted-foreground">
          <Icon className="size-16" aria-hidden />
        </div>

        <div className="space-y-6 p-6 sm:p-8">
          <header className="flex items-start gap-4">
            <div
              aria-hidden
              className="flex size-16 flex-shrink-0 items-center justify-center rounded-full border-2 border-border bg-background text-foreground"
            >
              <Icon className="size-7" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="font-display text-3xl text-foreground">
                  {business.name}
                </h1>
                {business.verified && (
                  <BadgeCheck
                    aria-label="Verified"
                    className="size-5 fill-info text-info-foreground"
                  />
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider",
                    tierBg[business.tier],
                  )}
                >
                  {tierLabel[business.tier]}
                </span>
                <span className="text-xs text-muted-foreground">
                  {category.displayName}
                </span>
              </div>
            </div>
          </header>

          {business.description && (
            <p className="text-foreground">{business.description}</p>
          )}

          <dl className="grid gap-4 sm:grid-cols-2">
            {business.phone && (
              <Field label="Phone">
                <a
                  href={`tel:${business.phone}`}
                  className="text-primary hover:underline"
                >
                  {business.phone}
                </a>
              </Field>
            )}
            {business.website && (
              <Field label="Website">
                <a
                  href={business.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  {prettyHost(business.website)}
                  <ExternalLink className="size-3" aria-hidden />
                </a>
              </Field>
            )}
            {business.address && (
              <Field label="Address" className="sm:col-span-2">
                <span className="inline-flex items-start gap-1.5 text-foreground">
                  <MapPin className="mt-0.5 size-4 flex-shrink-0 text-muted-foreground" aria-hidden />
                  {business.address}
                </span>
              </Field>
            )}
          </dl>

          <div className="flex flex-wrap gap-3 pt-2">
            {business.phone && (
              <a
                href={`tel:${business.phone}`}
                className={buttonVariants()}
              >
                <Phone className="size-4" aria-hidden />
                Call Now
              </a>
            )}
            {business.website && (
              <a
                href={business.website}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: "outline" })}
              >
                <ExternalLink className="size-4" aria-hidden />
                Visit Website
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}

function Field({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <dt className="mb-1 text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm">{children}</dd>
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
