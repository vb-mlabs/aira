// /account/favorites — read-only list of the caller's favorited businesses.
//
// RSC. Server-fetches via apiServerFetch so first paint is immediate. The
// rendered BusinessCard rows carry the same FavoriteButton heart used on
// public listings; clicking it on this page removes the favorite (the row
// stays visible until the next refresh — matching the locked behaviour).

import type { Metadata } from "next"
import { ChevronLeft, Heart } from "lucide-react"
import Link from "next/link"
import { brand } from "@aira/config"
import { apiServerFetch } from "@aira/api/server"
import { requireUser } from "@/lib/auth/server"
import {
  listMyFavoritesOp,
  listMyFavoriteIdsOp,
} from "@/server/operations/favorites"
import { BusinessCard } from "@/features/listings"
import { EmptyState } from "@/lib/ui"

export const metadata: Metadata = {
  title: "My favorites",
}
export const dynamic = "force-dynamic"

export default async function MyFavoritesPage() {
  await requireUser()

  const [itemsRes, idsRes] = await Promise.all([
    apiServerFetch(listMyFavoritesOp, { input: {} }),
    apiServerFetch(listMyFavoriteIdsOp, { input: {} }),
  ])
  const items = itemsRes.data?.items ?? []
  const favIds = new Set(idsRes.data?.ids ?? [])

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
          My favorites
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Businesses you&rsquo;ve saved on {brand.name}.
        </p>
      </header>

      {items.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="No favorites yet"
          description="Save a business with the heart icon and it'll show up here."
          action={{
            label: "Browse the directory",
            href: "/directory",
          }}
        />
      ) : (
        <ul className="space-y-3">
          {items.map((b) => (
            <li key={b.id}>
              <BusinessCard
                business={b}
                isSignedIn
                isFavorited={favIds.has(b.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
