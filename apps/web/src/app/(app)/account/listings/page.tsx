// /account/listings — read-only directory of businesses the caller is
// listed as the owner of. Powers G1's owner-side visibility surface.
//
// RSC. Server-fetches via apiServerFetch so first paint is immediate.
// No client interaction: the page lists card links to the public detail
// page for active rows and an unlinked archived label for soft-deleted
// ones. Empty state offers a mailto support link.

import type { Metadata } from "next"
import { ChevronLeft, Store } from "lucide-react"
import Link from "next/link"
import { brand } from "@aira/config"
import { apiServerFetch } from "@aira/api/server"
import { requireUser } from "@/lib/auth/server"
import { listMyBusinessesOp } from "@/server/operations/businesses"
import { MyListingsCard } from "@/features/account/components/my-listings-card"
import { EmptyState } from "@/lib/ui"

export const metadata: Metadata = {
  title: "My listings",
}
export const dynamic = "force-dynamic"

export default async function MyListingsPage() {
  await requireUser()

  const res = await apiServerFetch(listMyBusinessesOp, { input: {} })
  const items = res.data?.items ?? []

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-8 sm:px-8 sm:py-10">
      <Link
        href="/account"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden />
        Account
      </Link>

      <header className="mt-4 mb-6">
        <h1 className="font-display text-2xl text-foreground sm:text-3xl">
          My listings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Businesses you&rsquo;re listed as the owner of on {brand.name}.
          The {brand.name} team manages the details; reach out to support
          if anything is out of date.
        </p>
      </header>

      {items.length === 0 ? (
        <EmptyState
          icon={Store}
          title="No listings yet"
          description={`You aren't listed as the owner of any businesses on ${brand.name} yet.`}
          action={{
            label: "Contact support",
            href: `mailto:${brand.supportEmail}`,
          }}
        />
      ) : (
        <ul className="space-y-3">
          {items.map((b) => (
            <li key={b.id}>
              <MyListingsCard business={b} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
