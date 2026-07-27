// Server-side card row used by /account/listings. Pure presentation; the
// page RSC composes the list.

import Link from "next/link"
import { Store } from "lucide-react"
import type { Business } from "@aira/validators/businesses"

interface MyListingsCardProps {
  business: Business
}

export function MyListingsCard({ business }: MyListingsCardProps) {
  const archived = business.deleted_at !== null
  const href = archived
    ? null
    : `/listings/${encodeURIComponent(business.category)}/${encodeURIComponent(business.slug)}`

  const body = (
    <article
      className={
        archived
          ? "flex items-start gap-4 rounded-xl border border-border bg-card p-4 opacity-70"
          : "flex items-start gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
      }
    >
      <span
        aria-hidden
        className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/10 text-primary"
      >
        {business.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={business.logo_url}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          <Store className="size-5" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold text-foreground">
            {business.name}
          </h2>
          {archived && (
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Archived
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {business.category}
        </p>
        {business.address && (
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {business.address}
          </p>
        )}
      </div>
    </article>
  )

  return href ? (
    <Link href={href} className="block">
      {body}
    </Link>
  ) : (
    body
  )
}
