// @vitest-environment node
//
// Bug 2 root-cause spec.
//
// Symptom: after an admin renames a category or subcategory (including
// its slug), the (app)/layout.tsx sidebar keeps rendering the OLD slug
// for the rest of an active browser session (Next.js Router Cache) and
// for other users until their next hard reload. Clicking the stale link
// hits `/listings/<old-slug>` → getCategoryBySlugOp returns null (the
// old slug no longer matches any active row) → notFound() → 404.
//
// Hypothesis: the category-admin operations don't invalidate the layout
// cache after mutating a category. The sidebar's server-rendered data
// therefore stays pinned to whatever tree was fetched when the layout
// last rendered.
//
// Verification: read the source of categories-admin.ts and assert it
// calls `revalidatePath("/", "layout")` (or equivalent) after each
// mutation handler. Currently it doesn't — this test fails.

import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const CATEGORIES_ADMIN_PATH = fileURLToPath(
  new URL(
    "../../../../apps/web/src/server/operations/categories-admin.ts",
    import.meta.url,
  ),
)

describe("category-admin mutations — sidebar cache invalidation", () => {
  const source = readFileSync(CATEGORIES_ADMIN_PATH, "utf8")

  it("calls revalidatePath after a mutation so the (app)/layout sidebar re-renders with fresh slugs", () => {
    // Failing here confirms Bug 2's root cause: no cache invalidation
    // hook is wired after the DB write, so the sidebar keeps its old
    // render (with the pre-rename slug) and clicks 404.
    expect(source).toMatch(/revalidatePath\(\s*["']\/["']\s*,\s*["']layout["']/)
  })

  it("imports revalidatePath from next/cache", () => {
    expect(source).toMatch(/from\s+["']next\/cache["']/)
  })
})
