// @vitest-environment node
//
// Covers the slug-rename guard in updateCategoryOp. The guard prevents
// admin from renaming a category's slug while businesses still reference
// the old slug — without it, those rows would silently orphan from
// /listings (businesses.category is a TEXT column with no FK).

import { describe, expect, it, beforeEach, vi } from "vitest"
import { ApiError } from "@aira/api"

// Hoisted mock state so vi.mock factory closures can both populate
// and read it. vi.hoisted runs before the import resolution.
const state = vi.hoisted(() => ({
  categories: [] as Array<{ id: string; slug: string }>,
  businessesByCategory: new Map<string, Array<{ id: string }>>(),
}))

vi.mock("@aira/services", () => ({
  categories: {
    getCategoriesByCity: vi.fn(async () => state.categories),
  },
  businesses: {
    getBusinessesByCategory: vi.fn(
      async (_db: unknown, slug: string) =>
        state.businessesByCategory.get(slug) ?? [],
    ),
  },
}))

import { assertSlugRenameAllowed } from "@/server/operations/categories-admin"

const STUB_DB = {} as Parameters<typeof assertSlugRenameAllowed>[0]

beforeEach(() => {
  state.categories = [
    { id: "cat-atl-restaurants", slug: "restaurants" },
    { id: "cat-atl-shopping", slug: "shopping" },
  ]
  state.businessesByCategory.clear()
})

describe("assertSlugRenameAllowed", () => {
  it("throws when renaming a slug that businesses still reference", async () => {
    state.businessesByCategory.set("restaurants", [
      { id: "biz-1" },
      { id: "biz-2" },
      { id: "biz-3" },
    ])

    await expect(
      assertSlugRenameAllowed(STUB_DB, {
        id: "cat-atl-restaurants",
        nextSlug: "indian-restaurants",
      }),
    ).rejects.toMatchObject({
      code: "categories.rename_would_orphan",
    })

    // Message names the affected count + the old slug so the operator
    // knows what to fix before retrying.
    await expect(
      assertSlugRenameAllowed(STUB_DB, {
        id: "cat-atl-restaurants",
        nextSlug: "indian-restaurants",
      }),
    ).rejects.toMatchObject({
      message: expect.stringContaining("3 businesses"),
    })
  })

  it("uses singular form when exactly one business references the slug", async () => {
    state.businessesByCategory.set("restaurants", [{ id: "biz-1" }])

    await expect(
      assertSlugRenameAllowed(STUB_DB, {
        id: "cat-atl-restaurants",
        nextSlug: "indian-restaurants",
      }),
    ).rejects.toMatchObject({
      message: expect.stringContaining("1 business reference"),
    })
  })

  it("does not throw when no businesses reference the old slug", async () => {
    // shopping has no businesses in the map — orphan-safe.
    await expect(
      assertSlugRenameAllowed(STUB_DB, {
        id: "cat-atl-shopping",
        nextSlug: "marketplace",
      }),
    ).resolves.toBeUndefined()
  })

  it("does not throw when nextSlug is undefined (name-only update)", async () => {
    state.businessesByCategory.set("restaurants", [{ id: "biz-1" }])

    await expect(
      assertSlugRenameAllowed(STUB_DB, {
        id: "cat-atl-restaurants",
        nextSlug: undefined,
      }),
    ).resolves.toBeUndefined()
  })

  it("does not throw on a no-op rename (nextSlug equals current slug)", async () => {
    state.businessesByCategory.set("restaurants", [{ id: "biz-1" }])

    await expect(
      assertSlugRenameAllowed(STUB_DB, {
        id: "cat-atl-restaurants",
        nextSlug: "restaurants",
      }),
    ).resolves.toBeUndefined()
  })

  it("does not throw when the category id isn't found", async () => {
    // Unknown id can't be renamed-into-orphan; updateCategoryOp will
    // return the not_found error via its own check later.
    await expect(
      assertSlugRenameAllowed(STUB_DB, {
        id: "cat-does-not-exist",
        nextSlug: "anything",
      }),
    ).resolves.toBeUndefined()
  })

  it("throws an ApiError instance (callers can switch on code)", async () => {
    state.businessesByCategory.set("restaurants", [{ id: "biz-1" }])
    await expect(
      assertSlugRenameAllowed(STUB_DB, {
        id: "cat-atl-restaurants",
        nextSlug: "indian-restaurants",
      }),
    ).rejects.toBeInstanceOf(ApiError)
  })
})
