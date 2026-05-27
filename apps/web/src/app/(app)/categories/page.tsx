// Full-screen browse view. Mirrors the sidebar's category list as
// stand-alone rows so mobile users (whose sidebar is collapsed behind a
// hamburger) get a first-class entry point from the bottom tab bar.
// Desktop renders the same page — duplicate of sidebar nav, but harmless.

import type { Metadata } from "next"
import {
  CATEGORIES_ORDERED,
  CategoryRow,
} from "@/features/listings"
import { getBusinessCountsByCategory } from "@/features/listings/server/queries"

export const metadata: Metadata = {
  title: "Categories",
}

export default async function CategoriesPage() {
  const counts = await getBusinessCountsByCategory()

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
        {CATEGORIES_ORDERED.map((cat) => (
          <li key={cat.slug}>
            <CategoryRow category={cat} count={counts[cat.slug]} />
          </li>
        ))}
      </ul>
    </div>
  )
}
