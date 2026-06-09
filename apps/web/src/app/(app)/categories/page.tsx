// Full-screen browse view. Mirrors the sidebar's category list as
// stand-alone rows so mobile users (whose sidebar is collapsed behind a
// hamburger) get a first-class entry point from the bottom tab bar.
// Desktop renders the same page — duplicate of sidebar nav, but harmless.

import type { Metadata } from "next"
import { Store } from "lucide-react"
import { CategoryRow } from "@/features/listings"
import { CATEGORY_META } from "@/features/listings/category-meta"
import { apiServerFetch } from "@aira/api/server"
import { listCategoriesWithCountsOp, listCategoriesOp } from "@/server/operations/categories"

export const metadata: Metadata = {
  title: "Categories",
}

export default async function CategoriesPage() {
  const [categoriesRes, countsRes] = await Promise.all([
    apiServerFetch(listCategoriesOp, { input: {} }),
    apiServerFetch(listCategoriesWithCountsOp, { input: { withCounts: true } }),
  ])

  const dbCategories = categoriesRes.data?.categories ?? []
  const counts = countsRes.data?.counts ?? {}

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 sm:py-10">
      <header className="mb-6">
        <h1 className="font-display text-3xl text-foreground sm:text-4xl">
          Categories
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Browse trusted Indian businesses by category
        </p>
      </header>

      <ul className="space-y-2">
        {dbCategories.map((cat) => {
          const meta = CATEGORY_META[cat.slug as keyof typeof CATEGORY_META]
          const categoryMeta = {
            slug: cat.slug,
            displayName: cat.name,
            description: meta?.description ?? `Browse ${cat.name} businesses`,
            icon: meta?.icon ?? Store,
          }
          return (
            <li key={cat.id}>
              <CategoryRow category={categoryMeta} count={counts[cat.slug]} />
            </li>
          )
        })}
      </ul>
    </div>
  )
}
