// Primary category page — the RSC-friendly view rendered when the URL
// slug resolves to a level-1 (root) category. Layout: category header +
// subcategory grid (via CategoryRow, same as /categories) + Featured
// section (5 random from the strict sponsored pool scoped to this
// category). When both the sub grid and the featured pool are empty,
// falls back to an EmptyState instead of a hollow shell.
//
// Deliberately no search, verified filter, or pagination — those live
// on the subcategory route (level=2), which continues to render
// ListingView. This split is the /listings/[category]/page.tsx level
// branch introduced with the 2026-07-06 QA feedback pass (items #2, #12).

import { Store } from "lucide-react"
import { EmptyState } from "@/lib/ui"
import { getCategoryMeta } from "../category-meta"
import { BusinessCard } from "./business-card"
import { CategoryRow } from "./category-row"
import type { Business } from "../types"
import type { Category } from "@aira/validators/categories"

interface PrimaryCategoryViewProps {
  category: Category
  /** Active level-2 (subcategory) rows whose parent_id equals `category.id`. */
  subs: Category[]
  /** Per-slug visible-business counts (both root + sub). Used for the
   *  subcategory tile subtitle. */
  counts: Record<string, number>
  /** Up to 5 random businesses from the strict sponsored pool scoped to
   *  this category. Empty array when the category has no active
   *  sponsorships. */
  featured: Business[]
  isSignedIn: boolean
  favIds: ReadonlyArray<string>
}

export function PrimaryCategoryView({
  category,
  subs,
  counts,
  featured,
  isSignedIn,
  favIds,
}: PrimaryCategoryViewProps) {
  const meta = getCategoryMeta(category.slug)
  const description = meta.description || `Browse ${category.name} businesses`
  const favIdSet = new Set(favIds)

  if (subs.length === 0 && featured.length === 0) {
    return (
      <>
        <header className="mb-6">
          <h1 className="font-display text-3xl text-foreground sm:text-4xl">
            {category.name}
          </h1>
        </header>
        <EmptyState
          icon={Store}
          title="This category is being set up."
          description="Check back soon — subcategories and featured businesses will appear here."
          action={{ label: "Browse other categories", href: "/categories" }}
        />
      </>
    )
  }

  return (
    <>
      <header className="mb-6">
        <h1 className="font-display text-3xl text-foreground sm:text-4xl">
          {category.name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </header>

      {subs.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 font-display text-xl text-foreground">
            Subcategories
          </h2>
          <ul className="space-y-2">
            {subs.map((sub) => {
              const subMeta = getCategoryMeta(sub.slug)
              return (
                <li key={sub.id}>
                  <CategoryRow
                    category={{
                      ...subMeta,
                      displayName: sub.name,
                      description:
                        subMeta.description || `Browse ${sub.name} businesses`,
                    }}
                    count={counts[sub.slug]}
                  />
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {featured.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-xl text-foreground">
            Featured in {category.name}
          </h2>
          <ul className="space-y-3">
            {featured.map((b) => (
              <li key={b.id}>
                <BusinessCard
                  business={b}
                  isSignedIn={isSignedIn}
                  isFavorited={favIdSet.has(b.id)}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
