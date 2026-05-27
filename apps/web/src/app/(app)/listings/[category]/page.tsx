// /listings/[category] — full category listing. Unknown slugs return 404;
// empty categories render the shared EmptyState rather than a hollow list.

import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Store } from "lucide-react"
import { EmptyState } from "@/lib/ui"
import {
  BusinessCard,
  CATEGORY_META,
  VALID_CATEGORIES,
  type BusinessCategory,
} from "@/features/listings"
import { getBusinessesByCategory } from "@/features/listings/server/queries"

interface PageProps {
  params: Promise<{ category: string }>
}

function isValidCategory(value: string): value is BusinessCategory {
  return (VALID_CATEGORIES as readonly string[]).includes(value)
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { category } = await params
  if (!isValidCategory(category)) return { title: "Not found" }
  return { title: CATEGORY_META[category].displayName }
}

export default async function CategoryListingPage({ params }: PageProps) {
  const { category } = await params
  if (!isValidCategory(category)) notFound()

  const meta = CATEGORY_META[category]
  const businesses = await getBusinessesByCategory(category)

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 sm:py-10">
      <header className="mb-6">
        <h1 className="font-display text-3xl text-foreground sm:text-4xl">
          {meta.displayName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {businesses.length} {businesses.length === 1 ? "listing" : "listings"}
          {businesses.length > 0 && " · sorted by tier"}
        </p>
      </header>

      {businesses.length === 0 ? (
        <EmptyState
          icon={Store}
          title="No listings in this category yet"
          description="Check back soon — new businesses are added regularly."
          action={{ label: "Browse all categories", href: "/categories" }}
        />
      ) : (
        <ul className="space-y-3">
          {businesses.map((b) => (
            <li key={b.id}>
              <BusinessCard business={b} showTier />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
