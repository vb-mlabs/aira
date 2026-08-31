// @vitest-environment node
//
// Bug 1 root-cause spec.
//
// The web sidebar shows inactive categories AND inactive subcategories.
// The (app)/layout.tsx feeds it from `listCategoriesTreeOp` →
// `categoriesService.getCategoryTree(db, CITY_ID)`.
//
// Hypothesis: getCategoryTree in packages/services/src/categories/queries.ts
// passes `includeInactive: true` to getCategoriesByCity and does NO
// post-filter on `active`. So every row (root or child, active or not)
// is returned and rendered in the sidebar.
//
// This test seeds a mixed row set through a fake `Database` object,
// calls getCategoryTree, and asserts that inactive rows are NOT present
// in the returned tree — which is what the sidebar (and getCategoryBySlug,
// which DOES filter `active = true`) implicitly requires.
//
// Current behaviour: this test FAILS because getCategoryTree yields
// inactive rows in `root` and `children`.

import { describe, expect, it } from "vitest"
// Relative import so this spec can be re-run standalone from vitest with
// an explicit path (`pnpm --filter @aira/services exec vitest run
// ../../.mstack/debug/2026-08-31-1324-sidebar-categories/specs/repro-bug1-inactive-in-tree.test.ts`).
import { getCategoryTree } from "../../../../packages/services/src/categories/queries"
import type { Database } from "@aira/db/client"

// Rows the fake db returns. Two roots (one active, one inactive) each
// with two children (one active, one inactive) — plus an inactive
// orphan for good measure. Column shape matches Drizzle's inferSelect
// for `categories`.
const NOW = new Date("2026-08-31T00:00:00Z")
const ROWS = [
  { id: "r1", city_id: "city-atlanta", parent_id: null, name: "Restaurants", slug: "restaurants", level: 1, sort_order: 0, active: true,  created_at: NOW, updated_at: NOW },
  { id: "r2", city_id: "city-atlanta", parent_id: null, name: "Dead Root",   slug: "dead-root",   level: 1, sort_order: 1, active: false, created_at: NOW, updated_at: NOW },
  { id: "c1", city_id: "city-atlanta", parent_id: "r1", name: "Pizza",       slug: "pizza",       level: 2, sort_order: 0, active: true,  created_at: NOW, updated_at: NOW },
  { id: "c2", city_id: "city-atlanta", parent_id: "r1", name: "Retired Sub", slug: "retired-sub", level: 2, sort_order: 1, active: false, created_at: NOW, updated_at: NOW },
  { id: "c3", city_id: "city-atlanta", parent_id: "r2", name: "Dead Child",  slug: "dead-child",  level: 2, sort_order: 0, active: false, created_at: NOW, updated_at: NOW },
]

// Minimal Drizzle-shaped stub: db.select().from(...).where(...).orderBy(...)
// resolves to ROWS via a thenable at the terminal step.
function stubDb(): Database {
  const terminal = Promise.resolve(ROWS)
  const chain = {
    from: () => chain,
    where: () => chain,
    orderBy: () => terminal,
  } as unknown as { from: () => typeof chain; where: () => typeof chain; orderBy: () => Promise<typeof ROWS> }
  return { select: () => chain } as unknown as Database
}

describe("getCategoryTree — active filter", () => {
  it("excludes inactive roots and inactive children from the tree the sidebar consumes", async () => {
    const tree = await getCategoryTree(stubDb(), "city-atlanta")

    // No inactive root should appear as a top-level entry — the sidebar
    // would render it and link to /listings/dead-root, which then 404s
    // because getCategoryBySlug filters active=true.
    const rootSlugs = tree.map((t) => t.root.slug)
    expect(rootSlugs).not.toContain("dead-root")

    // No inactive child should appear under any root — same 404 story
    // for the sub-item link.
    const allChildSlugs = tree.flatMap((t) => t.children.map((c) => c.slug))
    expect(allChildSlugs).not.toContain("retired-sub")
    expect(allChildSlugs).not.toContain("dead-child")

    // Sanity: the active row set IS present, so we're not just erasing
    // everything.
    expect(rootSlugs).toContain("restaurants")
    expect(allChildSlugs).toContain("pizza")
  })
})
